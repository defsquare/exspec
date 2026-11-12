import { markNoise } from "../derive/noise.ts";
import { writtenAlike } from "../derive/written.ts";
import type { Event } from "../shapes/event.ts";
import { type Asked, commandRun } from "./command.ts";
import type { Io } from "./io.ts";
import { stopTarget } from "./lifecycle.ts";
import { playOnFreshStack } from "./play.ts";

// Two executions on two fresh stacks; a scenario they answer alike, but for its noise,
// gets a reference: the first copy, its noise beside it. A reference of the scenario as it
// is written is kept unless forced; one of the scenario as it was is replaced.
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
    const referenceAt = new Map(
      extraction.references.map(({ path, reference }) => [path, reference]),
    );
    let ok = true;
    for (const { path, scenario } of scenarios) {
      const a = first.get(path);
      const b = second.get(path);
      if (a === undefined || b === undefined) {
        ok = false;
        continue;
      }
      const reference = referenceAt.get(path);
      const kept = reference !== undefined && writtenAlike(scenario, reference) && !force;
      const marked = markNoise(a, b);
      if (!marked.stable) {
        ok = false;
        yield { type: "scenario-unstable", path, differences: marked.differences };
      } else if (kept) {
        yield { type: "reference-kept", path };
      } else {
        await io.writeReference(dir, path, { ...a, noise: marked.noise });
        yield { type: "reference-written", path, noise: marked.noise.length };
      }
    }
    return ok;
  });
}
