import type { Trigger } from "../shapes/bindings.ts";
import type { Extraction } from "../shapes/extraction.ts";
import type { Look, Noise, PlayedScenario, Reading } from "../shapes/scenario.ts";
import type { Operation } from "../shapes/specification.ts";
import { acceptedStatuses } from "./accepted.ts";
import { deepEqual } from "./json.ts";
import { termsOf } from "./reading.ts";
import { type Judged, judgeFact } from "./truth.ts";

// one played copy, the noise known of it ([] for a copy that is not a reference), and
// what it is judged against
export type Judging = {
  readonly played: PlayedScenario;
  readonly noise: readonly Noise[];
  readonly extraction: Extraction;
  readonly operation: Operation;
  readonly trigger: Trigger;
};

// accepted: one of the trigger's statuses; refused: a 4xx; anything else is neither
export function outcomeOf({
  played,
  trigger,
}: Pick<Judging, "played" | "trigger">): "accepted" | "refused" | "neither" {
  const { status } = played.act.response;
  if (acceptedStatuses(trigger).includes(status)) return "accepted";
  return status >= 400 && status < 500 ? "refused" : "neither";
}

// the reading of a look as the judged call's caller, and where it stands
export function readingOf(
  { played }: Pick<Judging, "played">,
  of: Look,
): { readonly reading: Reading; readonly index: number } | { readonly unknown: string } {
  const { readings, act } = played;
  if (readings === undefined)
    return { unknown: "it was played before readings were taken" };
  const caller = act.call.caller ?? null;
  const index = readings.findIndex((r) => r.as === caller && deepEqual(r.of, of));
  const reading = readings[index];
  return reading ? { reading, index } : { unknown: "it was not read" };
}

// a fact as the judged call's caller saw it before or after the call; a fact that reads
// no instance needs no reading
export function factAt(
  judging: Pick<Judging, "played" | "extraction">,
  name: string,
  when: "before" | "after",
): Judged {
  const { played, extraction } = judging;
  const { facts, projections } = extraction;
  const fact = facts.find((f) => f.fact === name);
  const as = played.act.call.caller ?? null;
  const found = readingOf(judging, { fact: name });
  if ("reading" in found) {
    return judgeFact({ fact, entries: found.reading[when], as, projections });
  }
  if (termsOf({ fact: name }, facts).length === 0) {
    return judgeFact({ fact, entries: [], as, projections });
  }
  return found;
}
