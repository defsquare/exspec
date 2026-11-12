import { z } from "zod";
import type { HttpRequest, TargetResponse } from "../shapes/scenario.ts";

export class TargetUnreachable extends Error {
  readonly type = "target-unreachable";
}

// "" -> null;  '{"a":1}' -> {a: 1};  "<html>" -> "<html>"
function bodyOf(text: string): TargetResponse["body"] {
  if (text === "") return null;
  try {
    return z.json().parse(JSON.parse(text));
  } catch {
    // not JSON: the target answered a text, and the text is what it answered
    return text;
  }
}

export async function send({
  method,
  url,
  headers,
  body,
}: HttpRequest): Promise<TargetResponse> {
  const response = await fetch(url, {
    method: method.toUpperCase(),
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }).catch((error: unknown) => {
    throw new TargetUnreachable(`${method} ${url}: ${String(error)}`, { cause: error });
  });
  return { status: response.status, body: bodyOf(await response.text()) };
}
