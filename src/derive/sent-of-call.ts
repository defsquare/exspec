import type { InputPlace } from "../shapes/bindings.ts";
import type { Json, Sent, StepCall } from "../shapes/roles.ts";
import type { Interface } from "../shapes/target.ts";
import { wholeHole } from "./holes.ts";
import { isMap } from "./json.ts";

// {a: {b: 1}}, [a, c], 2 -> {a: {b: 1, c: 2}}
function setIn(
  root: Json | undefined,
  [key, ...rest]: readonly string[],
  value: Json,
): Json {
  if (key === undefined) return value;
  const map = isMap(root) ? root : {};
  return { ...map, [key]: setIn(map[key], rest, value) };
}

const text = (value: Json) => (typeof value === "string" ? value : JSON.stringify(value));

// The request a call is sent as, each input at its place, a value keeping its type:
//   {with: {x: "u v", q: 2, b: 1}}, {x: [path, x], q: [query, q], b: [body, a, b]},
//   "post /s/{x}"  -> {sent: {method: post, path: "/s/u%20v", query: {q: 2}, body: {a: {b: 1}}}}
// A hole alone in a path parameter is left as written, to be encoded when it is filled.
// An interface that takes a form is sent one, {} when no input goes to it; a body or a
// query only when an input goes to it.
export function sentOfCall({
  call,
  places,
  bound,
}: {
  readonly call: StepCall;
  readonly places: Readonly<Record<string, InputPlace>>;
  readonly bound: Interface;
}): { readonly sent: Sent } | { readonly refused: string } {
  const where = `${bound.method} ${bound.pattern}`;
  let path = bound.pattern;
  let body: Json | undefined;
  const query: Record<string, Json> = {};
  const form: Record<string, Json> = {};
  for (const [name, value] of Object.entries(call.with)) {
    const place = Object.hasOwn(places, name) ? places[name] : undefined;
    if (place === undefined) return { refused: `"${name}" has no place in ${where}` };
    if (place[0] === "body") {
      const [, ...keys] = place;
      body = setIn(body, keys, value);
    } else if (place[0] === "query") {
      query[place[1]] = value;
    } else if (place[0] === "form") {
      form[place[1]] = value;
    } else {
      const segment = text(value);
      path = path.replaceAll(
        `{${place[1]}}`,
        wholeHole.test(segment) ? segment : encodeURIComponent(segment),
      );
    }
  }
  const unfilled = /\{([^{}]+)\}/.exec(path.replace(/\{\{[^{}]*\}\}/g, ""))?.[1];
  if (unfilled !== undefined) {
    return { refused: `the path parameter "${unfilled}" of ${where} is not given` };
  }
  return {
    sent: {
      method: bound.method,
      path,
      ...(Object.keys(query).length > 0 ? { query } : {}),
      ...(body === undefined ? {} : { body }),
      ...(bound.request.form === undefined ? {} : { form }),
    },
  };
}
