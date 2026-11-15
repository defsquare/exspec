import { fillHoles } from "../derive/holes.ts";
import { headersOf } from "../derive/request.ts";
import { stepRequest } from "../derive/step-request.ts";
import type { Exchange, Step } from "../shapes/roles.ts";
import type { Run, TargetResponse } from "../shapes/scenario.ts";
import type { Credentials, Target } from "../shapes/target.ts";
import type { Io } from "./io.ts";
import { resetTarget } from "./lifecycle.ts";

export type PlayedSteps = { readonly run: Run; readonly exchanges: readonly Exchange[] };

// The target reset, then each step sent in order, its holes filled from the answers of the
// steps named before it. A step that cannot be sent is the last exchange: {when, as,
// unplayable}. The reset's own events are not kept: the exchanges are the record.
export async function playSteps({
  dir,
  target,
  io,
  credentials,
  steps,
}: {
  readonly dir: string;
  readonly target: Target;
  readonly io: Io;
  readonly credentials: Credentials;
  readonly steps: readonly Step[];
}): Promise<PlayedSteps> {
  await Array.fromAsync(resetTarget({ dir, target, io }));
  const run = { target: target.target, version: io.version, at: io.now(), clock: null };
  const answers = new Map<string, TargetResponse>();
  const exchanges: Exchange[] = [];
  for (const { when, as, name, request } of steps) {
    const headers = headersOf(credentials, as);
    const filled = fillHoles(request, answers);
    if (headers === undefined) {
      exchanges.push({ when, as, unplayable: `no credentials for "${as}"` });
      break;
    }
    if ("unplayable" in filled) {
      exchanges.push({ when, as, unplayable: filled.unplayable });
      break;
    }
    const { sent } = filled;
    // the platform's fetch refuses it before anything is sent
    if (sent.method === "get" && sent.body !== undefined) {
      exchanges.push({ when, as, unplayable: "a get request cannot carry a body" });
      break;
    }
    const response = await io.send(
      stepRequest({ base: target.api["base-url"], sent, headers }),
    );
    if (name !== undefined) answers.set(name, response);
    exchanges.push({ when, as, request: sent, response });
  }
  return { run, exchanges };
}

// one at a time: f(a) and f(b) called together run one after the other, in call order.
// Builders run side by side on one target; a reset and its steps are one critical section.
export function oneAtATime(): <T>(run: () => Promise<T>) => Promise<T> {
  let last: Promise<unknown> = Promise.resolve();
  return (run) => {
    const next = last.then(run);
    // the queue waits on a failure too; the failure itself reaches the caller through next
    last = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };
}
