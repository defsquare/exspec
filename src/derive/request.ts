import type { Trigger } from "../shapes/bindings.ts";
import type { Extraction } from "../shapes/extraction.ts";
import type { Call, HttpRequest } from "../shapes/scenario.ts";
import type { Credentials, Interface } from "../shapes/target.ts";
import { isMap } from "./json.ts";

export class UnplayableCall extends Error {
  readonly type = "unplayable-call";
}

// {a: {b: 1}}, [a, c], 2 -> {a: {b: 1, c: 2}}
function setIn(
  root: unknown,
  [key, ...rest]: readonly string[],
  value: unknown,
): unknown {
  if (key === undefined) return value;
  const map = isMap(root) ? root : {};
  return { ...map, [key]: setIn(map[key], rest, value) };
}

const text = (value: unknown) =>
  typeof value === "string" ? value : JSON.stringify(value);

// u -> u's headers; no actor -> none; an actor with no credentials -> undefined
export function headersOf(
  credentials: Credentials,
  actor: string | null | undefined,
): Readonly<Record<string, string>> | undefined {
  if (actor === undefined || actor === null) return {};
  return Object.hasOwn(credentials, actor) ? credentials[actor] : undefined;
}

// the values {s: "a b", x: 1, t: "c"} sent to {s: [path, s], x: [query, x], t: [body, a, t]}
// on "delete /s/{s}" of base-url h
//   -> {method: "delete", url: "h/s/a%20b?x=1", headers: {...headers, Content-Type},
//       body: {a: {t: "c"}}}
// or why it cannot be sent: {refused: "…"}
export function fillRequest({
  base,
  bound,
  sends,
  values,
  headers,
  by,
}: {
  readonly base: string;
  readonly bound: Interface;
  readonly sends: Trigger["sends"];
  readonly values: Readonly<Record<string, unknown>>;
  readonly headers: Readonly<Record<string, string>>;
  readonly by: string;
}): HttpRequest | { readonly refused: string } {
  const query = new URLSearchParams();
  let path = bound.pattern;
  let body: unknown;
  for (const [name, value] of Object.entries(values)) {
    const place = Object.hasOwn(sends, name) ? sends[name] : undefined;
    if (place === undefined) return { refused: `"${name}" is sent nowhere by "${by}"` };
    if (place[0] === "body") {
      const [, ...keys] = place;
      body = setIn(body, keys, value);
    } else if (place[0] === "query") {
      query.append(place[1], text(value));
    } else if (place[0] === "form") {
      return {
        refused: `"${name}" is sent in a form by "${by}", which a call does not send`,
      };
    } else {
      path = path.replaceAll(`{${place[1]}}`, encodeURIComponent(text(value)));
    }
  }
  const unfilled = /\{([^}]+)\}/.exec(path)?.[1];
  if (unfilled !== undefined) {
    return {
      refused: `the path parameter "${unfilled}" of ${bound.pattern} is not given`,
    };
  }
  const search = query.size > 0 ? `?${query}` : "";
  const url = `${base}${path}${search}`;
  if (body === undefined) return { method: bound.method, url, headers };
  return {
    method: bound.method,
    url,
    headers: { ...headers, "Content-Type": "application/json" },
    body,
  };
}

// {operation: f, with: {s: "a b"}, caller: u}, the trigger of f sending s to [path, s]
//   -> the request fillRequest makes of it, with u's headers
export function requestOf({
  call,
  extraction: { target, triggers, interfaces },
  credentials,
}: {
  readonly call: Call;
  readonly extraction: Extraction;
  readonly credentials: Credentials;
}): HttpRequest {
  if (target === undefined) throw new UnplayableCall("the extraction names no target");
  const trigger = triggers.find((t) => t.operation === call.operation);
  if (trigger === undefined)
    throw new UnplayableCall(`no trigger calls "${call.operation}"`);
  const bound = interfaces.find((i) => i.interface === trigger.interface);
  if (bound === undefined)
    throw new UnplayableCall(`no interface "${trigger.interface}"`);
  const headers = headersOf(credentials, call.caller);
  if (headers === undefined)
    throw new UnplayableCall(`no credentials for "${call.caller}"`);
  const filled = fillRequest({
    base: target.api["base-url"],
    bound,
    sends: trigger.sends,
    values: call.with,
    headers,
    by: trigger.trigger,
  });
  if ("refused" in filled) throw new UnplayableCall(filled.refused);
  return filled;
}
