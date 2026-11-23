import type { CommonTrigger, Trigger } from "../shapes/bindings.ts";
import type { Common, Evidence, Requirement, Rules } from "../shapes/roles.ts";
import type { Interface, Target } from "../shapes/target.ts";
import { acceptedStatuses } from "./accepted.ts";

const yaml = (value: unknown) => Bun.YAML.stringify(value, null, 2).trimEnd();

// {rule: a, on: x, fact: f, otherwise: o, source: s} -> {rule: a, fact: f, otherwise: o}
// the input a requirement is on is for the reader of the page, not for the judge
function requirementForJudge({ rule, when, service, fact, otherwise }: Requirement) {
  return {
    rule,
    ...(when === undefined ? {} : { when }),
    ...(service === undefined ? {} : { service }),
    fact,
    otherwise,
  };
}

// {rule: a, fact: f, source: s} -> {rule: a, fact: f}
function withoutSource<T extends { readonly source: string }>({
  source: _,
  ...entry
}: T): Omit<T, "source"> {
  return entry;
}

// How this operation leaves on this target: the statuses it is accepted with, and how each
// refusal is answered — as its trigger says it, else as the shared trigger says it
//   {accepted: [200], refuses: {r: {status: 404, body: "…"}}}
function wireOf(
  requirements: readonly { readonly otherwise: string }[],
  trigger: Trigger,
  commonTrigger: CommonTrigger | undefined,
) {
  const shared = commonTrigger?.refuses ?? {};
  return {
    accepted: acceptedStatuses(trigger),
    refuses: {
      ...Object.fromEntries(
        requirements.flatMap(({ otherwise }) => {
          const wire = shared[otherwise];
          return wire === undefined ? [] : [[otherwise, wire]];
        }),
      ),
      ...trigger.refuses,
    },
  };
}

// the rule a recording names, as the judge reads it: a requirement, an effect, or what an
// accepted call answers — its sentence only, never the structure the reader named
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
          ...(effect.service === undefined ? {} : { service: effect.service }),
          says: effect.says,
        },
      };
}

// The text a judge is given for one operation, and per recording the hash of its part:
//   the operation, what the system runs with, every requirement once, how this target
//   answers it, then per recording (slug order)
//   its name, its rule, the reader's doubts about it, its exchanges; after it, per state
//   whose path it is (state order), the recording again with the state's sentence:
//     {recording: "state:s", state: "reading the a shows …", exchanges: […]}
// Nothing of the builder's words — situation, reached, step names — nor the hints. A
// state's hash is of the shared text, its sentence and the exchanges: a state renamed
// stales nothing.
export function judgeTask({
  bound,
  common,
  commonTrigger,
  runsWith,
  rules,
  trigger,
  recordings,
  states,
}: {
  readonly bound: Interface;
  readonly common: Common | undefined;
  readonly commonTrigger: CommonTrigger | undefined;
  // what target.yaml says the system runs with
  readonly runsWith: Target["runs-with"];
  readonly rules: Rules;
  readonly trigger: Trigger;
  readonly recordings: readonly { readonly slug: string; readonly evidence: Evidence }[];
  readonly states: readonly {
    readonly state: string;
    readonly seen: string;
    readonly slug: string;
  }[];
}): {
  readonly text: string;
  readonly of: ReadonlyMap<string, string>;
  readonly ofStates: ReadonlyMap<string, string>;
} {
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
      states: states
        .filter((s) => s.slug === slug)
        .sort((a, b) => (a.state < b.state ? -1 : 1))
        .map(({ state, seen }) => ({
          state,
          hashed: yaml({ state: seen, exchanges }),
          text: yaml({ recording: `state:${state}`, state: seen, exchanges }),
        })),
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
    ...(runsWith ?? []).map(({ setting }) => `- ${setting}`),
    "",
    "Every requirement of the operation:",
    yaml(requirements),
    "",
    "How this target answers the operation:",
    yaml(wireOf(requirements, trigger, commonTrigger)),
  ].join("\n");
  const texts = parts.flatMap(({ text, states }) => [
    text,
    ...states.map(({ text }) => text),
  ]);
  const text = [
    shared,
    "",
    `${texts.length} recordings, in this order:`,
    ...texts.flatMap((text) => ["", "---", text]),
  ].join("\n");
  const hashOf = (part: string) =>
    new Bun.CryptoHasher("sha256").update(`${shared}\n---\n${part}`).digest("hex");
  return {
    text,
    of: new Map(parts.map(({ slug, text }) => [slug, hashOf(text)])),
    ofStates: new Map(
      parts.flatMap(({ states }) =>
        states.map(({ state, hashed }) => [state, hashOf(hashed)] as const),
      ),
    ),
  };
}
