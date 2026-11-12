import { compareWithReference } from "../derive/compare.ts";
import type { Event } from "../shapes/event.ts";
import { type Asked, commandRun } from "./command.ts";
import type { Io } from "./io.ts";
import { stopTarget } from "./lifecycle.ts";
import { playOnFreshStack } from "./play.ts";

// One execution on a fresh stack, each scenario that has a reference compared with it.
export function replay(asked: Asked, io: Io): AsyncGenerator<Event> {
  const { dir, extraction } = asked;
  return commandRun("replay", asked, io, true, async function* (target, selected) {
    const referenceAt = new Map(
      extraction.references.map(({ path, reference }) => [path, reference]),
    );
    const scenarios = selected.filter(({ path }) => referenceAt.has(path));
    if (scenarios.length === 0) {
      yield { type: "command-failed", message: "no reference to replay" };
      return false;
    }
    yield* stopTarget({ dir, target, io });
    const played = yield* playOnFreshStack({ dir, target, extraction, io }, scenarios);
    let ok = played.size === scenarios.length;
    for (const { path } of scenarios) {
      const reference = referenceAt.get(path);
      const copy = played.get(path);
      if (reference === undefined || copy === undefined) continue;
      const differences = compareWithReference(reference, copy);
      if (differences.length > 0) ok = false;
      yield { type: "scenario-replayed", path, differences };
    }
    return ok;
  });
}
