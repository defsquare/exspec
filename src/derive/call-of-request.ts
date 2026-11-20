import type { InputPlace } from "../shapes/bindings.ts";
import { type Json, jsonSchema, type Sent, type StepCall } from "../shapes/roles.ts";
import type { Interface } from "../shapes/target.ts";
import type { AnswerPlace } from "./answer-place.ts";
import { hasHole, wholeHole } from "./holes.ts";
import { differingPlaces, valueAt } from "./json.ts";
import { sentOfCall } from "./sent-of-call.ts";

// an operation, the interface that exposes it, where each of its inputs is sent
export type Exposure = {
  readonly operation: string;
  readonly bound: Interface;
  readonly places: Readonly<Record<string, InputPlace>>;
};

export type Refusal = {
  readonly reason:
    | "no-interface"
    | "several-interfaces"
    | "unplaced-value"
    | "rebuilt-adds"
    | "path-differs"
    | "malformed-path"
    | "hole-in-text"
    | "hole-unknown-step"
    | "hole-unconverted-step"
    | "hole-outside-structure";
  readonly what: string;
};

// "/s/{x}/t", "/s/a/t" -> {x: "a"}; another path -> undefined
function parametersOf(
  pattern: string,
  path: string,
): Readonly<Record<string, string>> | undefined {
  const expected = pattern.split("/");
  const written = path.split("/");
  if (expected.length !== written.length) return undefined;
  const pairs = expected.map((part, i) => ({ part, segment: written[i] ?? "" }));
  const parameter = (part: string) => /^\{([^{}]+)\}$/.exec(part)?.[1];
  if (
    pairs.some(({ part, segment }) => parameter(part) === undefined && part !== segment)
  ) {
    return undefined;
  }
  return Object.fromEntries(
    pairs.flatMap(({ part, segment }) => {
      const name = parameter(part);
      return name === undefined ? [] : [[name, segment]];
    }),
  );
}

// "a%20b" -> "a b"; "a%zz" -> undefined
function decoded(segment: string): string | undefined {
  try {
    return decodeURIComponent(segment);
  } catch (error) {
    if (error instanceof URIError) return undefined;
    throw error;
  }
}

// "{{s.body.data.id}}", s answered at [data] -> {hole: "{{s.id}}"}
function holeInCall(
  hole: string,
  answered: ReadonlyMap<string, AnswerPlace>,
): { readonly hole: string } | { readonly refused: Refusal } {
  const [name = "", ...keys] = hole.slice(2, -2).split(".");
  const place = answered.get(name);
  if (place === undefined) {
    return {
      refused: { reason: "hole-unknown-step", what: `${hole} names no step before it` },
    };
  }
  if ("none" in place) {
    return {
      refused: {
        reason: "hole-unconverted-step",
        what: `${hole} names "${name}": ${place.none}`,
      },
    };
  }
  const prefix = ["body", ...place.at];
  if (!prefix.every((key, i) => keys[i] === key)) {
    return {
      refused: {
        reason: "hole-outside-structure",
        what: `${hole} reads outside the structure "${name}" answers, at ${prefix.join(".")}`,
      },
    };
  }
  return { hole: `{{${[name, ...keys.slice(prefix.length)].join(".")}}}` };
}

// every string of a value with its holes read in the answered structures, or why not
function inCall(
  value: Json,
  answered: ReadonlyMap<string, AnswerPlace>,
): { readonly value: Json } | { readonly refused: readonly Refusal[] } {
  if (typeof value === "string") {
    if (wholeHole.test(value)) {
      const read = holeInCall(value, answered);
      return "hole" in read ? { value: read.hole } : { refused: [read.refused] };
    }
    return hasHole.test(value)
      ? {
          refused: [{ reason: "hole-in-text", what: `"${value}" holds a hole and more` }],
        }
      : { value };
  }
  if (value === null || typeof value !== "object") return { value };
  const entries = Object.entries(value).map(([key, v]) => ({
    key,
    read: inCall(v, answered),
  }));
  const refused = entries.flatMap(({ read }) => ("refused" in read ? read.refused : []));
  if (refused.length > 0) return { refused };
  const kept = entries.flatMap(({ key, read }) =>
    "value" in read ? [{ key, value: read.value }] : [],
  );
  return {
    value: Array.isArray(value)
      ? kept.map(({ value: v }) => v)
      : Object.fromEntries(kept.map(({ key, value: v }) => [key, v])),
  };
}

const shown = (value: unknown) =>
  value === undefined ? "nothing" : JSON.stringify(value);

// The call a request is, its holes read in the structure the step they name answers:
//   {post, "/s/{{s.body.data.id}}/t", body: {a: {b: 1}}}, the exposure of f on "post /s/{x}/t"
//   with {x: [path, x], b: [body, a, b]}, s answered at [data]
//   -> {call: {operation: f, with: {x: "{{s.id}}", b: 1}}}
// A request is a call only when the call is sent as that very request: a value where no
// input has its place, a part the call sends and the request does not carry, are refusals.
export function callOfRequest({
  request,
  exposures,
  answered,
}: {
  readonly request: Sent;
  readonly exposures: readonly Exposure[];
  // each step named before this one: where its answered structure is, or why there is none
  readonly answered: ReadonlyMap<string, AnswerPlace>;
}): { readonly call: StepCall } | { readonly refused: readonly Refusal[] } {
  const matching = exposures.flatMap((exposure) => {
    const parameters =
      exposure.bound.method === request.method
        ? parametersOf(exposure.bound.pattern, request.path)
        : undefined;
    return parameters === undefined ? [] : [{ exposure, parameters }];
  });
  const [one, ...more] = matching;
  const asked = `${request.method} ${request.path}`;
  if (one === undefined) {
    return {
      refused: [{ reason: "no-interface", what: `no interface read answers ${asked}` }],
    };
  }
  if (more.length > 0) {
    const names = matching.map(({ exposure }) => exposure.bound.interface).join(", ");
    return {
      refused: [{ reason: "several-interfaces", what: `${asked} matches ${names}` }],
    };
  }
  const { exposure, parameters } = one;
  const inputAt = (kind: InputPlace[0], name: string) =>
    Object.entries(exposure.places).find(([, [k, n]]) => k === kind && n === name)?.[0];
  const fromPath = Object.entries(parameters).map(([name, segment]) => ({
    name,
    input: inputAt("path", name),
    value: hasHole.test(segment) ? segment : decoded(segment),
  }));
  const unplacedPath = fromPath.flatMap(({ name, input, value }): readonly Refusal[] => [
    ...(input === undefined
      ? [
          {
            reason: "unplaced-value" as const,
            what: `path parameter "${name}": no input has its place`,
          },
        ]
      : []),
    ...(value === undefined
      ? [
          {
            reason: "malformed-path" as const,
            what: `path parameter "${name}": ${request.path} is not a path one can decode`,
          },
        ]
      : []),
  ]);
  const fromParts = Object.entries(exposure.places).flatMap(([input, place]) => {
    const value =
      place[0] === "body"
        ? valueAt(request.body, place.slice(1))
        : place[0] === "query" || place[0] === "form"
          ? valueAt(request[place[0]], [place[1]])
          : undefined;
    return value === undefined ? [] : [{ input, value: jsonSchema.parse(value) }];
  });
  const written: Readonly<Record<string, Json>> = Object.fromEntries([
    ...fromPath.flatMap(({ input, value }) =>
      input === undefined || value === undefined ? [] : [[input, value]],
    ),
    ...fromParts.map(({ input, value }) => [input, value]),
  ]);
  const read = Object.entries(written).map(([input, value]) => ({
    input,
    read: inCall(value, answered),
  }));
  const refused = [
    ...unplacedPath,
    ...read.flatMap(({ read: one }) => ("refused" in one ? one.refused : [])),
  ];
  if (refused.length > 0) return { refused };
  const rebuilt = sentOfCall({
    call: { operation: exposure.operation, with: written },
    places: exposure.places,
    bound: exposure.bound,
  });
  if ("refused" in rebuilt) {
    return { refused: [{ reason: "unplaced-value", what: rebuilt.refused }] };
  }
  const pathDiffers: readonly Refusal[] =
    rebuilt.sent.path === request.path
      ? []
      : [
          {
            reason: "path-differs",
            what: `the path ${request.path} is written, the call sends ${rebuilt.sent.path}`,
          },
        ];
  const parts: readonly ("query" | "body" | "form")[] = ["query", "body", "form"];
  const differences = [
    ...pathDiffers,
    ...parts.flatMap((part) =>
      differingPlaces(request[part], rebuilt.sent[part], [part]).map(
        ({ at, a, b }): Refusal => ({
          reason: a === undefined ? "rebuilt-adds" : "unplaced-value",
          what: `${at.join(".")}: ${shown(a)} is written, the call sends ${shown(b)}`,
        }),
      ),
    ),
  ];
  if (differences.length > 0) return { refused: differences };
  return {
    call: {
      operation: exposure.operation,
      with: Object.fromEntries(
        read.flatMap(({ input, read: one }) =>
          "value" in one ? [[input, one.value]] : [],
        ),
      ),
    },
  };
}

// The holes of a call put back on the wire, through the structure each named step answers:
//   {with: {x: "{{s.id}}"}}, s answered at [data] -> {with: {x: "{{s.body.data.id}}"}}
export function holesOnTheWire(
  call: StepCall,
  answered: ReadonlyMap<string, AnswerPlace>,
): StepCall {
  const onTheWire = (value: Json): Json => {
    if (typeof value === "string") {
      if (!wholeHole.test(value)) return value;
      const [name = "", ...keys] = value.slice(2, -2).split(".");
      const place = answered.get(name);
      return place === undefined || "none" in place
        ? value
        : `{{${[name, "body", ...place.at, ...keys].join(".")}}}`;
    }
    if (Array.isArray(value)) return value.map(onTheWire);
    if (value === null || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, onTheWire(v)]));
  };
  return {
    ...call,
    with: Object.fromEntries(
      Object.entries(call.with).map(([k, v]) => [k, onTheWire(v)]),
    ),
  };
}
