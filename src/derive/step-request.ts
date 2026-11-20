import type { Sent } from "../shapes/roles.ts";
import type { HttpRequest } from "../shapes/scenario.ts";

// {method: post, path: "/a/b", query: {x: 1}, body: {n: 1}}, base-url h, headers k
//   -> {method: post, url: "h/a/b?x=1", headers: {...k, Content-Type}, body: {n: 1}}
// {method: post, path: "/a", form: {to: "x y", n: 1}}
//   -> {method: post, url: "h/a", headers: {...k, Content-Type: form}, form: {to: "x y", n: "1"}}
// {form: {to: "x", gone: null}} -> form: {to: "x"}
// The path is sent as written: its holes were encoded when they were filled.
export function stepRequest({
  base,
  sent: { method, path, query, body, form },
  headers,
}: {
  readonly base: string;
  readonly sent: Sent;
  readonly headers: Readonly<Record<string, string>>;
}): HttpRequest {
  const search = new URLSearchParams(
    Object.entries(query ?? {}).map(([key, value]) => [
      key,
      typeof value === "string" ? value : JSON.stringify(value),
    ]),
  );
  const url = `${base}${path}${search.size > 0 ? `?${search}` : ""}`;
  if (form !== undefined) {
    return {
      method,
      url,
      headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
      form: Object.fromEntries(
        Object.entries(form)
          .filter(([, value]) => value !== null)
          .map(([key, value]) => [
            key,
            typeof value === "string" ? value : JSON.stringify(value),
          ]),
      ),
    };
  }
  if (body === undefined) return { method, url, headers };
  return {
    method,
    url,
    headers: { ...headers, "Content-Type": "application/json" },
    body,
  };
}
