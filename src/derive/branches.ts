import type { MetJudgement, RuleJudgement, Rules } from "../shapes/roles.ts";

// one way an accepted call was seen to end: the conditional effects met on it, those the
// judge could not tell, the status it ended in, the recordings that ended so
type Outcome = {
  readonly met: readonly string[];
  readonly unsure: readonly string[];
  readonly status: number;
  readonly scenarios: readonly string[];
};

export type Branches = {
  readonly outcomes: readonly Outcome[];
  readonly forks: readonly string[];
  readonly neverMet: readonly string[];
  readonly accepted: readonly { readonly status: number; readonly seen: boolean }[];
};

// The branches of an operation as its accepted recordings show them: nothing of it is stored.
//   effects [{rule: a}, {rule: r, when: w}, {rule: s, when: v}, {rule: t, when: u}]
//   accepted [204, 202]
//   x 204, met {r: yes, s: no, t: no};  y 204, met {r: yes, s: no, t: no}
//   -> {outcomes: [{met: [r], unsure: [], status: 204, scenarios: [x, y]}],
//       forks: [], neverMet: [s, t], accepted: [{status: 204, seen: true}, {status: 202, seen: false}]}
// A recording's own rule counts as met when its rule judgement says the situation was
// reached: one not judged on the conditions yet still stands on an outcome. Two effects
// never met on one outcome are not said to exclude each other: a rule has one scenario,
// and what was not seen together is the sample's.
export function branchesOf({
  rules,
  accepted,
  recordings,
  judgements,
  met,
}: {
  readonly rules: Rules;
  readonly accepted: readonly number[];
  // the accepted recordings; status: what their call was accepted with
  readonly recordings: readonly {
    readonly slug: string;
    readonly rule: string;
    readonly status: number;
  }[];
  readonly judgements: readonly RuleJudgement[];
  readonly met: readonly MetJudgement[];
}): Branches {
  const conditional = rules.effects.flatMap(({ rule, when }) =>
    when === undefined ? [] : [rule],
  );
  const inOrder = (names: readonly string[]) =>
    conditional.filter((rule) => names.includes(rule));
  const seen = recordings
    .toSorted((a, b) => (a.slug < b.slug ? -1 : 1))
    .flatMap(({ slug, rule, status }) => {
      const said = Object.entries(met.find((j) => j.scenario === slug)?.met ?? {});
      const own =
        conditional.includes(rule) &&
        judgements.some(
          (j) => j.scenario === slug && j.rule === rule && j.situation === "yes",
        );
      if (said.length === 0 && !own) return [];
      const yes = [
        ...said.flatMap(([name, value]) => (value === "yes" ? [name] : [])),
        ...(own ? [rule] : []),
      ];
      const unsure = said.flatMap(([name, value]) =>
        value === "unsure" && !yes.includes(name) ? [name] : [],
      );
      return [{ slug, status, met: inOrder(yes), unsure: inOrder(unsure) }];
    });
  const keyOf = ({
    met,
    status,
  }: {
    readonly met: readonly string[];
    readonly status: number;
  }) => JSON.stringify([met, status]);
  const outcomes = [...new Set(seen.map(keyOf))].flatMap((key): readonly Outcome[] => {
    const on = seen.filter((one) => keyOf(one) === key);
    const [first] = on;
    return first === undefined
      ? []
      : [
          {
            met: first.met,
            unsure: inOrder(on.flatMap(({ unsure }) => unsure)),
            status: first.status,
            scenarios: on.map(({ slug }) => slug),
          },
        ];
  });
  const metOn = (rule: string) => outcomes.filter(({ met }) => met.includes(rule)).length;
  return {
    outcomes,
    forks: conditional.filter((rule) => metOn(rule) > 0 && metOn(rule) < outcomes.length),
    neverMet: conditional.filter((rule) => metOn(rule) === 0),
    accepted: accepted.map((status) => ({
      status,
      seen: outcomes.some((outcome) => outcome.status === status),
    })),
  };
}
