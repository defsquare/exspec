import type { z } from "zod";
import { recordedBody } from "../shapes/recorded-body.ts";
import type { SideEffect } from "../shapes/roles.ts";
import { methodSchema, type Observable } from "../shapes/target.ts";

type Method = z.infer<typeof methodSchema>;

export class RecordingFailed extends Error {
  readonly type = "recording-failed";
}

// a call answered, but its record could not be made: "post /b to s: <why>"
type Unrecorded = { readonly failed: string };

type Answer = {
  readonly status: number;
  readonly headers: Headers;
  readonly bytes: Uint8Array<ArrayBuffer>;
};

export type RecordingProxy = {
  // what was recorded since the last take, once the proxy has been quiet
  readonly takeSideEffects: () => Promise<readonly SideEffect[]>;
  readonly forgetSideEffects: () => Promise<void>;
  readonly stopProxy: () => Promise<void>;
};

const responseOf = ({ status, headers, bytes }: Answer) =>
  new Response(bytes.length === 0 ? null : bytes, { status, headers });

const textAnswer = (status: number, text: string): Answer => ({
  status,
  headers: new Headers({ "content-type": "text/plain" }),
  bytes: new TextEncoder().encode(text),
});

// the request passed on as it came, but its host; the answer as it came back
async function forwardRequest(
  url: string,
  request: Request,
  bytes: Uint8Array<ArrayBuffer>,
): Promise<Answer> {
  const headers = new Headers(request.headers);
  headers.delete("host");
  try {
    const answered = await fetch(url, {
      method: request.method,
      headers,
      ...(bytes.length === 0 ? {} : { body: bytes }),
      redirect: "manual",
    });
    const kept = new Headers(answered.headers);
    // fetch has decoded the body: its encoding and length no longer hold
    kept.delete("content-encoding");
    kept.delete("content-length");
    return {
      status: answered.status,
      headers: kept,
      bytes: new Uint8Array(await answered.arrayBuffer()),
    };
  } catch (error) {
    // nothing stands behind: the target is answered as by a gateway, and the record says why
    return textAnswer(502, `${url} unreachable: ${String(error)}`);
  }
}

// GET /p/a?x=1 -> forwarded to <behind of p>/a?x=1, recorded as {observable: p, request:
// {method: get, path: /a, query: {x: "1"}}, response: {status, body}}. The side effects of a step
// are those recorded until the proxy is quiet: nothing in flight, nothing arrived for `quiet` ms.
export function startProxy({
  port,
  quiet,
  observables,
}: {
  readonly port: number;
  readonly quiet: number;
  // each observable with the address of what stands behind it
  readonly observables: readonly (Pick<Observable, "observable"> & {
    readonly behind: string;
  })[];
}): RecordingProxy {
  // in the order received; each settles once its answer is known
  let recorded: Promise<SideEffect | Unrecorded>[] = [];
  let inFlight = 0;
  let last = 0;

  async function recordCall({
    observable,
    method,
    path,
    search,
    url,
    request,
  }: {
    readonly observable: string;
    readonly method: Method;
    readonly path: string;
    readonly search: string;
    readonly url: string;
    readonly request: Request;
  }): Promise<{ readonly answer: Answer; readonly effect: SideEffect }> {
    const bytes = new Uint8Array(await request.arrayBuffer());
    const answer = await forwardRequest(url, request, bytes);
    const query = new URLSearchParams(search);
    const body = recordedBody({
      contentType: request.headers.get("content-type"),
      bytes,
    });
    return {
      answer,
      effect: {
        observable,
        request: {
          method,
          path,
          // a key given twice keeps its last value
          ...(query.size === 0 ? {} : { query: Object.fromEntries(query) }),
          ...(body === undefined ? {} : { body }),
        },
        response: {
          status: answer.status,
          body:
            recordedBody({
              contentType: answer.headers.get("content-type"),
              bytes: answer.bytes,
            }) ?? null,
        },
      },
    };
  }

  async function answerRequest(request: Request): Promise<Response> {
    const { pathname, search } = new URL(request.url);
    const [, name = "", ...segments] = pathname.split("/");
    const path = `/${segments.join("/")}`;
    const observable = observables.find((one) => one.observable === name);
    if (observable === undefined) {
      return responseOf(textAnswer(502, `no observable "${name}" behind this proxy`));
    }
    const url = `${observable.behind}${path}${search}`;
    const method = methodSchema.safeParse(request.method.toLowerCase());
    // A ceiling: a method a step cannot write (head, options) is passed on, not recorded.
    if (!method.success) {
      const bytes = new Uint8Array(await request.arrayBuffer());
      return responseOf(await forwardRequest(url, request, bytes));
    }
    // A record that cannot be made (the request's body cut off) is data until a take
    // raises it: a rejection held here, unhandled until then, would end the process.
    const call = recordCall({
      observable: name,
      method: method.data,
      path,
      search,
      url,
      request,
    }).catch((error: unknown) => {
      const why = error instanceof Error ? error.message : String(error);
      return {
        answer: textAnswer(502, `not recorded: ${why}`),
        effect: { failed: `${method.data} ${path} to ${name}: ${why}` },
      };
    });
    recorded = [...recorded, call.then(({ effect }) => effect)];
    return responseOf((await call).answer);
  }

  const server = Bun.serve({
    hostname: "127.0.0.1",
    port,
    fetch: async (request) => {
      inFlight += 1;
      last = Date.now();
      try {
        return await answerRequest(request);
      } finally {
        inFlight -= 1;
        last = Date.now();
      }
    },
  });

  return {
    // Quiet is counted from the take too: a target that calls a provider after it has
    // answered its own caller is waited for, `quiet` ms at most.
    takeSideEffects: async () => {
      const from = Date.now();
      while (inFlight > 0 || Date.now() < Math.max(last, from) + quiet) {
        await Bun.sleep(inFlight > 0 ? 5 : Math.max(last, from) + quiet - Date.now());
      }
      const taken = recorded;
      recorded = [];
      const effects: SideEffect[] = [];
      for (const one of await Promise.all(taken)) {
        if ("failed" in one) throw new RecordingFailed(`not recorded: ${one.failed}`);
        effects.push(one);
      }
      return effects;
    },
    forgetSideEffects: async () => {
      recorded = [];
    },
    stopProxy: () => server.stop(true),
  };
}
