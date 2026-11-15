import type { Sent } from "../shapes/roles.ts";
import type { HttpRequest } from "../shapes/scenario.ts";

// {method: post, path: "/a/b", query: {x: 1}, body: {n: 1}}, base-url h, headers k
//   -> {method: post, url: "h/a/b?x=1", headers: {...k, Content-Type}, body: {n: 1}}
// The path is sent as written: its holes were encoded when they were filled.
export function stepRequest({
  base,
  sent: { method, path, query, body },
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
  if (body === undefined) return { method, url, headers };
  return {
    method,
    url,
    headers: { ...headers, "Content-Type": "application/json" },
    body,
  };
}
