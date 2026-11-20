import { join } from "node:path";
import type { Subprocess } from "bun";
import type { Json } from "../shapes/roles.ts";
import serve from "./serve.ts.txt" with { type: "text" };

// {service: s, condition: refuses, with: {address: "u@x"}}: a condition and a value for
// each parameter it takes
export type ConditionGiven = {
  readonly service: string;
  readonly condition: string;
  readonly with: Readonly<Record<string, Json>>;
};

// what a twin is sent of it: a twin renders one service and is not told which
export type ConditionOfTwin = Omit<ConditionGiven, "service">;

// what a twin answered a condition given on its fresh state: the state, or the text when
// it is no JSON
type TwinGiven = {
  readonly condition: string;
  readonly status: number;
  readonly state: unknown;
};

export type TwinTrial =
  | {
      readonly fresh: unknown;
      readonly again: unknown;
      readonly given: readonly TwinGiven[];
    }
  | { readonly failed: string };

const stateOf = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    // a refusal answers a message, not a state
    return text;
  }
};

// the twins of a dir, served: "http://127.0.0.1:<port>", where /<name>/… is a twin
export type ServedTwins = {
  readonly at: string;
  readonly stopTwins: () => Promise<void>;
};

const tries = 50;
const pause = 100;
// a twin that has not answered by then is down
export const deadline = 5000;

// a port no one holds now
function freePort(): number {
  const probe = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: () => new Response(),
  });
  const { port } = probe;
  probe.stop(true);
  return port ?? 0;
}

// The first answer at url, once the process serves; undefined when it exits first, or
// answers nothing for `tries` pauses
async function firstAnswer(
  url: string,
  served: Subprocess,
): Promise<Response | undefined> {
  for (let n = 0; n < tries && served.exitCode === null; n++) {
    // a refused connection is the process not serving yet: tried again after a pause
    const answer = await fetch(url, { signal: AbortSignal.timeout(deadline) }).catch(
      () => undefined,
    );
    if (answer !== undefined) return answer;
    await Bun.sleep(pause);
  }
  return undefined;
}

// exspec/providers/serve.ts written from the text exspec carries, then run by the Bun
// exspec itself runs on, in dir on a free port, once GET /<name>/__state answers 200 for
// each name: {at, stopTwins}. {failed: "…"} when it exits, answers nothing, or a twin
// answers otherwise; the process is killed then.
export async function serveTwins(
  dir: string,
  names: readonly string[],
): Promise<ServedTwins | { readonly failed: string }> {
  await Bun.write(join(dir, "exspec/providers/serve.ts"), serve);
  const port = freePort();
  // BUN_BE_BUN: a compiled exspec runs the file itself, no `bun` on the PATH needed
  const served = Bun.spawn([process.execPath, "exspec/providers/serve.ts"], {
    cwd: dir,
    env: { ...process.env, BUN_BE_BUN: "1", TWINS_PORT: String(port) },
    stdout: "ignore",
    stderr: "pipe",
  });
  const at = `http://127.0.0.1:${port}`;
  const failed = async (why: string) => {
    served.kill();
    await served.exited;
    return { failed: why };
  };
  for (const name of names) {
    const answer = await firstAnswer(`${at}/${name}/__state`, served);
    if (answer === undefined) {
      served.kill();
      const stderr = (await new Response(served.stderr).text()).trim();
      return { failed: stderr === "" ? "it answered nothing" : stderr };
    }
    if (!answer.ok) {
      return failed(
        `GET /${name}/__state answered ${answer.status}: ${await answer.text()}`,
      );
    }
  }
  // read as it comes, so a twin that writes much never fills the pipe and stalls
  const drained = new Response(served.stderr).text();
  return {
    at,
    stopTwins: async () => {
      served.kill();
      await Promise.all([served.exited, drained]);
    },
  };
}

// PUT /<name>/__given {condition, with} at the twins served at `at`: its status, and the
// state it answered, as text
export async function putGiven(
  at: string,
  name: string,
  given: ConditionOfTwin,
): Promise<{ readonly status: number; readonly text: string }> {
  const put = await fetch(`${at}/${name}/__given`, {
    method: "PUT",
    body: JSON.stringify(given),
    signal: AbortSignal.timeout(deadline),
  });
  return { status: put.status, text: await put.text() };
}

// The twin of dir served a moment: GET /<name>/__state, PUT it back, GET again; then, for
// each condition, PUT /__state {} and PUT /__given:
//   -> {fresh, again, given: [{condition: refuses, status: 200, state: {…}}]}
export async function tryTwin(
  dir: string,
  name: string,
  conditions: readonly ConditionOfTwin[],
): Promise<TwinTrial> {
  const twins = await serveTwins(dir, [name]);
  if ("failed" in twins) return twins;
  const url = `${twins.at}/${name}/__state`;
  try {
    const signal = () => AbortSignal.timeout(deadline);
    const putState = (body: unknown) =>
      fetch(url, { method: "PUT", body: JSON.stringify(body), signal: signal() });
    const fresh: unknown = await (await fetch(url, { signal: signal() })).json();
    const put = await putState(fresh);
    if (!put.ok) {
      return {
        failed: `PUT /${name}/__state answered ${put.status}: ${await put.text()}`,
      };
    }
    const again: unknown = await (await fetch(url, { signal: signal() })).json();
    const given: TwinGiven[] = [];
    for (const one of conditions) {
      await putState({});
      const { status, text } = await putGiven(twins.at, name, one);
      given.push({ condition: one.condition, status, state: stateOf(text) });
    }
    return { fresh, again, given };
  } catch (error) {
    // a state that is no JSON, a connection cut, no answer in time: the twin's fault, told
    // as its finding
    return {
      failed: `/${name}/__state: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    await twins.stopTwins();
  }
}
