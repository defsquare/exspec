import { TargetUnreachable } from "../io/http.ts";
import type { Event } from "../shapes/event.ts";
import type { Target } from "../shapes/target.ts";
import type { Io } from "./io.ts";

export class TargetNotAlive extends Error {
  readonly type = "target-not-alive";
}

type Lifecycle = {
  readonly dir: string;
  readonly target: Target;
  readonly io: Pick<Io, "runLines" | "send" | "sleep">;
};

const every = 2_000;
const attempts = 150;

async function* step(
  name: Extract<Event, { type: "target-step" }>["step"],
  run: () => Promise<void>,
): AsyncGenerator<Event> {
  yield { type: "target-step", step: name, state: "started" };
  await run();
  yield { type: "target-step", step: name, state: "done" };
}

// the alive request every 2 s, up to 300 s; a target that does not answer yet is not alive yet
async function waitAlive({ target, io: { send, sleep } }: Lifecycle): Promise<void> {
  const { method, path, status } = target.alive;
  const url = `${target.api["base-url"]}${path}`;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await sleep(every);
    const answer = await send({ method, url, headers: {} }).catch((error: unknown) => {
      if (error instanceof TargetUnreachable) return undefined;
      throw error;
    });
    if (answer?.status === status) return;
  }
  throw new TargetNotAlive(
    `${method} ${url} did not answer ${status} within ${(every * attempts) / 1000} s`,
  );
}

export async function* startTarget(lifecycle: Lifecycle): AsyncGenerator<Event> {
  const { dir, target, io } = lifecycle;
  yield* step("start", () => io.runLines(target.start, dir));
  yield* step("alive", () => waitAlive(lifecycle));
  yield* step("seed", () => io.runLines(target.seed, dir));
}

export function stopTarget({ dir, target, io }: Lifecycle): AsyncGenerator<Event> {
  return step("stop", () => io.runLines(target.stop, dir));
}

export function resetTarget({ dir, target, io }: Lifecycle): AsyncGenerator<Event> {
  return step("reset", () => io.runLines(target.reset, dir));
}
