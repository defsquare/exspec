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

// Two executions of one scenario. A status that differs makes it unstable; every other
// place where the bodies differ is noise, in classes of values equal in both:
//   {a: "t1", b: "t1", c: "u1"}  {a: "t2", b: "t2", c: "u2"}  ->  a 1, b 1, c 2
export function markNoise(first: PlayedScenario, second: PlayedScenario): Marked {
  return markAnswers(answersOf(first), answersOf(second));
}

// The same, on the answers of two copies, paired by position.
export function markAnswers(first: readonly Answer[], second: readonly Answer[]): Marked {
  const pairs = first.flatMap(({ at, response }, i) => {
    const other = second[i];
    return other ? [{ at, first: response, second: other.response }] : [];
  });
  const differences = pairs
    .filter(({ first, second }) => first.status !== second.status)
    .map(({ at, first, second }) => ({
      at: [...at, "status"],
      first: first.status,
      second: second.status,
    }));
  if (differences.length > 0) return { stable: false, differences };
  const places = pairs.flatMap(({ at, first, second }) =>
    differingPlaces(first.body, second.body, [...at, "body"]),
  );
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
