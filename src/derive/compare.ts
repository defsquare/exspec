import type { Difference, Noise, PlayedScenario, Reference } from "../shapes/scenario.ts";
import { deepEqual, differingPlaces, valueAt } from "./json.ts";
import { answerPlaces, answersOf, type Valued } from "./noise.ts";

// Outside the noise, a played copy answers what its reference answered. At a noisy place
// any value goes, but the places of one class answer one value among themselves, and two
// classes two values:
//   noise a 1, b 1, c 2   played {a: "t3", b: "t3", c: "u3"} -> []
//                                {a: "t3", b: "t4", c: "u3"} -> [b: expected t3, got t4]
//                                {a: "t3", b: "t3", c: "t3"} -> [c: expected apart from a, got t3]
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
  const read = reference.readings?.length;
  if (read !== undefined && read !== (played.readings?.length ?? 0)) {
    return [{ at: ["readings"], expected: read, actual: played.readings?.length ?? 0 }];
  }
  return comparePlaces({
    reference: answerPlaces(answersOf(reference)),
    noise: reference.noise,
    played: answerPlaces(answersOf(played)),
    root: played,
  });
}

// The same, on the places of the two copies; root is the value the played places read in.
export function comparePlaces({
  reference,
  noise,
  played,
  root,
}: {
  readonly reference: readonly Valued[];
  readonly noise: readonly Noise[];
  readonly played: readonly Valued[];
  readonly root: unknown;
}): readonly Difference[] {
  const noisy = new Set(noise.map(({ at }) => JSON.stringify(at)));
  const isNoisy = (at: readonly unknown[]) => noisy.has(JSON.stringify(at));
  const outside = reference.flatMap(({ at, value, kind }, i) => {
    const other = played[i];
    if (other === undefined || kind === "kept") return [];
    const places =
      kind === "equal"
        ? deepEqual(value, other.value)
          ? []
          : [{ at, a: value, b: other.value }]
        : differingPlaces(value, other.value, at, isNoisy);
    return places.map(({ at, a, b }) => ({ at, expected: a, actual: b }));
  });
  const firstOfClass = new Map(noise.toReversed().map(({ at, class: c }) => [c, at]));
  const withinClasses = noise.flatMap(({ at, class: c }) => {
    const first = firstOfClass.get(c);
    if (first === undefined || first === at) return [];
    const expected = valueAt(root, first);
    const actual = valueAt(root, at);
    return expected === undefined || actual === undefined || deepEqual(expected, actual)
      ? []
      : [{ at, expected, actual }];
  });
  const firsts = [...firstOfClass.values()].toReversed();
  const betweenClasses = firsts.flatMap((at, i) => {
    const actual = valueAt(root, at);
    const same = firsts
      .slice(0, i)
      .find(
        (earlier) => actual !== undefined && deepEqual(valueAt(root, earlier), actual),
      );
    return same === undefined ? [] : [{ at, expected: { "apart from": same }, actual }];
  });
  return [...outside, ...withinClasses, ...betweenClasses];
}
