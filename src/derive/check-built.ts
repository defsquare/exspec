import {
  type RoleScenario,
  type Rules,
  readYaml,
  roleScenarioSchema,
} from "../shapes/roles.ts";
import type { Interface } from "../shapes/target.ts";
import { holesOf } from "./holes.ts";

// "/a/{id}/b" and "/a/7/b" or "/a/{{m.body.id}}/b" -> true; "/a/7" -> false
function pathMatches(pattern: string, path: string): boolean {
  const expected = pattern.split("/");
  const given = (path.split("?")[0] ?? "").split("/");
  return (
    expected.length === given.length &&
    expected.every((segment, i) =>
      /^\{[^{}]+\}$/.test(segment) ? given[i] !== "" : segment === given[i],
    )
  );
}

function checkScenario(
  { rule, steps }: RoleScenario,
  { slug, bound, rules, actors }: Checking & { readonly slug: string },
): readonly string[] {
  const named = [...rules.requires, ...rules.effects].map((r) => r.rule);
  const calls = steps.filter(({ when }) => when === "call");
  const call = calls[0];
  return [
    ...([...named, ...rules.common, "answers"].includes(rule)
      ? []
      : [
          `"${rule}" is not a rule of rules.yaml, nor a name under its common, nor "answers"`,
        ]),
    ...(slug.startsWith(rule) ? [] : [`the file's name does not start with "${rule}"`]),
    ...(calls.length === 1 ? [] : [`${calls.length} call steps, where one is expected`]),
    ...(call === undefined || call.request.method === bound.method
      ? []
      : [`the call is a ${call.request.method}, the operation a ${bound.method}`]),
    ...(call === undefined || pathMatches(bound.pattern, call.request.path)
      ? []
      : [`the call's path ${call.request.path} does not match ${bound.pattern}`]),
    ...steps.flatMap(({ as, request }, i) => {
      const before = new Set(steps.slice(0, i).flatMap(({ name }) => name ?? []));
      const { cited, misplaced } = holesOf(request);
      return [
        ...(as === null || actors.includes(as)
          ? []
          : [`step ${i + 1}: "${as}" is not an actor (${actors.join(", ")})`]),
        ...cited
          .filter((name) => !before.has(name))
          .map(
            (name) => `step ${i + 1}: a hole cites "${name}", no step named before it`,
          ),
        ...misplaced.map(
          (at) =>
            `step ${i + 1}: ${at} holds a hole inside a longer string; a hole outside the path is a whole string`,
        ),
      ];
    }),
  ];
}

type Checking = {
  readonly bound: Interface;
  readonly rules: Rules;
  // the names of the credentials
  readonly actors: readonly string[];
};

// What a builder wrote, checked before it is played: each scenario file, then the folder.
// files: [{slug: "exists", text}] for scenarios/exists.yaml
export function checkBuilt(
  checking: Checking & {
    readonly files: readonly { readonly slug: string; readonly text: string }[];
  },
): {
  readonly scenarios: readonly {
    readonly slug: string;
    readonly scenario: RoleScenario;
  }[];
  readonly findings: readonly string[];
} {
  const { files, rules } = checking;
  const read = files.map(({ slug, text }) => {
    const file = `scenarios/${slug}.yaml`;
    const parsed = readYaml(file, text, roleScenarioSchema);
    if (!("value" in parsed)) return { slug, findings: parsed.findings };
    return {
      slug,
      scenario: parsed.value,
      findings: checkScenario(parsed.value, { ...checking, slug }).map(
        (finding) => `${file}: ${finding}`,
      ),
    };
  });
  const scenarios = read.flatMap(({ slug, scenario }) =>
    scenario === undefined ? [] : [{ slug, scenario }],
  );
  const exercised = new Set(scenarios.map(({ scenario }) => scenario.rule));
  const unexercised = [...rules.requires, ...rules.effects]
    .map(({ rule }) => rule)
    .concat(rules.common)
    .filter((rule) => !exercised.has(rule))
    .map((rule) => `no scenario for the rule "${rule}"`);
  return {
    scenarios,
    findings: [...read.flatMap(({ findings }) => findings), ...unexercised],
  };
}
