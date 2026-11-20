import { type Json, jsonSchema, type Sent, type StepRequest } from "../shapes/roles.ts";
import { isMap, valueAt } from "./json.ts";

export const anyHole = /\{\{([^{}]*)\}\}/g;
export const hasHole = /\{\{[^{}]*\}\}/;
export const wholeHole = /^\{\{([^{}]*)\}\}$/;

// "m.body.a.0" -> {name: "m", at: [body, a, 0]}
function citedBy(hole: string) {
  const [name = "", ...keys] = hole.split(".");
  return { name, at: keys.map((key) => (/^\d+$/.test(key) ? Number(key) : key)) };
}

// every string under value, with where it is: {a: ["x"]}, "q" -> [{at: "q.a.0", text: "x"}]
function stringsOf(
  value: unknown,
  at: string,
): readonly { readonly at: string; readonly text: string }[] {
  if (typeof value === "string") return [{ at, text: value }];
  const entries: readonly (readonly [string, unknown])[] = Array.isArray(value)
    ? value.map((v, i) => [String(i), v])
    : isMap(value)
      ? Object.entries(value)
      : [];
  return entries.flatMap(([key, v]) => stringsOf(v, `${at}.${key}`));
}

// {path: "/a/{{m.body.id}}", body: {x: "{{n.body.y}}", z: "b{{m.status}}"}}
//   -> {cited: [m, n], holes: [m.body.id, n.body.y, m.status], misplaced: ["body.z"]}
// Outside the path a hole is a whole string; inside it, any part of a segment.
export function holesOf({ path, query, body, form }: StepRequest): Holes {
  return holesAmong([
    { at: "path", text: path },
    ...stringsOf(query, "query"),
    ...stringsOf(body, "body"),
    ...stringsOf(form, "form"),
  ]);
}

// {a: "{{m.body.id}}", b: "x{{m.status}}"} -> {cited: [m], holes: […], misplaced: ["with.b"]}
export const holesOfGiven = (given: Readonly<Record<string, Json>> | undefined): Holes =>
  holesAmong(stringsOf(given, "with"));

type Holes = {
  readonly cited: readonly string[];
  // each hole as written, its braces off
  readonly holes: readonly string[];
  readonly misplaced: readonly string[];
};

function holesAmong(
  strings: readonly { readonly at: string; readonly text: string }[],
): Holes {
  const holes = strings.flatMap(({ text }) =>
    [...text.matchAll(anyHole)].map(([, hole = ""]) => hole),
  );
  const cited = holes.map((hole) => citedBy(hole).name);
  const misplaced = strings
    .filter(
      ({ at, text }) => at !== "path" && hasHole.test(text) && !wholeHole.test(text),
    )
    .map(({ at }) => at);
  return { cited: [...new Set(cited)], holes, misplaced };
}

class Unresolved extends Error {
  readonly type = "unresolved";
}

const text = (value: Json) => (typeof value === "string" ? value : JSON.stringify(value));

// what a hole naming each step reads: of a request, its answer {status, body}; of a call,
// the structure its operation answers
export type Reads = ReadonlyMap<string, Json>;

function resolve(hole: string, reads: Reads): Json {
  const { name, at } = citedBy(hole);
  const read = reads.get(name);
  const value = read === undefined ? undefined : valueAt(read, at);
  if (value === undefined || value === null) {
    throw new Unresolved(`{{${hole}}} resolves to nothing`);
  }
  return jsonSchema.parse(value);
}

function fill(value: Json, answers: Reads): Json {
  if (typeof value === "string") {
    const whole = wholeHole.exec(value)?.[1];
    return whole === undefined ? value : resolve(whole, answers);
  }
  if (Array.isArray(value)) return value.map((v) => fill(v, answers));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [key, fill(v, answers)]),
    );
  }
  return value;
}

// The holes of a request filled from what the steps named before it read:
//   {path: "/a/{{m.body.id}}", body: {n: "{{m.body.id}}"}}, m reads {body: {id: 7}}
//   -> {sent: {path: "/a/7", body: {n: 7}}}
// a hole that resolves to nothing -> {unplayable: "{{m.body.x}} resolves to nothing"}
export function fillHoles(
  { method, path, query, body, form }: StepRequest,
  answers: Reads,
): { readonly sent: Sent } | { readonly unplayable: string } {
  try {
    const filled = path.replace(anyHole, (_, hole: string) =>
      encodeURIComponent(text(resolve(hole, answers))),
    );
    return {
      sent: {
        method,
        path: filled,
        ...(query === undefined
          ? {}
          : {
              query: Object.fromEntries(
                Object.entries(query).map(([key, v]) => [key, fill(v, answers)]),
              ),
            }),
        ...(body === undefined ? {} : { body: fill(body, answers) }),
        ...(form === undefined
          ? {}
          : {
              form: Object.fromEntries(
                Object.entries(form).map(([key, v]) => [key, fill(v, answers)]),
              ),
            }),
      },
    };
  } catch (error) {
    if (error instanceof Unresolved) return { unplayable: error.message };
    throw error;
  }
}

// The same for what a service step gives its condition:
//   {a: "{{m.body.to}}"}, m reads {body: {to: "u@x"}} -> {given: {a: "u@x"}}
export function fillGiven(
  given: Readonly<Record<string, Json>>,
  answers: Reads,
): { readonly given: Readonly<Record<string, Json>> } | { readonly unplayable: string } {
  try {
    return {
      given: Object.fromEntries(
        Object.entries(given).map(([key, v]) => [key, fill(v, answers)]),
      ),
    };
  } catch (error) {
    if (error instanceof Unresolved) return { unplayable: error.message };
    throw error;
  }
}
