import { z } from "zod";
import type { Json } from "./roles.ts";

// A threshold, so a heuristic: a base64 string this long in a JSON body is taken for a
// file. A shorter file is kept whole; a long token that happens to be base64 is digested.
const fileLength = 1024;

const base64 = /^[A-Za-z0-9+/]+={0,2}$/;

// A string this long is no longer read by anyone: kept as the digest of its text.
// A threshold too: a long page a target answers is lost to its reader with it.
const readableLength = 16384;

// "base64:AAAA…"  "data:font/ttf;base64,AAAA…"  "AAAA…"  ->  "AAAA…"
const encoded = /^(?:base64:|data:[^,]*;base64,)?(.*)$/s;

const digestOf = (bytes: Uint8Array): Json => ({
  bytes: bytes.length,
  sha256: new Bun.CryptoHasher("sha256").update(bytes).digest("hex"),
});

// {a: "<2000 chars of base64>", b: "x", c: "base64:<2000 chars>", d: "<20000 chars of text>"}
// -> {a: {bytes: 1500, sha256: "9f…"}, b: "x", c: {bytes: 1500, …}, d: {bytes: 20000, …}}
function withDigests(value: Json): Json {
  if (typeof value === "string") {
    const data = encoded.exec(value)?.[1] ?? value;
    if (data.length > fileLength && data.length % 4 === 0 && base64.test(data)) {
      return digestOf(Uint8Array.from(atob(data), (c) => c.charCodeAt(0)));
    }
    return value.length > readableLength
      ? digestOf(new TextEncoder().encode(value))
      : value;
  }
  if (Array.isArray(value)) return value.map(withDigests);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, withDigests(inner)]),
    );
  }
  return value;
}

// A body as it is kept in a side effect, from its bytes and its content-type:
//   ""                                  -> undefined
//   '{"a":1}'          application/json -> {a: 1}
//   "<p>"              text/html        -> "<p>"
//   "a=1&b=x+y"        application/x-www-form-urlencoded -> "a=1&b=x+y"
//   %PDF…              application/pdf  -> {bytes: 1234, sha256: "9f…"}
// A content-type that says neither text nor JSON is a file; none at all is read as text.
export function recordedBody({
  contentType,
  bytes,
}: {
  readonly contentType: string | null;
  readonly bytes: Uint8Array;
}): Json | undefined {
  if (bytes.length === 0) return undefined;
  const type = contentType ?? "text/plain";
  if (type.startsWith("application/x-www-form-urlencoded")) {
    return withDigests(new TextDecoder().decode(bytes));
  }
  if (!type.startsWith("text/") && !type.includes("json")) return digestOf(bytes);
  const text = new TextDecoder().decode(bytes);
  try {
    return withDigests(z.json().parse(JSON.parse(text)));
  } catch {
    // not JSON: the text is what was sent
    return withDigests(text);
  }
}
