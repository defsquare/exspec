import type { Projection } from "../shapes/bindings.ts";
import type { ReadingEntry } from "../shapes/scenario.ts";
import type { Fact } from "../shapes/specification.ts";
import { deepEqual, valueAt } from "./json.ts";
import { type Located, locating } from "./reading.ts";

export type Judged = { readonly truth: boolean } | { readonly unknown: string };

// where a term's value stands in the body its projection answers: [s] + [b] -> [s, b]
export function placeOf(
  projections: readonly Projection[],
  { structure, where, field = [] }: Located,
): { readonly at: readonly string[]; readonly absent?: number | undefined } | undefined {
  const found = locating(projections, structure, Object.keys(where));
  return found && { at: [...found.at, ...field], absent: found.projection.absent };
}

export const isSuccess = (status: number) => status >= 200 && status < 300;

// A value read: on a success, the value at its place; on the projection's absent status,
// no instance; else why there is none. A success whose body lacks the place (a mistyped
// at or field) tells nothing:
//   {s: {b: 1}}, [s, b] -> 1;   {s: {}}, [s, b] -> unknown;   {t: {}}, [s] -> unknown
export function valueRead(
  projections: readonly Projection[],
  term: Located,
  entry: ReadingEntry | undefined,
):
  | { readonly value: unknown }
  | { readonly absent: true }
  | { readonly unknown: string } {
  if (entry === undefined) return { unknown: "it was not read" };
  if ("unreadable" in entry) return { unknown: entry.unreadable };
  const place = placeOf(projections, term);
  if (place === undefined) return { unknown: `no projection locates ${term.structure}` };
  if (isSuccess(entry.status)) {
    const value = valueAt(entry.body, place.at);
    return value === undefined
      ? { unknown: "the value is not in the answer" }
      : { value };
  }
  if (entry.status === place.absent) return { absent: true };
  return { unknown: `the reading answered ${entry.status}` };
}

// {caller: signed-in} holds for an actor; [exists] on a success, not on the projection's
// absent status; [eq, v] compares the value on a success. Several terms: their
// conjunction, false winning over unknown; no term: unknown.
type Judging = {
  readonly fact: Fact | undefined;
  readonly entries: readonly ReadingEntry[];
  readonly as: string | null;
  readonly projections: readonly Projection[];
};

export function judgeFact({ fact, entries, as, projections }: Judging): Judged {
  if (fact === undefined) return { unknown: "the fact is not declared" };
  if (fact.condition.length === 0) return { unknown: "the fact has no condition" };
  let read = 0;
  const terms = fact.condition.map((term): Judged => {
    if (!("structure" in term)) return { truth: as !== null };
    const got = valueRead(projections, term, entries[read++]);
    if ("unknown" in got) return got;
    if ("absent" in got) return { truth: false };
    const [kind] = term["must-be"];
    if (kind === "exists") return { truth: true };
    return { truth: deepEqual(got.value, term["must-be"][1]) };
  });
  return (
    terms.find((t) => "truth" in t && !t.truth) ??
    terms.find((t) => "unknown" in t) ?? { truth: true }
  );
}

export function truthOf(judging: Judging): boolean | "unknown" {
  const judged = judgeFact(judging);
  return "truth" in judged ? judged.truth : "unknown";
}
