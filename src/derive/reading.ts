import type { Projection } from "../shapes/bindings.ts";
import type { Extraction } from "../shapes/extraction.ts";
import type { Call, HttpRequest, Look, Scenario } from "../shapes/scenario.ts";
import type { Fact, Operation, Structure } from "../shapes/specification.ts";
import type { Credentials } from "../shapes/target.ts";
import { deepEqual } from "./json.ts";
import { fillRequest, headersOf } from "./request.ts";

export type Take = { readonly of: Look; readonly as: string | null };

// a term that reads one instance: {structure: S, where: {a: [call, a]}, field: [b]}
export type Located = {
  readonly structure: string;
  readonly where: Extract<Look, { shows: unknown }>["shows"]["where"];
  readonly field?: readonly string[] | undefined;
};

// the first projection showing S outside a list, located by exactly these fields:
//   S, [a]  ->  {projection: {…, locates: {a: [path, a]}}, at: [s]}
export function locating(
  projections: readonly Projection[],
  structure: string,
  keys: readonly string[],
): { readonly projection: Projection; readonly at: readonly string[] } | undefined {
  for (const projection of projections) {
    const show = projection.shows.find(
      (s) => s.structure === structure && !s.at.includes("each"),
    );
    const locates = Object.keys(projection.locates ?? {});
    if (
      show !== undefined &&
      locates.length === keys.length &&
      keys.every((key) => locates.includes(key))
    ) {
      return { projection, at: show.at };
    }
  }
  return undefined;
}

// the terms of a fact that read an instance; a shown field is one
export function termsOf(of: Look, facts: readonly Fact[]): readonly Located[] {
  if ("shows" in of) return [of.shows];
  return (facts.find(({ fact }) => fact === of.fact)?.condition ?? []).flatMap((term) =>
    "structure" in term ? [term] : [],
  );
}

// requires p, when q, when [not, p], then {fact: {r: false}}  ->  [p, q, r]
export function factsCited(operation: Operation): readonly string[] {
  return [
    ...new Set([
      ...operation.requires.map(({ fact }) => fact),
      ...operation.effects.flatMap(({ when, then }) => [
        ...(when === undefined
          ? []
          : typeof when === "string"
            ? [when]
            : when[0] === "not"
              ? [when[1]]
              : []),
        ...(typeof then === "object" && "fact" in then
          ? Object.keys(then.fact ?? {})
          : []),
      ]),
    ]),
  ];
}

// [S, f], S's identity a taken as the input b  ->  {shows: {structure: S, where: {a: [call, b]}, field: [f]}}
export function fieldLook(
  operation: Operation,
  structures: readonly Structure[],
  [structure, field]: readonly [string, string],
): Look | undefined {
  const identity = structures.find((s) => s.structure === structure)?.identity;
  const input = Object.entries(operation.takes).find(
    ([, taken]) =>
      "field" in taken && taken.field[0] === structure && taken.field[1] === identity,
  )?.[0];
  if (identity === undefined || input === undefined) return undefined;
  return { shows: { structure, where: { [identity]: ["call", input] }, field: [field] } };
}

// What is read before and after the judged call, in this order: the facts its operation
// cites, the fields its effects change, then what the scenario asks for. Each once.
export function readingsToTake({
  scenario: { act, assert },
  extraction: { operations, structures },
}: {
  readonly scenario: Pick<Scenario, "act" | "assert">;
  readonly extraction: Extraction;
}): readonly Take[] {
  const caller = act.call.caller ?? null;
  const operation = operations.find(
    (o) => o.operation.operation === act.call.operation,
  )?.operation;
  const cited: readonly Take[] = operation
    ? [
        ...factsCited(operation).map((fact) => ({ of: { fact }, as: caller })),
        ...operation.effects.flatMap(({ then }) =>
          typeof then === "object" && "field" in then
            ? (then.field ?? []).flatMap(({ of }) => {
                const look = fieldLook(operation, structures, of);
                return look ? [{ of: look, as: caller }] : [];
              })
            : [],
        ),
      ]
    : [];
  const asked = assert.map(({ as, ...of }) => ({
    of,
    as: as === undefined ? caller : as,
  }));
  return [...cited, ...asked].filter(
    (take, i, all) => all.findIndex((other) => deepEqual(other, take)) === i,
  );
}

// One request per term that reads, made as the reading's actor; or why none can be made.
export function requestsOfReading({
  of,
  as,
  call,
  extraction: { target, facts, projections, interfaces },
  credentials,
}: Take & {
  readonly call: Call;
  readonly extraction: Extraction;
  readonly credentials: Credentials;
}): readonly (HttpRequest | { readonly unreadable: string })[] {
  return termsOf(of, facts).map(({ structure, where }) => {
    const keys = Object.keys(where);
    const found = locating(projections, structure, keys);
    if (found === undefined) {
      return { unreadable: `no projection locates ${structure} by ${keys.join(", ")}` };
    }
    const values: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(where)) {
      if (!Array.isArray(value)) {
        values[key] = value;
        continue;
      }
      const input = value[1];
      if (!Object.hasOwn(call.with, input)) {
        return { unreadable: `the input "${input}" is not in the call` };
      }
      values[key] = call.with[input];
    }
    const { projection } = found;
    const bound = interfaces.find((i) => i.interface === projection.interface);
    if (target === undefined) return { unreadable: "the extraction names no target" };
    if (bound === undefined) {
      return { unreadable: `no interface "${projection.interface}"` };
    }
    const headers = headersOf(credentials, as);
    if (headers === undefined) return { unreadable: `no credentials for "${as}"` };
    const filled = fillRequest({
      base: target.api["base-url"],
      bound,
      sends: projection.locates ?? {},
      values,
      headers,
      by: projection.projection,
    });
    return "refused" in filled ? { unreadable: filled.refused } : filled;
  });
}
