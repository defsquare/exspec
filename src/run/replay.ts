import { compareWithReference } from "../derive/compare.ts";
import { writtenAlike } from "../derive/written.ts";
import type { Event } from "../shapes/event.ts";
import { type Asked, commandRun } from "./command.ts";
import type { Io } from "./io.ts";
import { stopTarget } from "./lifecycle.ts";
import { playOnFreshStack } from "./play.ts";

// One execution on a fresh stack, each scenario that has a reference of it as it is
// written compared with that reference.
export function replay(asked: Asked, io: Io): AsyncGenerator<Event> {
  const { dir, extraction } = asked;
  return commandRun("replay", asked, io, true, async function* (target, selected) {
    const referenceAt = new Map(
      extraction.references.map(({ path, reference }) => [path, reference]),
    );
    const refused = selected.flatMap(({ path, scenario }) => {
      const reference = referenceAt.get(path);
      if (reference === undefined) {
        return asked.paths.includes(path)
          ? [{ path, message: "it has no reference" }]
          : [];
      }
      return writtenAlike(scenario, reference)
        ? []
        : [
            {
              path,
              message: "its reference is of the scenario as it was: record it again",
            },
          ];
    });
    const scenarios = selected.filter(
      ({ path }) => referenceAt.has(path) && !refused.some((r) => r.path === path),
    );
    for (const { path, message } of refused) {
      yield { type: "scenario-unplayable", path, message };
    }
    if (scenarios.length === 0) {
      yield { type: "command-failed", message: "no reference to replay" };
      return false;
    }
    yield* stopTarget({ dir, target, io });
    const played = yield* playOnFreshStack({ dir, target, extraction, io }, scenarios);
    let ok = played.size === scenarios.length && refused.length === 0;
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
