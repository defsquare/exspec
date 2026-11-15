import type { Common, Evidence, Requirement, Rules } from "../shapes/roles.ts";
import type { Interface } from "../shapes/target.ts";

const yaml = (value: unknown) => Bun.YAML.stringify(value, null, 2).trimEnd();

// {rule: a, on: x, fact: f, otherwise: o, source: s} -> {rule: a, fact: f, otherwise: o}
// the input a requirement is on is for the reader of the page, not for the judge
function requirementForJudge({ rule, when, fact, otherwise }: Requirement) {
  return { rule, ...(when === undefined ? {} : { when }), fact, otherwise };
}

// {rule: a, fact: f, source: s} -> {rule: a, fact: f}
function withoutSource<T extends { readonly source: string }>({
  source: _,
  ...entry
}: T): Omit<T, "source"> {
  return entry;
}

// the rule a recording names, as the judge reads it: a requirement, an effect, or what
// an accepted call answers — its sentence only, never the structure the reader named
function ruleEntry(rule: string, rules: Rules, common: Common | undefined) {
  const own = rules.requires.find((r) => r.rule === rule);
  if (own !== undefined) return { requirement: requirementForJudge(own) };
  const shared = rules.common.includes(rule)
    ? common?.rules.find((r) => r.rule === rule)
    : undefined;
  if (shared !== undefined) return { requirement: withoutSource(shared) };
  if (rule === "answers") return { answers: rules.answers.says };
  const effect = rules.effects.find((r) => r.rule === rule);
  return effect === undefined
    ? { rule }
    : {
        effect: {
          rule,
          ...(effect.when === undefined ? {} : { when: effect.when }),
          says: effect.says,
        },
      };
}

// The text a judge is given for one operation, and per recording the hash of its part:
//   the operation, what the system runs with, every requirement once, then per recording
//   (slug order) its name, its rule, the reader's doubts about it, its exchanges.
// Nothing of the builder's words — situation, reached, step names — nor the hints.
export function judgeTask({
  bound,
  common,
  rules,
  recordings,
}: {
  readonly bound: Interface;
  readonly common: Common | undefined;
  readonly rules: Rules;
  readonly recordings: readonly { readonly slug: string; readonly evidence: Evidence }[];
}): { readonly text: string; readonly of: ReadonlyMap<string, string> } {
  const sorted = [...recordings].sort((a, b) => (a.slug < b.slug ? -1 : 1));
  const parts = sorted.map(({ slug, evidence: { rule, exchanges } }) => {
    const unsure = rules.unsure.filter((u) => u.rule === rule).map(({ what }) => what);
    return {
      slug,
      text: yaml({
        recording: slug,
        rule: ruleEntry(rule, rules, common),
        ...(unsure.length === 0 ? {} : { unsure }),
        exchanges,
      }),
    };
  });
  const requirements = [
    ...rules.requires.map(requirementForJudge),
    ...(common?.rules ?? [])
      .filter(({ rule }) => rules.common.includes(rule))
      .map(withoutSource),
  ];
  // what every recording is judged with: a requirement changed, and each judgement is stale
  const shared = [
    `The operation: ${bound.interface}, ${bound.method.toUpperCase()} ${bound.pattern}`,
    "",
    "What the system under trial runs with:",
    ...(common?.["runs-with"] ?? []).map(({ setting }) => `- ${setting}`),
    "",
    "Every requirement of the operation:",
    yaml(requirements),
  ].join("\n");
  const text = [
    shared,
    "",
    `${parts.length} recordings, in this order:`,
    ...parts.flatMap(({ text }) => ["", "---", text]),
  ].join("\n");
  const hashOf = (part: string) =>
    new Bun.CryptoHasher("sha256").update(`${shared}\n---\n${part}`).digest("hex");
  return { text, of: new Map(parts.map(({ slug, text }) => [slug, hashOf(text)])) };
}
