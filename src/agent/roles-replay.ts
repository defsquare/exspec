import {
  compareEvidence,
  type EvidenceReference,
  isAsWritten,
} from "../derive/evidence.ts";
import { startTarget, stopTarget } from "../run/lifecycle.ts";
import type { Event } from "../shapes/event.ts";
import { type RolesRun, rolesCommand } from "./roles.ts";
import { type CheckedScenario, checkedScenariosOf, playOnce } from "./roles-scenarios.ts";

type Selected =
  | { readonly one: CheckedScenario; readonly reference: EvidenceReference }
  | { readonly one: CheckedScenario; readonly refused: string }
  | undefined;

// a reference of the scenario as written is replayed; one with an unplayable step or of the
// scenario as it was is refused; no reference at all, refused only when the interface was
// asked for
function selected(one: CheckedScenario, asked: boolean): Selected {
  const { evidence, scenario } = one;
  if (evidence?.noise === undefined) {
    return asked ? { one, refused: "it has no reference" } : undefined;
  }
  if (evidence.exchanges.some((exchange) => "unplayable" in exchange)) {
    return {
      one,
      refused: "its evidence has a step that could not be played: record it again",
    };
  }
  return isAsWritten(scenario, evidence)
    ? { one, reference: { ...evidence, noise: evidence.noise } }
    : { one, refused: "its reference is of the scenario as it was: record it again" };
}

// One play of each reference's scenario on a fresh stack, compared with the reference
// outside its noise. Nothing is written.
export function rolesReplay(rolesRun: RolesRun): AsyncGenerator<Event> {
  const { dir, io, only } = rolesRun;
  return rolesCommand("roles-replay", rolesRun, async function* ({ target, interfaces }) {
    // the actors' names, from the credentials of the last stack
    const known = await io.readCredentials(dir, target);
    const { scenarios, passed } = yield* checkedScenariosOf(rolesRun, interfaces, known);
    const chosen = scenarios.map((one) => selected(one, only !== undefined));
    const references = chosen.flatMap((s) =>
      s !== undefined && "reference" in s ? [s] : [],
    );
    const refused = chosen.flatMap((s) => (s !== undefined && "refused" in s ? [s] : []));
    for (const { one, refused: message } of refused) {
      yield { type: "scenario-unplayable", path: one.path, message };
    }
    if (references.length === 0) {
      yield { type: "command-failed", message: "no reference to replay" };
      return false;
    }
    const lifecycle = { dir, target, io };
    let ok = passed && refused.length === 0;
    yield* stopTarget(lifecycle);
    try {
      yield* startTarget(lifecycle);
      const credentials = await io.readCredentials(dir, target);
      const stack = { rolesRun, target, credentials };
      for (const { one, reference } of references) {
        const differences = compareEvidence(reference, yield* playOnce(stack, one));
        if (differences.length > 0) ok = false;
        yield { type: "scenario-replayed", path: one.path, differences };
      }
    } finally {
      yield* stopTarget(lifecycle);
    }
    return ok;
  });
}
