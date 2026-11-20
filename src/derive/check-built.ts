import {
  type RoleScenario,
  type Rules,
  readYaml,
  roleScenarioSchema,
  type ServiceStep,
  type Step,
} from "../shapes/roles.ts";
import type { Service } from "../shapes/service.ts";
import type { Interface } from "../shapes/target.ts";
import { holesOf, holesOfGiven } from "./holes.ts";

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

// the names a scenario may be of: the rules of the reading, the names under its common,
// and "answers"
export const ownersOf = (rules: Rules): readonly string[] => [
  ...[...rules.requires, ...rules.effects].map(({ rule }) => rule),
  ...rules.common,
  "answers",
];

// What is wrong with a service step: its service, its condition, what it gives, its when
//   {service: s, is: refuses, with: {}}, s's refuses takes {address: string}
//   -> ['"refuses" of "s" takes "address", which is not given']
function checkServiceStep(
  { when, service, is, with: given = {} }: ServiceStep,
  services: readonly Service[],
): readonly string[] {
  const named = services.find((one) => one.service === service);
  if (named === undefined) {
    const known = services.map((one) => one.service).join(", ") || "none";
    return [`"${service}" is not a service (${known})`];
  }
  const condition = named.conditions.find((one) => one.condition === is);
  const takes = Object.keys(condition?.takes ?? {});
  return [
    ...(when === "arrange"
      ? []
      : [`a step that gives "${service}" a condition is an arrange step, not ${when}`]),
    ...(condition === undefined
      ? [
          `"${is}" is not a condition of "${service}" (${named.conditions.map((one) => one.condition).join(", ") || "none"})`,
        ]
      : [
          ...takes
            .filter((key) => !Object.hasOwn(given, key))
            .map((key) => `"${is}" of "${service}" takes "${key}", which is not given`),
          ...Object.keys(given)
            .filter((key) => !takes.includes(key))
            .map((key) => `"${is}" of "${service}" takes no "${key}"`),
        ]),
  ];
}

// the holes a step cites and those inside a longer string, wherever they are
const holesOfStep = (step: Step) =>
  "service" in step ? holesOfGiven(step.with) : holesOf(step.request);

function checkScenario(
  { rule, steps }: RoleScenario,
  { slug, bound, rules, actors, services }: Checking & { readonly slug: string },
): readonly string[] {
  const calls = steps.flatMap((step) =>
    "request" in step && step.when === "call" ? [step] : [],
  );
  const call = calls[0];
  return [
    ...(ownersOf(rules).includes(rule)
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
    ...steps.flatMap((step, i) => {
      const before = new Set(
        steps.slice(0, i).flatMap((one) => ("name" in one ? (one.name ?? []) : [])),
      );
      const { cited, misplaced } = holesOfStep(step);
      return [
        ...("service" in step
          ? checkServiceStep(step, services).map((finding) => `step ${i + 1}: ${finding}`)
          : step.as === null || actors.includes(step.as)
            ? []
            : [`step ${i + 1}: "${step.as}" is not an actor (${actors.join(", ")})`]),
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
  // the services of exspec/services/ that pass their check
  readonly services: readonly Service[];
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
