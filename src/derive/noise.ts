import type {
  Disagreement,
  Noise,
  Place,
  PlayedScenario,
  TargetResponse,
} from "../shapes/scenario.ts";
import { deepEqual, differingPlaces } from "./json.ts";

// [arrange, 0, response] r0,  [arrange, 1, response] r1,  [act, response] r
export function answersOf({
  arrange,
  act,
}: PlayedScenario): readonly { readonly at: Place; readonly response: TargetResponse }[] {
  return [
    ...arrange.map(({ response }, i) => ({ at: ["arrange", i, "response"], response })),
    { at: ["act", "response"], response: act.response },
  ];
}

export type Marked =
  | { readonly stable: true; readonly noise: readonly Noise[] }
  | { readonly stable: false; readonly differences: readonly Disagreement[] };

// Two executions of one scenario. A status that differs makes it unstable; every other
// place where the bodies differ is noise, in classes of values equal in both:
//   {a: "t1", b: "t1", c: "u1"}  {a: "t2", b: "t2", c: "u2"}  ->  a 1, b 1, c 2
export function markNoise(first: PlayedScenario, second: PlayedScenario): Marked {
  const pairs = answersOf(first).flatMap(({ at, response }, i) => {
    const other = answersOf(second)[i];
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
