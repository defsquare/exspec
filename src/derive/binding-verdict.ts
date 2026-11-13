import type { BindingVerdict, RuleVerdict } from "../shapes/event.ts";
import { isMap } from "./json.ts";
import type { Judging } from "./judging.ts";
import { outcomeOf } from "./judging.ts";
import { inputRulesOf } from "./violations.ts";

// {a: [{b: 1}]}, [a, each, b] -> true; an empty list shows nothing missing
function shown(value: unknown, [key, ...rest]: readonly string[]): boolean {
  if (key === undefined) return true;
  if (key === "each") return Array.isArray(value) && value.every((v) => shown(v, rest));
  return isMap(value) && Object.hasOwn(value, key) && shown(value[key], rest);
}

// An accepted answer shows what the trigger says where it says; a refusal has the status
// the trigger gives the refusal of each rule the scenario proves whose situation is
// established — verified or ambiguous: a rule not exercised or not judged says nothing of
// which refusal happened.
export function bindingVerdict(
  judging: Pick<Judging, "played" | "operation" | "trigger">,
  rules: readonly RuleVerdict[],
): BindingVerdict {
  const { played, operation, trigger } = judging;
  const { status, body } = played.act.response;
  const outcome = outcomeOf(judging);
  if (outcome === "neither") return { verdict: "refuted", observed: status };
  if (outcome === "accepted") {
    const missing = trigger.answers.shows.find(({ at }) => !shown(body, at));
    return missing === undefined
      ? { verdict: "verified" }
      : {
          verdict: "refuted",
          expected: `${missing.structure} shown at ${missing.at.join(".")}`,
          observed: status,
        };
  }
  const refusals = [...operation.requires, ...inputRulesOf(operation)]
    .filter(({ rule }) =>
      rules.some(
        (r) => r.rule === rule && (r.verdict === "verified" || r.verdict === "ambiguous"),
      ),
    )
    .map(({ otherwise }) => otherwise);
  if (refusals.length === 0) return { verdict: "not-exercised" };
  const wrong = refusals.find((refusal) => trigger.refuses[refusal]?.status !== status);
  if (wrong === undefined) return { verdict: "verified" };
  const declared = trigger.refuses[wrong]?.status;
  return {
    verdict: "refuted",
    expected:
      declared === undefined
        ? `${wrong} not translated`
        : `${wrong} declared ${declared}`,
    observed: status,
  };
}
