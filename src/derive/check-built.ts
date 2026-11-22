import {
  type PlayableScenario,
  type Rules,
  readYaml,
  roleScenarioSchema,
  type ServiceStep,
  type Step,
  type StepCall,
} from "../shapes/roles.ts";
import type { Service } from "../shapes/service.ts";
import type { Interface } from "../shapes/target.ts";
import type { Callable } from "./callables.ts";
import { flowYaml } from "./flow-yaml.ts";
import { holesOf, holesOfGiven } from "./holes.ts";
import { sentOfCall } from "./sent-of-call.ts";
import { stepsAsCalls } from "./steps-as-calls.ts";
import { type Path, stepsFromStates, type Unreached } from "./steps-from-states.ts";

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
// those under its trigger's protocol, and "answers"
export const ownersOf = (
  rules: Rules,
  protocol: readonly string[],
): readonly string[] => [
  ...[...rules.requires, ...rules.effects].map(({ rule }) => rule),
  ...rules.common,
  ...protocol,
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

// What is wrong with a call step: its operation, the inputs it gives, where they go
//   {operation: f, with: {z: 1}}, f takes x, y -> ['"f" takes no "z" (x, y)']
function checkCallStep(
  { operation, with: given }: StepCall,
  callables: readonly Callable[],
): readonly string[] {
  const callable = callables.find((one) => one.operation === operation);
  if (callable === undefined) return [`no reading declares the operation "${operation}"`];
  const takes = Object.keys(callable.takes);
  const unknown = Object.keys(given)
    .filter((input) => !takes.includes(input))
    .map(
      (input) => `"${operation}" takes no "${input}" (${takes.join(", ") || "nothing"})`,
    );
  const unplaced = callable.unplaced
    .filter(({ input }) => Object.hasOwn(given, input))
    .map(({ input, why }) => `"${input}" cannot be sent: ${why}`);
  if (unknown.length > 0 || unplaced.length > 0) return [...unknown, ...unplaced];
  const sent = sentOfCall({
    call: { operation, with: given },
    places: callable.places,
    bound: callable.bound,
  });
  return "refused" in sent ? [sent.refused] : [];
}

// What is wrong with a hole naming a call step: it reads a field of the structure the
// call's operation answers, which has to be one
//   {{s.body.id}}, s a call to f answering S {id, name}
//   -> ['{{s.body.id}} reads no field of the S "s" answers, a call to "f": …']
function checkHoleOnCall(hole: string, callable: Callable): readonly string[] {
  const [name = "", field] = hole.split(".");
  const { operation, structure, fields, answer } = callable;
  if ("none" in answer) {
    return [
      `{{${hole}}} names "${name}", a call to "${operation}", which answers no single structure: ${answer.none}`,
    ];
  }
  return field === undefined || fields === undefined || fields.includes(field)
    ? []
    : [
        `{{${hole}}} reads no field of the ${structure} "${name}" answers, a call to "${operation}": a hole on a call reads a field of what it answers, not the answer on the wire — ${fields.join(", ")}`,
      ];
}

// the holes a step cites and those inside a longer string, wherever they are
const holesOfStep = (step: Step) =>
  "service" in step
    ? holesOfGiven(step.with)
    : "call" in step
      ? holesOfGiven(step.call.with)
      : holesOf(step.request);

// a scenario its state steps replaced: the holes' checks read the path's steps, a finding
// numbers the step as written (from: the position each step played comes from); one said
// twice of a path's steps is said once
function checkScenario(
  { rule, steps }: PlayableScenario,
  {
    slug,
    from,
    bound,
    rules,
    protocol,
    actors,
    services,
    callables,
  }: Checking & { readonly slug: string; readonly from: readonly number[] },
): readonly string[] {
  const at = (i: number) => from[i] ?? i + 1;
  const calls = steps.flatMap((step) =>
    !("service" in step) && step.when === "call" ? [step] : [],
  );
  const call = calls[0];
  const request = call !== undefined && "request" in call ? call.request : undefined;
  const called = call !== undefined && "call" in call ? call.call.operation : undefined;
  // each step named before, when it is a call: what its operation is
  const callOf = (name: string, before: readonly Step[]) => {
    const named = before.find((one) => "name" in one && one.name === name);
    return named !== undefined && "call" in named
      ? callables.find(({ operation }) => operation === named.call.operation)
      : undefined;
  };
  const findings = [
    ...(ownersOf(rules, protocol).includes(rule)
      ? []
      : [
          `"${rule}" is not a rule of rules.yaml, nor a name under its common or under its trigger's protocol, nor "answers"`,
        ]),
    ...(slug.startsWith(rule) ? [] : [`the file's name does not start with "${rule}"`]),
    ...(calls.length === 1 ? [] : [`${calls.length} call steps, where one is expected`]),
    ...(request === undefined || request.method === bound.method
      ? []
      : [`the call is a ${request.method}, the operation a ${bound.method}`]),
    ...(request === undefined || pathMatches(bound.pattern, request.path)
      ? []
      : [`the call's path ${request.path} does not match ${bound.pattern}`]),
    ...(called === undefined || called === rules.operation
      ? []
      : [
          `the call is to "${called}", the operation under trial is "${rules.operation}"`,
        ]),
    ...steps.flatMap((step, i) => {
      const before = new Set(
        steps.slice(0, i).flatMap((one) => ("name" in one ? (one.name ?? []) : [])),
      );
      const { cited, holes, misplaced } = holesOfStep(step);
      const earlier = steps.slice(0, i);
      return [
        ...("service" in step
          ? checkServiceStep(step, services).map((finding) => `step ${at(i)}: ${finding}`)
          : step.as === null || actors.includes(step.as)
            ? []
            : [`step ${at(i)}: "${step.as}" is not an actor (${actors.join(", ")})`]),
        ...("call" in step
          ? checkCallStep(step.call, callables).map(
              (finding) => `step ${at(i)}: ${finding}`,
            )
          : []),
        ...[...new Set(holes)].flatMap((hole) => {
          const callable = callOf(hole.split(".")[0] ?? "", earlier);
          return callable === undefined
            ? []
            : checkHoleOnCall(hole, callable).map(
                (finding) => `step ${at(i)}: ${finding}`,
              );
        }),
        ...cited
          .filter((name) => !before.has(name))
          .map(
            (name) => `step ${at(i)}: a hole cites "${name}", no step named before it`,
          ),
        ...misplaced.map(
          (place) =>
            `step ${at(i)}: ${place} holds a hole inside a longer string; a hole outside the path is a whole string`,
        ),
      ];
    }),
    // a request a call says exactly is written as that call, whatever the rule proved
    ...stepsAsCalls(steps, callables).flatMap((one, i) =>
      one !== undefined && "call" in one
        ? [`step ${at(i)} is the call ${flowYaml(one.call)}: write it as a call`]
        : [],
    ),
  ];
  return [...new Set(findings)];
}

type Checking = {
  readonly bound: Interface;
  readonly rules: Rules;
  // the names under its trigger's protocol
  readonly protocol: readonly string[];
  // the names of the credentials
  readonly actors: readonly string[];
  // the services of exspec/services/ that pass their check
  readonly services: readonly Service[];
  // the operations a step may call
  readonly callables: readonly Callable[];
};

// What a builder wrote, checked before it is played: each scenario file, then the folder.
// files: [{slug: "exists", text}] for scenarios/exists.yaml; paths: the states reached;
// unreached: the others, with why. A scenario comes back its state steps replaced; one
// whose state steps cannot be replaced is told by those findings alone, and still
// exercises its rule.
export function checkBuilt(
  checking: Checking & {
    readonly paths: readonly Path[];
    readonly unreached: readonly Unreached[];
    readonly files: readonly { readonly slug: string; readonly text: string }[];
  },
): {
  readonly scenarios: readonly {
    readonly slug: string;
    readonly scenario: PlayableScenario;
  }[];
  readonly findings: readonly string[];
} {
  const { files, rules, protocol, paths, unreached } = checking;
  const read = files.map(({ slug, text }) => {
    const file = `scenarios/${slug}.yaml`;
    const parsed = readYaml(file, text, roleScenarioSchema);
    if (!("value" in parsed)) return { slug, findings: parsed.findings };
    const { rule } = parsed.value;
    const replaced = stepsFromStates(parsed.value.steps, paths, unreached);
    if ("findings" in replaced) {
      return {
        slug,
        rule,
        findings: replaced.findings.map((finding) => `${file}: ${finding}`),
      };
    }
    const scenario = { ...parsed.value, steps: replaced.steps };
    return {
      slug,
      rule,
      scenario,
      findings: checkScenario(scenario, { ...checking, slug, from: replaced.from }).map(
        (finding) => `${file}: ${finding}`,
      ),
    };
  });
  const scenarios = read.flatMap(({ slug, scenario }) =>
    scenario === undefined ? [] : [{ slug, scenario }],
  );
  const exercised = new Set(read.flatMap(({ rule }) => rule ?? []));
  const unexercised = [...rules.requires, ...rules.effects]
    .map(({ rule }) => rule)
    .concat(rules.common, protocol)
    .filter((rule) => !exercised.has(rule))
    .map((rule) => `no scenario for the rule "${rule}"`);
  return {
    scenarios,
    findings: [...read.flatMap(({ findings }) => findings), ...unexercised],
  };
}
