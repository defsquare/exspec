import type { BindingVerdict, RuleVerdict } from "../shapes/event.ts";
import type { Extraction } from "../shapes/extraction.ts";
import type { Noise, PlayedScenario } from "../shapes/scenario.ts";
import { bindingVerdict } from "./binding-verdict.ts";
import { effectVerdict } from "./effect-verdict.ts";
import { factAt, type Judging, outcomeOf } from "./judging.ts";
import { inputRulesOf, violationOf } from "./violations.ts";

// The other rules that could have refused with the status observed: a required fact
// false or unknown before, an input violated; a refusal the trigger does not translate
// could answer any status.
//   ["email-free: the fact is unknown"]
function otherExplanations(judging: Judging, except: string): readonly string[] {
  const { played, extraction, operation, trigger } = judging;
  const observed = played.act.response.status;
  const could = (refusal: string) => {
    const translated = trigger.refuses[refusal];
    return translated === undefined || translated.status === observed;
  };
  return [
    ...operation.requires
      .filter(({ rule, otherwise }) => rule !== except && could(otherwise))
      .flatMap(({ rule, fact }) => {
        const before = factAt(judging, fact, "before");
        if ("unknown" in before) return [`${rule}: the fact is unknown`];
        return before.truth ? [] : [`${rule}: the fact was false`];
      }),
    ...inputRulesOf(operation)
      .filter(
        (rule) =>
          rule.rule !== except &&
          could(rule.otherwise) &&
          violationOf({
            call: played.act.call,
            operation,
            structures: extraction.structures,
            rule,
          }) === "present",
      )
      .map(({ rule }) => `${rule}: its input is violated`),
  ];
}

// what is left once the rule's situation is reached: refused and nothing else explains
// it, or accepted
function refusalVerdict(judging: Judging, rule: string, accepted: string): RuleVerdict {
  const outcome = outcomeOf(judging);
  if (outcome === "accepted") return { rule, verdict: "refuted", reason: accepted };
  if (outcome === "neither") {
    return {
      rule,
      verdict: "unjudged",
      reason: `answered ${judging.played.act.response.status}`,
    };
  }
  const others = otherExplanations(judging, rule);
  return others.length === 0
    ? { rule, verdict: "verified" }
    : { rule, verdict: "ambiguous", reason: others.join("; ") };
}

function ruleVerdict(judging: Judging, rule: string): RuleVerdict {
  const { played, extraction, operation } = judging;
  const required = operation.requires.find((r) => r.rule === rule);
  if (required !== undefined) {
    const before = factAt(judging, required.fact, "before");
    if ("unknown" in before) return { rule, verdict: "unjudged", reason: before.unknown };
    if (before.truth) {
      return { rule, verdict: "not-exercised", reason: "the fact held before" };
    }
    return refusalVerdict(judging, rule, "accepted where the fact was false");
  }
  const input = inputRulesOf(operation).find((r) => r.rule === rule);
  if (input !== undefined) {
    const violation = violationOf({
      call: played.act.call,
      operation,
      structures: extraction.structures,
      rule: input,
    });
    if (violation === "not-computed") {
      return { rule, verdict: "unjudged", reason: `${input.violates} is not computed` };
    }
    if (violation === "absent") {
      return { rule, verdict: "not-exercised", reason: "its input is not violated" };
    }
    return refusalVerdict(judging, rule, "accepted with its input violated");
  }
  const effect = operation.effects.find((e) => e.rule === rule);
  if (effect !== undefined) return effectVerdict(judging, effect);
  return { rule, verdict: "unjudged", reason: "not a rule of the operation" };
}

// What one played copy says of the rules it proves and of its operation's trigger;
// nothing when the operation or its trigger is not declared.
export function judgeScenario({
  played,
  noise,
  extraction,
}: {
  readonly played: PlayedScenario;
  readonly noise: readonly Noise[];
  readonly extraction: Extraction;
}):
  | { readonly rules: readonly RuleVerdict[]; readonly binding: BindingVerdict }
  | undefined {
  const name = played.act.call.operation;
  const operation = extraction.operations.find(
    (o) => o.operation.operation === name,
  )?.operation;
  const trigger = extraction.triggers.find((t) => t.operation === name);
  if (operation === undefined || trigger === undefined) return undefined;
  const judging = { played, noise, extraction, operation, trigger };
  return {
    rules: played.proves.map((rule) => ruleVerdict(judging, rule)),
    binding: bindingVerdict(judging),
  };
}
