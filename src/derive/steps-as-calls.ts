import type { Json, Step, StepCall, StepRequest } from "../shapes/roles.ts";
import type { AnswerPlace } from "./answer-place.ts";
import { callOfRequest, type Refusal } from "./call-of-request.ts";
import type { Callable } from "./callables.ts";
import { anyHole } from "./holes.ts";

// "s.id", s answered at [data] -> "s.body.data.id"; a step not named there -> as it is
const holeOnTheWire = (hole: string, onWire: ReadonlyMap<string, AnswerPlace>) => {
  const [name = "", ...keys] = hole.split(".");
  const place = onWire.get(name);
  return place === undefined || "none" in place
    ? hole
    : [name, "body", ...place.at, ...keys].join(".");
};

// every hole of every string of a value rewritten: {a: "x/{{s.id}}"} -> {a: "x/{{s.body.data.id}}"}
function rewriteHoles(value: Json, rewrite: (hole: string) => string): Json {
  if (typeof value === "string") {
    return value.replace(anyHole, (_, hole: string) => `{{${rewrite(hole)}}}`);
  }
  if (Array.isArray(value)) return value.map((v) => rewriteHoles(v, rewrite));
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, v]) => [key, rewriteHoles(v, rewrite)]),
  );
}

const answerOfOperation = (
  operation: string,
  callables: readonly Callable[],
): AnswerPlace =>
  callables.find((one) => one.operation === operation)?.answer ?? {
    none: `no reading declares the operation "${operation}"`,
  };

// "x/{{s.body.data.id}}", s.body.data.id -> s.id: "x/{{s.id}}"
const rewriteText = (text: string, rewrite: (hole: string) => string) =>
  text.replace(anyHole, (_, hole: string) => `{{${rewrite(hole)}}}`);

// every hole of a request rewritten, in its path, its query, its body, its form
function rewriteRequest(
  request: StepRequest,
  rewrite: (hole: string) => string,
): StepRequest {
  const { path, query, body, form, ...rest } = request;
  const scalars = (part: NonNullable<StepRequest["query"]>) =>
    Object.fromEntries(
      Object.entries(part).map(([k, v]) => [
        k,
        typeof v === "string" ? rewriteText(v, rewrite) : v,
      ]),
    );
  return {
    ...rest,
    path: rewriteText(path, rewrite),
    ...(query === undefined ? {} : { query: scalars(query) }),
    ...(body === undefined ? {} : { body: rewriteHoles(body, rewrite) }),
    ...(form === undefined ? {} : { form: scalars(form) }),
  };
}

const rewriteGiven = (
  given: Readonly<Record<string, Json>>,
  rewrite: (hole: string) => string,
) =>
  Object.fromEntries(
    Object.entries(given).map(([k, v]) => [k, rewriteHoles(v, rewrite)]),
  );

// What each step of a scenario is as a call: a request step the call that says it exactly,
// or why none does; a call or a service step, nothing. A request's hole that names an
// earlier request said by a call is read in that call's structure, as if both were calls:
//   [{name: s, request: post /s}, {request: get "/s/{{s.body.data.id}}"}, {service: m}]
//   -> [{call: {operation: f, with: {}}}, {call: {operation: g, with: {x: "{{s.id}}"}}}, undefined]
export function stepsAsCalls(
  steps: readonly Step[],
  callables: readonly Callable[],
): readonly (
  | { readonly call: StepCall }
  | { readonly refused: readonly Refusal[] }
  | undefined
)[] {
  const answered = new Map<string, AnswerPlace>();
  const onWire = new Map<string, AnswerPlace>();
  const answerOf = (operation: string) => answerOfOperation(operation, callables);
  return steps.map((step) => {
    if ("service" in step) return undefined;
    if ("call" in step) {
      if (step.name !== undefined) {
        const answer = answerOf(step.call.operation);
        answered.set(step.name, answer);
        onWire.set(step.name, answer);
      }
      return undefined;
    }
    const converted = callOfRequest({
      request: rewriteRequest(step.request, (hole) => holeOnTheWire(hole, onWire)),
      exposures: callables,
      answered,
    });
    if (step.name !== undefined) {
      answered.set(
        step.name,
        "call" in converted
          ? answerOf(converted.call.operation)
          : { none: "a request no call says" },
      );
    }
    return "call" in converted
      ? { call: { operation: converted.call.operation, with: converted.call.with } }
      : converted;
  });
}

// A scenario's steps with each request a call says written as that call, and every hole of
// the others naming it read in the structure it answers:
//   [{name: s, request: post /s}, {request: get "/z/{{s.body.data.id}}"}], no call says get /z
//   -> {steps: [{name: s, call: {operation: f, with: {}}}, {request: get "/z/{{s.id}}"}],
//       converted: 1, conflicts: []}
// A hole that reads outside that structure ({{s.status}}) is a conflict: the steps would
// no longer say what they said.
export function stepsConverted(
  steps: readonly Step[],
  callables: readonly Callable[],
): {
  readonly steps: readonly Step[];
  readonly converted: number;
  readonly conflicts: readonly string[];
} {
  const asCalls = stepsAsCalls(steps, callables);
  const placed = new Map<string, AnswerPlace>();
  const conflicts: string[] = [];
  const converted = steps.map((step, i): Step => {
    const asCall = asCalls[i];
    if (asCall !== undefined && "call" in asCall && "request" in step) {
      const { request: _, ...addressed } = step;
      if (step.name !== undefined) {
        placed.set(step.name, answerOfOperation(asCall.call.operation, callables));
      }
      return { ...addressed, call: asCall.call };
    }
    const rewrite = (hole: string) => {
      const [name = "", ...keys] = hole.split(".");
      const place = placed.get(name);
      if (place === undefined) return hole;
      const prefix = "none" in place ? undefined : ["body", ...place.at];
      if (prefix === undefined || !prefix.every((key, j) => keys[j] === key)) {
        conflicts.push(
          `step ${i + 1}: {{${hole}}} reads outside what "${name}" answers as a call`,
        );
        return hole;
      }
      return [name, ...keys.slice(prefix.length)].join(".");
    };
    if ("service" in step) {
      return step.with === undefined
        ? step
        : { ...step, with: rewriteGiven(step.with, rewrite) };
    }
    if ("call" in step) {
      return {
        ...step,
        call: { ...step.call, with: rewriteGiven(step.call.with, rewrite) },
      };
    }
    return { ...step, request: rewriteRequest(step.request, rewrite) };
  });
  return {
    steps: converted,
    converted: asCalls.filter((one) => one !== undefined && "call" in one).length,
    conflicts,
  };
}
