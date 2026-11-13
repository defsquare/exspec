import type { RuleVerdict } from "../shapes/event.ts";
import type { Noise, Place, ReadingEntry } from "../shapes/scenario.ts";
import type { Operation } from "../shapes/specification.ts";
import { deepEqual, differingPlaces } from "./json.ts";
import { factAt, type Judging, outcomeOf, readingOf } from "./judging.ts";
import { fieldLook, termsOf } from "./reading.ts";
import { isSuccess, placeOf, valueRead } from "./truth.ts";

type Effect = Operation["effects"][number];
type Then = Effect["then"];
type Held =
  | { readonly holds: boolean; readonly why?: string }
  | { readonly unknown: string };

const classAt = (noise: readonly Noise[], at: Place) =>
  noise.find((n) => deepEqual(n.at, at))?.class;

// a noisy place at this place or above it: [a] is above [a, b]
const noisyAbove = (noise: readonly Noise[], at: Place) =>
  noise.some((n) => deepEqual(at.slice(0, n.at.length), n.at));

// One answer read before and after. Outside the noise, the same values; a noisy place
// is the same value as the place facing it when both are of one class:
//   before {t: [noise 1]}  after {t: [noise 1]}  ->  same
//   before {t: [noise 1]}  after {t: [noise 2]}  ->  changed
//   before {t: [noise 1]}  after {t: "x"}        ->  changed
function sameAnswer(
  noise: readonly Noise[],
  [before, beforeAt]: readonly [ReadingEntry, Place],
  [after, afterAt]: readonly [ReadingEntry, Place],
): boolean | "unknown" {
  if ("unreadable" in before || "unreadable" in after) return "unknown";
  if (before.status !== after.status) return false;
  const inBefore = (rel: Place) => [...beforeAt, "body", ...rel];
  const inAfter = (rel: Place) => [...afterAt, "body", ...rel];
  const noisy = (rel: Place) =>
    classAt(noise, inBefore(rel)) !== undefined ||
    classAt(noise, inAfter(rel)) !== undefined;
  if (differingPlaces(before.body, after.body, [], noisy).length > 0) return false;
  const under = (root: Place) =>
    noise.flatMap(({ at }) =>
      deepEqual(at.slice(0, root.length), root) ? [at.slice(root.length)] : [],
    );
  return [...under(inBefore([])), ...under(inAfter([]))].every(
    (rel) => classAt(noise, inBefore(rel)) === classAt(noise, inAfter(rel)),
  );
}

// Every answer read, the same before and after; only an answer that says something —
// a success, or the projection's absent status — is compared.
function nothingChanges({ played, noise, extraction }: Judging): Held {
  const { readings } = played;
  if (readings === undefined)
    return { unknown: "it was played before readings were taken" };
  const { facts, projections } = extraction;
  const unreadable: string[] = [];
  const compared = readings.flatMap(({ of, before, after }, i) =>
    termsOf(of, facts).flatMap((term, j) => {
      const entries = [before[j], after[j]];
      const readable = entries.every((entry) => {
        if (entry === undefined || "unreadable" in entry) return false;
        return (
          isSuccess(entry.status) || entry.status === placeOf(projections, term)?.absent
        );
      });
      const [first, second] = entries;
      if (!readable || first === undefined || second === undefined) {
        unreadable.push(
          "fact" in of
            ? `"${of.fact}"`
            : `${of.shows.structure}.${of.shows.field.join(".")}`,
        );
        return [];
      }
      return [
        sameAnswer(
          noise,
          [first, ["readings", i, "before", j]],
          [second, ["readings", i, "after", j]],
        ),
      ];
    }),
  );
  if (compared.includes(false)) return { holds: false, why: "something read changed" };
  if (unreadable.length > 0) return { unknown: `not readable: ${unreadable.join(", ")}` };
  if (compared.length === 0) return { unknown: "nothing readable was read" };
  return { holds: true };
}

function fieldChanges(
  judging: Judging,
  { of, change }: NonNullable<Extract<Then, { field?: unknown }>["field"]>[number],
): Held {
  const { operation, extraction, noise } = judging;
  const look = fieldLook(operation, extraction.structures, of);
  if (look === undefined || !("shows" in look)) {
    return { unknown: `no input of the operation locates ${of[0]}` };
  }
  const found = readingOf(judging, look);
  if ("unknown" in found) return found;
  const { reading, index } = found;
  const term = look.shows;
  const at = placeOf(extraction.projections, term)?.at ?? [];
  const valueWhen = (when: "before" | "after") => ({
    read: valueRead(extraction.projections, term, reading[when][0]),
    noisy: noisyAbove(noise, ["readings", index, when, 0, "body", ...at]),
  });
  const before = valueWhen("before");
  const after = valueWhen("after");
  if (!("value" in before.read)) {
    return {
      unknown: "absent" in before.read ? "the instance is absent" : before.read.unknown,
    };
  }
  if (!("value" in after.read)) {
    return {
      unknown: "absent" in after.read ? "the instance is absent" : after.read.unknown,
    };
  }
  if (before.noisy || after.noisy) return { unknown: `${of.join(".")} is noise` };
  const was = before.read.value;
  const is = after.read.value;
  const [kind, by] = change;
  const expected =
    kind === "set"
      ? by
      : typeof was === "number" && typeof by === "number"
        ? was + (kind === "plus" ? by : -by)
        : undefined;
  if (expected === undefined) return { unknown: `${of.join(".")} is not a number` };
  return deepEqual(is, expected)
    ? { holds: true }
    : {
        holds: false,
        why: `${of.join(".")} went from ${JSON.stringify(was)} to ${JSON.stringify(is)}`,
      };
}

function thenHolds(judging: Judging, then: Then): Held {
  if (then === "nothing-changes") return nothingChanges(judging);
  if ("says" in then) return { unknown: "declared in a sentence" };
  const parts: readonly Held[] = [
    ...Object.entries(then.fact ?? {}).map(([name, expected]): Held => {
      const after = factAt(judging, name, "after");
      if ("unknown" in after) return { unknown: `"${name}": ${after.unknown}` };
      return after.truth === expected
        ? { holds: true }
        : { holds: false, why: `"${name}" is ${after.truth} after` };
    }),
    ...(then.field ?? []).map((field) => fieldChanges(judging, field)),
  ];
  if (parts.length === 0) return { unknown: "nothing is said to change" };
  return (
    parts.find((p) => "holds" in p && !p.holds) ??
    parts.find((p) => "unknown" in p) ?? { holds: true }
  );
}

// accepted, its condition true before, what it says is seen between the readings
export function effectVerdict(
  judging: Judging,
  { rule, when, then }: Effect,
): RuleVerdict {
  const outcome = outcomeOf(judging);
  if (outcome === "refused") return { rule, verdict: "not-exercised", reason: "refused" };
  if (outcome === "neither") {
    return {
      rule,
      verdict: "unjudged",
      reason: `answered ${judging.played.act.response.status}`,
    };
  }
  if (Array.isArray(when) && when[0] === "given") {
    if (!Object.hasOwn(judging.played.act.call.with, when[1])) {
      return { rule, verdict: "not-exercised", reason: `"${when[1]}" is not given` };
    }
  } else if (when !== undefined) {
    const [name, wanted] = typeof when === "string" ? [when, true] : [when[1], false];
    const before = factAt(judging, name, "before");
    if ("unknown" in before) return { rule, verdict: "unjudged", reason: before.unknown };
    if (before.truth !== wanted) {
      return {
        rule,
        verdict: "not-exercised",
        reason: "its condition did not hold before",
      };
    }
  }
  const held = thenHolds(judging, then);
  if ("unknown" in held) return { rule, verdict: "unjudged", reason: held.unknown };
  return held.holds
    ? { rule, verdict: "verified" }
    : { rule, verdict: "refuted", reason: held.why ?? "it did not change as said" };
}
