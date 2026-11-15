import { type Json, jsonSchema, type Sent, type StepRequest } from "../shapes/roles.ts";
import type { TargetResponse } from "../shapes/scenario.ts";
import { isMap, valueAt } from "./json.ts";

const anyHole = /\{\{([^{}]*)\}\}/g;
const hasHole = /\{\{[^{}]*\}\}/;
const wholeHole = /^\{\{([^{}]*)\}\}$/;

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
//   -> {cited: [m, n], misplaced: ["body.z"]}
// Outside the path a hole is a whole string; inside it, any part of a segment.
export function holesOf({ path, query, body }: StepRequest): {
  readonly cited: readonly string[];
  readonly misplaced: readonly string[];
} {
  const strings = [
    { at: "path", text: path },
    ...stringsOf(query, "query"),
    ...stringsOf(body, "body"),
  ];
  const cited = strings.flatMap(({ text }) =>
    [...text.matchAll(anyHole)].map(([, hole = ""]) => citedBy(hole).name),
  );
  const misplaced = strings
    .filter(
      ({ at, text }) => at !== "path" && hasHole.test(text) && !wholeHole.test(text),
    )
    .map(({ at }) => at);
  return { cited: [...new Set(cited)], misplaced };
}

class Unresolved extends Error {
  readonly type = "unresolved";
}

const text = (value: Json) => (typeof value === "string" ? value : JSON.stringify(value));

function resolve(hole: string, answers: ReadonlyMap<string, TargetResponse>): Json {
  const { name, at } = citedBy(hole);
  const answer = answers.get(name);
  const value = answer === undefined ? undefined : valueAt(answer, at);
  if (value === undefined || value === null) {
    throw new Unresolved(`{{${hole}}} resolves to nothing`);
  }
  return jsonSchema.parse(value);
}

function fill(value: Json, answers: ReadonlyMap<string, TargetResponse>): Json {
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

// The holes of a request filled from the answers of the steps named before it:
//   {path: "/a/{{m.body.id}}", body: {n: "{{m.body.id}}"}}, m answered {body: {id: 7}}
//   -> {sent: {path: "/a/7", body: {n: 7}}}
// a hole that resolves to nothing -> {unplayable: "{{m.body.x}} resolves to nothing"}
export function fillHoles(
  { method, path, query, body }: StepRequest,
  answers: ReadonlyMap<string, TargetResponse>,
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
      },
    };
  } catch (error) {
    if (error instanceof Unresolved) return { unplayable: error.message };
    throw error;
  }
}
