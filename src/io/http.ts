import { recordedBody } from "../shapes/recorded-body.ts";
import type { HttpRequest, TargetResponse } from "../shapes/scenario.ts";

export class TargetUnreachable extends Error {
  readonly type = "target-unreachable";
}

export async function send({
  method,
  url,
  headers,
  body,
  form,
}: HttpRequest): Promise<TargetResponse> {
  const response = await fetch(url, {
    method: method.toUpperCase(),
    headers,
    ...(form !== undefined
      ? { body: new URLSearchParams(form).toString() }
      : body === undefined
        ? {}
        : { body: JSON.stringify(body) }),
    // a redirection is what the target answered: its status, not the page it leads to
    redirect: "manual",
  }).catch((error: unknown) => {
    throw new TargetUnreachable(`${method} ${url}: ${String(error)}`, { cause: error });
  });
  // ""  -> null;  '{"a":1}' -> {a: 1};  "<html>" -> "<html>";  a PDF -> {bytes, sha256}
  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get("content-type");
  return { status: response.status, body: recordedBody({ contentType, bytes }) ?? null };
}
