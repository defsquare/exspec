import type { Event } from "../shapes/event.ts";
import { type Asked, commandRun } from "./command.ts";
import type { Io } from "./io.ts";
import { startTarget, stopTarget } from "./lifecycle.ts";
import { playEach } from "./play.ts";

export function up(asked: Asked, io: Io): AsyncGenerator<Event> {
  return commandRun("up", asked, io, true, async function* (target) {
    yield* startTarget({ dir: asked.dir, target, io });
    return true;
  });
}

export function down(asked: Asked, io: Io): AsyncGenerator<Event> {
  return commandRun("down", asked, io, false, async function* (target) {
    yield* stopTarget({ dir: asked.dir, target, io });
    return true;
  });
}

// on a target already up: each scenario after a reset, once
export function play(asked: Asked, io: Io): AsyncGenerator<Event> {
  const { dir, extraction } = asked;
  return commandRun("play", asked, io, false, async function* (target, scenarios) {
    const credentials = await io.readCredentials(dir, target);
    const played = yield* playEach(
      { dir, target, extraction, io },
      scenarios,
      credentials,
    );
    return played.size === scenarios.length;
  });
}
