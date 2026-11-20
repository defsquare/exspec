import type {
  Disagreement,
  Noise,
  Place,
  PlayedScenario,
  TargetResponse,
} from "../shapes/scenario.ts";
import { deepEqual, differingPlaces } from "./json.ts";

export type Answer = { readonly at: Place; readonly response: TargetResponse };

// [arrange, 0, response] r0,  [readings, 0, before, 0] b,  [act, response] r,
// [readings, 0, after, 0] a;  an unreadable entry answered nothing
export function answersOf({
  arrange,
  act,
  readings = [],
}: PlayedScenario): readonly Answer[] {
  const read = (when: "before" | "after") =>
    readings.flatMap((reading, i) =>
      reading[when].flatMap((entry, j): readonly Answer[] =>
        "unreadable" in entry ? [] : [{ at: ["readings", i, when, j], response: entry }],
      ),
    );
  return [
    ...arrange.map(({ response }, i) => ({ at: ["arrange", i, "response"], response })),
    ...read("before"),
    { at: ["act", "response"], response: act.response },
    ...read("after"),
  ];
}

export type Marked =
  | { readonly stable: true; readonly noise: readonly Noise[] }
  | { readonly stable: false; readonly differences: readonly Disagreement[] };

// A value at its place, and what is done with it when two copies differ there:
//   equal   the copies must agree on it
//   walked  its places that differ are noise, or differences outside the noise
//   kept    its places that differ are noise, and never a difference of their own
export type Valued = {
  readonly at: Place;
  readonly value: unknown;
  readonly kind: "equal" | "walked" | "kept";
};

// [a] {status: 200, body: b} -> [a, status] 200 equal,  [a, body] b walked
export function answerPlaces(answers: readonly Answer[]): readonly Valued[] {
  return answers.flatMap(({ at, response: { status, body } }): readonly Valued[] => [
    { at: [...at, "status"], value: status, kind: "equal" },
    { at: [...at, "body"], value: body, kind: "walked" },
  ]);
}

// Two executions of one scenario. A status that differs makes it unstable; every other
// place where the bodies differ is noise, in classes of values equal in both:
//   {a: "t1", b: "t1", c: "u1"}  {a: "t2", b: "t2", c: "u2"}  ->  a 1, b 1, c 2
export function markNoise(first: PlayedScenario, second: PlayedScenario): Marked {
  return markPlaces(answerPlaces(answersOf(first)), answerPlaces(answersOf(second)));
}

// The same, on the places of two copies, paired by position.
export function markPlaces(first: readonly Valued[], second: readonly Valued[]): Marked {
  const pairs = first.flatMap(({ at, value, kind }, i) => {
    const other = second[i];
    return other ? [{ at, kind, first: value, second: other.value }] : [];
  });
  const differences = pairs
    .filter(({ kind, first, second }) => kind === "equal" && !deepEqual(first, second))
    .map(({ at, first, second }) => ({ at, first, second }));
  if (differences.length > 0) return { stable: false, differences };
  const places = pairs
    .filter(({ kind }) => kind !== "equal")
    .flatMap(({ at, first, second }) => differingPlaces(first, second, at));
  const alike = (p: (typeof places)[number], q: (typeof places)[number]) =>
    deepEqual(p.a, q.a) && deepEqual(p.b, q.b);
  const firsts = places.filter((p, i) => places.findIndex((q) => alike(p, q)) === i);
  return {
    stable: true,
    noise: places.map((p) => ({
      at: p.at,
      class: firsts.findIndex((q) => alike(p, q)) + 1,
    })),
  };
}
