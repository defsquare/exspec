import type { Extraction } from "../shapes/extraction.ts";
import type { Call, HttpRequest } from "../shapes/scenario.ts";
import type { Credentials } from "../shapes/target.ts";
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

// {operation: f, with: {s: "a b", x: 1, t: "c"}, caller: u}, the trigger of f sending
// s to [path, s], x to [query, x], t to [body, a, t], on "delete /s/{s}" of base-url h
//   -> {method: "delete", url: "h/s/a%20b?x=1", headers: {...u's, Content-Type},
//       body: {a: {t: "c"}}}
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
  const query = new URLSearchParams();
  const filled = Object.entries(call.with).reduce<{
    readonly path: string;
    readonly body: unknown;
  }>(
    ({ path, body }, [name, value]) => {
      const place = Object.hasOwn(trigger.sends, name) ? trigger.sends[name] : undefined;
      if (place === undefined) {
        throw new UnplayableCall(`"${name}" is sent nowhere by "${trigger.trigger}"`);
      }
      if (place[0] === "body") {
        const [, ...keys] = place;
        return { path, body: setIn(body, keys, value) };
      }
      const [where, key] = place;
      if (where === "query") {
        query.append(key, text(value));
        return { path, body };
      }
      return { path: path.replaceAll(`{${key}}`, encodeURIComponent(text(value))), body };
    },
    { path: bound.pattern, body: undefined },
  );
  const unfilled = /\{([^}]+)\}/.exec(filled.path)?.[1];
  if (unfilled !== undefined) {
    throw new UnplayableCall(
      `the path parameter "${unfilled}" of ${bound.pattern} is not given`,
    );
  }
  const caller = call.caller;
  const headers =
    caller === undefined
      ? {}
      : Object.hasOwn(credentials, caller)
        ? credentials[caller]
        : undefined;
  if (headers === undefined) throw new UnplayableCall(`no credentials for "${caller}"`);
  const search = query.size > 0 ? `?${query}` : "";
  const url = `${target.api["base-url"]}${filled.path}${search}`;
  if (filled.body === undefined) return { method: bound.method, url, headers };
  return {
    method: bound.method,
    url,
    headers: { ...headers, "Content-Type": "application/json" },
    body: filled.body,
  };
}
