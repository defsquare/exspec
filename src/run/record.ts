import { markNoise } from "../derive/noise.ts";
import type { Event } from "../shapes/event.ts";
import { type Asked, commandRun } from "./command.ts";
import type { Io } from "./io.ts";
import { stopTarget } from "./lifecycle.ts";
import { playOnFreshStack } from "./play.ts";

// Two executions on two fresh stacks; a scenario they answer alike, but for its noise,
// gets a reference: the first copy, its noise beside it.
export function record(
  asked: Asked & { readonly force: boolean },
  io: Io,
): AsyncGenerator<Event> {
  const { dir, extraction, force } = asked;
  return commandRun("record", asked, io, true, async function* (target, scenarios) {
    const playing = { dir, target, extraction, io };
    yield* stopTarget({ dir, target, io });
    const first = yield* playOnFreshStack(playing, scenarios);
    const second = yield* playOnFreshStack(
      playing,
      scenarios.filter(({ path }) => first.has(path)),
    );
    const referenced = new Set(extraction.references.map(({ path }) => path));
    let ok = true;
    for (const { path } of scenarios) {
      const a = first.get(path);
      const b = second.get(path);
      if (a === undefined || b === undefined) {
        ok = false;
        continue;
      }
      const marked = markNoise(a, b);
      if (!marked.stable) {
        ok = false;
        yield { type: "scenario-unstable", path, differences: marked.differences };
      } else if (referenced.has(path) && !force) {
        yield { type: "reference-kept", path };
      } else {
        await io.writeReference(dir, path, { ...a, noise: marked.noise });
        yield { type: "reference-written", path, noise: marked.noise.length };
      }
    }
    return ok;
  });
}
