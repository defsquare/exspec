import type { FactBlocks } from "../shapes/event.ts";
import type { Extraction } from "../shapes/extraction.ts";
import { factAt } from "./judging.ts";
import { judgeScenario, otherExplanations } from "./verdict.ts";

// "the fact has no condition" -> "it has no condition";
// "the reading answered 401" -> "its reading answered 401"
const whyOf = (unknown: string) =>
  unknown
    .replace(/^the fact has no condition$/, "it has no condition")
    .replace(/^the reading answered/, "its reading answered");

// Each fact unknown before the judged call, and the rules of the references it leaves
// ambiguous or unjudged, the fact blocking most rules first.
export function factBlocks(extraction: Extraction): readonly FactBlocks[] {
  const blocked = new Map<string, { why: string; rules: Set<string> }>();
  for (const { reference } of extraction.references) {
    const name = reference.act.call.operation;
    const operation = extraction.operations.find(
      (o) => o.operation.operation === name,
    )?.operation;
    const trigger = extraction.triggers.find((t) => t.operation === name);
    const verdicts = judgeScenario({
      played: reference,
      noise: reference.noise,
      extraction,
    });
    if (operation === undefined || trigger === undefined || verdicts === undefined)
      continue;
    const judging = {
      played: reference,
      noise: reference.noise,
      extraction,
      operation,
      trigger,
    };
    for (const { rule, verdict } of verdicts.rules) {
      const own = operation.requires.find((r) => r.rule === rule)?.fact;
      const when = operation.effects.find((e) => e.rule === rule)?.when;
      const facts =
        verdict === "ambiguous"
          ? otherExplanations(judging, rule).flatMap(({ unknown }) =>
              unknown ? [unknown] : [],
            )
          : verdict === "unjudged"
            ? [
                own ??
                  (typeof when === "string"
                    ? when
                    : when?.[0] === "not"
                      ? when[1]
                      : undefined),
              ]
            : [];
      for (const fact of facts) {
        if (fact === undefined) continue;
        const before = factAt(judging, fact, "before");
        if (!("unknown" in before)) continue;
        const entry = blocked.get(fact) ?? {
          why: whyOf(before.unknown),
          rules: new Set(),
        };
        entry.rules.add(`${name}/${rule}`);
        blocked.set(fact, entry);
      }
    }
  }
  return [...blocked]
    .map(
      ([fact, { why, rules }]): FactBlocks => ({
        type: "fact-blocks",
        fact,
        why,
        rules: [...rules].sort(),
      }),
    )
    .sort((a, b) => b.rules.length - a.rules.length || (a.fact < b.fact ? -1 : 1));
}
