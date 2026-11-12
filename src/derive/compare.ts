import type { Difference, PlayedScenario, Reference } from "../shapes/scenario.ts";
import { deepEqual, differingPlaces, valueAt } from "./json.ts";
import { answersOf } from "./noise.ts";

// Outside the noise, a played copy answers what its reference answered. At a noisy place
// any value goes, but the places of one class answer one value among themselves:
//   noise a 1, b 1   played {a: "t3", b: "t3"} -> [];   {a: "t3", b: "t4"} -> [b: t3, t4]
export function compareWithReference(
  reference: Reference,
  played: PlayedScenario,
): readonly Difference[] {
  if (reference.arrange.length !== played.arrange.length) {
    return [
      {
        at: ["arrange"],
        expected: reference.arrange.length,
        actual: played.arrange.length,
      },
    ];
  }
  const noisy = new Set(reference.noise.map(({ at }) => JSON.stringify(at)));
  const isNoisy = (at: readonly unknown[]) => noisy.has(JSON.stringify(at));
  const answered = answersOf(played);
  const outside = answersOf(reference).flatMap(({ at, response }, i) => {
    const actual = answered[i]?.response;
    if (actual === undefined) return [];
    return [
      ...(response.status === actual.status
        ? []
        : [{ at: [...at, "status"], expected: response.status, actual: actual.status }]),
      ...differingPlaces(response.body, actual.body, [...at, "body"], isNoisy).map(
        ({ at, a, b }) => ({ at, expected: a, actual: b }),
      ),
    ];
  });
  const firstOfClass = new Map(
    reference.noise.toReversed().map(({ at, class: c }) => [c, at]),
  );
  const withinClasses = reference.noise.flatMap(({ at, class: c }) => {
    const first = firstOfClass.get(c);
    if (first === undefined || first === at) return [];
    const expected = valueAt(played, first);
    const actual = valueAt(played, at);
    return expected === undefined || actual === undefined || deepEqual(expected, actual)
      ? []
      : [{ at, expected, actual }];
  });
  return [...outside, ...withinClasses];
}
