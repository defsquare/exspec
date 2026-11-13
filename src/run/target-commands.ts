import { judgeScenario } from "../derive/verdict.ts";
import type { Event } from "../shapes/event.ts";
import type { Extraction } from "../shapes/extraction.ts";
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

// each event, and after a scenario played the verdicts of that copy
async function* judgingEach<T>(
  events: AsyncGenerator<Event, T>,
  extraction: Extraction,
): AsyncGenerator<Event, T> {
  for (;;) {
    const next = await events.next();
    if (next.done) return next.value;
    const event = next.value;
    yield event;
    if (event.type !== "scenario-played") continue;
    const judged = judgeScenario({ played: event.played, noise: [], extraction });
    if (judged !== undefined) {
      yield { type: "scenario-judged", path: event.path, ...judged };
    }
  }
}

// on a target already up: each scenario after a reset, once, and its verdicts
export function play(asked: Asked, io: Io): AsyncGenerator<Event> {
  const { dir, extraction } = asked;
  return commandRun("play", asked, io, false, async function* (target, scenarios) {
    const credentials = await io.readCredentials(dir, target);
    const played = yield* judgingEach(
      playEach({ dir, target, extraction, io }, scenarios, credentials),
      extraction,
    );
    return played.size === scenarios.length;
  });
}
