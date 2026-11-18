import type { Evidence, RoleScenario } from "../shapes/roles.ts";
import type { Difference, TargetResponse } from "../shapes/scenario.ts";
import { compareAnswers } from "./compare.ts";
import { fillHoles } from "./holes.ts";
import { deepEqual } from "./json.ts";
import { type Answer, type Marked, markAnswers } from "./noise.ts";

// An unplayable exchange answered nothing:
//   [{call, response: r0}, {call, unplayable: "…"}, …] -> [{at: [exchanges, 0, response], response: r0}]
export function evidenceAnswers({ exchanges }: Evidence): readonly Answer[] {
  return exchanges.flatMap((exchange, i): readonly Answer[] =>
    "response" in exchange
      ? [{ at: ["exchanges", i, "response"], response: exchange.response }]
      : [],
  );
}

// Two copies are comparable when they have as many exchanges, all of them played;
// otherwise the one place that differs is their counts — of exchanges when those differ,
// of answers when an exchange could not be played:
//   3 exchanges and 2 -> {first: 3, second: 2};  2 and 2, one unplayable -> {first: 2, second: 1}
function counts(
  a: Evidence,
  b: Evidence,
): { readonly first: number; readonly second: number } | undefined {
  if (a.exchanges.length !== b.exchanges.length) {
    return { first: a.exchanges.length, second: b.exchanges.length };
  }
  const first = evidenceAnswers(a).length;
  const second = evidenceAnswers(b).length;
  return first === a.exchanges.length && second === first ? undefined : { first, second };
}

// markNoise for two copies of an evidence, its places starting at the exchange:
//   2 exchanges and 1 -> {stable: false, differences: [{at: [exchanges], first: 2, second: 1}]}
export function noiseBetween(first: Evidence, second: Evidence): Marked {
  const unequal = counts(first, second);
  return unequal === undefined
    ? markAnswers(evidenceAnswers(first), evidenceAnswers(second))
    : { stable: false, differences: [{ at: ["exchanges"], ...unequal }] };
}

// an evidence played twice: its noise is known, even when there is none
export type EvidenceReference = Evidence & {
  readonly noise: NonNullable<Evidence["noise"]>;
};

// compareWithReference for an evidence that has its noise:
//   2 exchanges against 1 -> [{at: [exchanges], expected: 2, actual: 1}]
export function compareEvidence(
  reference: EvidenceReference,
  played: Evidence,
): readonly Difference[] {
  const unequal = counts(reference, played);
  return unequal === undefined
    ? compareAnswers({
        reference: evidenceAnswers(reference),
        noise: reference.noise,
        played: evidenceAnswers(played),
        root: played,
      })
    : [{ at: ["exchanges"], expected: unequal.first, actual: unequal.second }];
}

// An evidence is of a scenario as written when it names its rule and, step by step, sent
// the step's request — holes filled from the evidence's own answers, as playSteps does:
//   step {name: m, path: "/a"}, {path: "/b/{{m.body.id}}"}; m answered {body: {id: 7}}
//   -> the second exchange must have sent "/b/7"
export function isAsWritten(scenario: RoleScenario, evidence: Evidence): boolean {
  if (evidence.rule !== scenario.rule) return false;
  if (evidence.exchanges.length !== scenario.steps.length) return false;
  const answers = new Map<string, TargetResponse>();
  return scenario.steps.every(({ when, as, name, request }, i) => {
    const exchange = evidence.exchanges[i];
    if (exchange === undefined || !("response" in exchange)) return false;
    if (exchange.when !== when || exchange.as !== as) return false;
    const filled = fillHoles(request, answers);
    if ("unplayable" in filled || !deepEqual(filled.sent, exchange.request)) return false;
    if (name !== undefined) answers.set(name, exchange.response);
    return true;
  });
}
