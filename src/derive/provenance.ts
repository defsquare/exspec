import type { BindingJudged, RuleJudged } from "../shapes/event.ts";
import type { Extraction } from "../shapes/extraction.ts";
import { rulesOf } from "./operation.ts";
import { judgeScenario } from "./verdict.ts";

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// refuted if one refutes, else verified if one verifies, else the third word
function provenanceOf<T extends string>(
  verdicts: readonly string[],
  otherwise: T,
): "refuted" | "verified" | T {
  if (verdicts.includes("refuted")) return "refuted";
  return verdicts.includes("verified") ? "verified" : otherwise;
}

// Every rule and every trigger, judged by the references only, in name order.
export function judgeExtraction(extraction: Extraction): {
  readonly rules: readonly RuleJudged[];
  readonly bindings: readonly BindingJudged[];
} {
  const { operations, triggers, scenarios, references } = extraction;
  const judged = references.map(({ path, reference }) => ({
    path,
    operation: reference.act.call.operation,
    verdicts: judgeScenario({ played: reference, noise: reference.noise, extraction }),
  }));
  const rules = operations
    .flatMap(({ operation }) =>
      rulesOf(operation).map((rule): RuleJudged => {
        const name = operation.operation;
        const proving = (proves: readonly string[], of: string) =>
          of === name && proves.includes(rule);
        const by = judged.flatMap(({ path, operation: of, verdicts }) => {
          const verdict = verdicts?.rules.find((v) => v.rule === rule);
          if (verdict === undefined || of !== name) return [];
          const { verdict: said, reason } = verdict;
          return [
            {
              scenario: path,
              verdict: said,
              ...(reason === undefined ? {} : { reason }),
            },
          ];
        });
        const provenance = provenanceOf(
          by.map(({ verdict }) => verdict),
          "declared-only",
        );
        const why = !scenarios.some(({ scenario }) =>
          proving(scenario.proves, scenario.act.call.operation),
        )
          ? "no scenario proves it"
          : !references.some(({ reference }) =>
                proving(reference.proves, reference.act.call.operation),
              )
            ? "no reference yet"
            : undefined;
        return {
          type: "rule-judged",
          operation: name,
          rule,
          provenance,
          ...(by.length === 0 && why !== undefined ? { reason: why } : {}),
          by,
        };
      }),
    )
    .sort((a, b) => compare(`${a.operation}/${a.rule}`, `${b.operation}/${b.rule}`));
  const bindings = triggers
    .map(({ trigger, operation }): BindingJudged => {
      const by = judged.flatMap(({ path, operation: of, verdicts }) =>
        verdicts === undefined || of !== operation
          ? []
          : [{ scenario: path, ...verdicts.binding }],
      );
      return {
        type: "binding-judged",
        trigger,
        provenance: provenanceOf(
          by.map(({ verdict }) => verdict),
          "declared-only",
        ),
        by,
      };
    })
    .sort((a, b) => compare(a.trigger, b.trigger));
  return { rules, bindings };
}

// how many claims stand in each provenance
export function countJudged({ rules, bindings }: ReturnType<typeof judgeExtraction>) {
  const count = (provenances: readonly string[], name: string) =>
    provenances.filter((p) => p === name).length;
  const ofRules = rules.map(({ provenance }) => provenance);
  const ofBindings = bindings.map(({ provenance }) => provenance);
  return {
    rules: {
      verified: count(ofRules, "verified"),
      refuted: count(ofRules, "refuted"),
      "declared-only": count(ofRules, "declared-only"),
    },
    bindings: {
      verified: count(ofBindings, "verified"),
      refuted: count(ofBindings, "refuted"),
      "declared-only": count(ofBindings, "declared-only"),
    },
  };
}
