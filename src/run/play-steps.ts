import { fillGiven, fillHoles } from "../derive/holes.ts";
import { headersOf } from "../derive/request.ts";
import { stepRequest } from "../derive/step-request.ts";
import type { Exchange, ServiceStep, Step } from "../shapes/roles.ts";
import type { Run, TargetResponse } from "../shapes/scenario.ts";
import type { Credentials, Target } from "../shapes/target.ts";
import type { Io } from "./io.ts";
import { resetTarget } from "./lifecycle.ts";

// notTaken: one line per step whose side effects could not be taken
export type PlayedSteps = {
  readonly run: Run;
  readonly exchanges: readonly Exchange[];
  readonly notTaken: readonly string[];
};

// A service step given to the provider that renders the service, its holes filled:
//   {when: arrange, service: s, is: refuses, with: {address: "{{n.body.to}}"}}
//   -> {when: arrange, service: s, is: refuses, with: {address: "u@x"}}
//   refused -> {when: arrange, service: s, is: refuses, unplayable: "p answered 404: …"}
async function giveStep(
  { when, service, is, with: given }: ServiceStep,
  io: Io,
  answers: ReadonlyMap<string, TargetResponse>,
): Promise<Exchange> {
  const addressed = { when, service, is };
  const filled = fillGiven(given ?? {}, answers);
  if ("unplayable" in filled) return { ...addressed, unplayable: filled.unplayable };
  if (io.giveCondition === undefined) {
    return { ...addressed, unplayable: `no provider is stood to render ${service}` };
  }
  const taken = await io.giveCondition({ service, condition: is, with: filled.given });
  if ("refused" in taken) return { ...addressed, unplayable: taken.refused };
  return given === undefined ? addressed : { ...addressed, with: filled.given };
}

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
  // What the reset made the target send to its providers is dropped, never
  // shown; a reset that failed at a provider shows only in what the steps then answer.
  await io.resetProviders?.();
  const run = { target: target.target, version: io.version, at: io.now(), clock: null };
  const answers = new Map<string, TargetResponse>();
  const exchanges: Exchange[] = [];
  const notTaken: string[] = [];
  const base = target.api["base-url"];
  for (const step of steps) {
    if ("service" in step) {
      const given = await giveStep(step, io, answers);
      exchanges.push(given);
      if ("unplayable" in given) break;
      continue;
    }
    const { when, as, name, request } = step;
    const addressed = { when, as };
    const headers = headersOf(credentials, as);
    const filled = fillHoles(request, answers);
    if (headers === undefined) {
      exchanges.push({ ...addressed, unplayable: `no credentials for "${as}"` });
      break;
    }
    if ("unplayable" in filled) {
      exchanges.push({ ...addressed, unplayable: filled.unplayable });
      break;
    }
    const { sent } = filled;
    // the platform's fetch refuses it before anything is sent
    if (sent.method === "get" && (sent.body !== undefined || sent.form !== undefined)) {
      exchanges.push({ ...addressed, unplayable: "a get request cannot carry a body" });
      break;
    }
    const response = await io.send(stepRequest({ base, sent, headers }));
    if (name !== undefined) answers.set(name, response);
    const exchange = { ...addressed, request: sent, response };
    if (io.takeSideEffects === undefined) {
      exchanges.push(exchange);
      continue;
    }
    // a step whose side effects cannot be taken keeps its answer and has no side-effects
    // key (what the target sent is unknown); why is returned beside the exchanges
    const taken = await io.takeSideEffects().catch((error: unknown) => ({
      notTaken: `a ${when} step: what was sent to a provider could not be recorded: ${
        error instanceof Error ? error.message : String(error)
      }`,
    }));
    if ("notTaken" in taken) {
      exchanges.push(exchange);
      notTaken.push(taken.notTaken);
      continue;
    }
    exchanges.push({ ...exchange, "side-effects": taken });
  }
  return { run, exchanges, notTaken };
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
