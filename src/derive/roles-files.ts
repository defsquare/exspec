import { triggerSchema } from "../shapes/bindings.ts";
import type { SourceFile } from "../shapes/extraction.ts";
import {
  type Evidence,
  evidenceSchema,
  judgementsSchema,
  type RuleJudgement,
  readYaml,
  roleScenarioSchema,
  rulesSchema,
  type StateJudgement,
  type Step,
  type WrittenStep,
} from "../shapes/roles.ts";
import { type Interface, interfacesFileSchema, targetSchema } from "../shapes/target.ts";
import { type Callable, callableOf } from "./callables.ts";
import { ownersOf } from "./check-built.ts";
import {
  checkCommon,
  checkCommonTrigger,
  checkRulesAndHints,
  checkStructuresFile,
} from "./check-reader.ts";
import { servicesIn } from "./check-service.ts";
import { checkStates, partsOfPath } from "./check-states.ts";
import { checkTrigger } from "./check-trigger.ts";
import { judgeTask } from "./judge-task.ts";

// "delete-item" -> "operations/delete-item"
export const operationFolderOf = (name: string) => `operations/${name}`;

// what is of no operation, at the root of the extraction
export const commonFile = "common.yaml";
export const commonTriggerFile = "common-trigger.yaml";

export const textAt = (files: readonly SourceFile[], path: string) =>
  files.find((file) => file.path === path)?.text;

// the YAML files directly in a folder, by slug: "operations/i/scenarios" -> [{slug: "a", text}]
export function slugsIn(
  files: readonly SourceFile[],
  folder: string,
): readonly { readonly slug: string; readonly text: string }[] {
  return files.flatMap(({ path, text }) => {
    const slug = path.startsWith(`${folder}/`)
      ? /^([^/]+)\.yaml$/.exec(path.slice(folder.length + 1))?.[1]
      : undefined;
    return slug === undefined ? [] : [{ slug, text }];
  });
}

// the evidence of a scenario, when it is there and parses
export function evidenceAt(
  files: readonly SourceFile[],
  name: string,
  slug: string,
): Evidence | undefined {
  const file = `${operationFolderOf(name)}/evidence/${slug}.yaml`;
  const text = textAt(files, file);
  const read = text === undefined ? undefined : readYaml(file, text, evidenceSchema);
  return read !== undefined && "value" in read ? read.value : undefined;
}

// interfaces.yaml as it parses, undefined when it does not
function describedOf(files: readonly SourceFile[]) {
  const text = textAt(files, "interfaces.yaml");
  const read =
    text === undefined
      ? undefined
      : readYaml("interfaces.yaml", text, interfacesFileSchema);
  return read !== undefined && "value" in read ? read.value : undefined;
}

// the target's interfaces, undefined when interfaces.yaml does not parse
export const interfacesOf = (
  files: readonly SourceFile[],
): readonly Interface[] | undefined => describedOf(files)?.interfaces;

const interfacesNamed = (files: readonly SourceFile[]) =>
  interfacesOf(files)?.map(({ interface: name }) => name);

// The operations a step may call: one per interface whose rules.yaml and trigger.yaml
// parse, checked or not — a step calls what a reading declares.
export function callablesOf(files: readonly SourceFile[]): readonly Callable[] {
  const { structures = [] } = checkStructuresFile(textAt(files, "structures.yaml"));
  return (interfacesOf(files) ?? []).flatMap((bound) => {
    const folder = operationFolderOf(bound.interface);
    const rulesText = textAt(files, `${folder}/rules.yaml`);
    const triggerText = textAt(files, `${folder}/trigger.yaml`);
    const rules =
      rulesText === undefined
        ? undefined
        : readYaml("rules.yaml", rulesText, rulesSchema);
    const trigger =
      triggerText === undefined
        ? undefined
        : readYaml("trigger.yaml", triggerText, triggerSchema);
    return rules !== undefined &&
      "value" in rules &&
      trigger !== undefined &&
      "value" in trigger
      ? [callableOf({ rules: rules.value, trigger: trigger.value, bound, structures })]
      : [];
  });
}

// what a reader wrote for one interface — its rules, its hints, its trigger — checked
// against what the common reader and the reader of the structures wrote; rules and trigger
// only when every check passes. The trigger is checked as soon as rules.yaml parses: the
// reader is told all there is to fix at once.
export function readerFilesOf(files: readonly SourceFile[], name: string) {
  const { common } = checkCommon(textAt(files, commonFile));
  const { commonTrigger } = checkCommonTrigger(textAt(files, commonTriggerFile), common);
  const { structures } = checkStructuresFile(textAt(files, "structures.yaml"));
  const folder = operationFolderOf(name);
  const rulesText = textAt(files, `${folder}/rules.yaml`);
  const read = checkRulesAndHints({
    operation: name,
    common,
    structures,
    rules: rulesText,
    hints: textAt(files, `${folder}/hints.yaml`),
    services: servicesIn(files).map(({ service }) => service),
  });
  const parsed =
    rulesText === undefined ? undefined : readYaml("rules.yaml", rulesText, rulesSchema);
  if (parsed === undefined || !("value" in parsed))
    return { common, commonTrigger, findings: read.findings };
  const described = describedOf(files);
  const { trigger, findings } = checkTrigger({
    name,
    interfaces: interfacesNamed(files),
    bound: described?.interfaces.find((one) => one.interface === name),
    schemas: described?.schemas,
    rules: parsed.value,
    common,
    commonTrigger,
    text: textAt(files, `${folder}/trigger.yaml`),
  });
  return read.rules === undefined || trigger === undefined
    ? { common, commonTrigger, findings: [...read.findings, ...findings] }
    : { common, commonTrigger, rules: read.rules, trigger, findings };
}

// The actors its scenarios name, for a check told without the target: the credentials are
// written by the seed, and a fresh checkout has none. The finding "is not an actor" never
// fires then, and nothing is lost: a step as an actor the target lacks is played unplayable,
//   step {as: c, …}  ->  exchange {as: c, unplayable: 'no credentials for "c"'}
// and an evidence with an unplayable exchange is never of its scenario as written.
// An actor the credentials held when the evidence was taken, and no longer hold: the
// evidence stands, it is what the target answered then; a replay tells the step unplayable.
// paths: a scenario that starts from a state is played by its path's actors too.
export function actorsNamed(
  written: readonly { readonly slug: string; readonly text: string }[],
  paths: readonly { readonly steps: readonly Step[] }[],
): readonly string[] {
  const named = (steps: readonly WrittenStep[]) =>
    steps.flatMap((step) => ("as" in step ? (step.as ?? []) : []));
  return [
    ...written.flatMap(({ slug, text }) => {
      const read = readYaml(slug, text, roleScenarioSchema);
      return "value" in read ? named(read.value.steps) : [];
    }),
    ...paths.flatMap(({ steps }) => named(steps)),
  ];
}

// The scenario files of an interface that no rule of its reading can own. A file is named
// after its rule and a builder writes files, it removes none: one left from a reading whose
// rules were named otherwise can never pass its check.
//   rules a, b; scenarios a.yaml, a-2.yaml, c.yaml -> ["c"]
export function unownedScenarios(
  files: readonly SourceFile[],
  name: string,
): readonly string[] {
  const { rules, trigger } = readerFilesOf(files, name);
  if (rules === undefined || trigger === undefined) return [];
  const owners = ownersOf(rules);
  return slugsIn(files, `${operationFolderOf(name)}/scenarios`)
    .map(({ slug }) => slug)
    .filter((slug) => !owners.some((rule) => slug.startsWith(rule)));
}

// the judgements of a folder as they are written, none when there is no file or it does
// not parse
function judgementsRead(files: readonly SourceFile[], name: string) {
  const file = `${operationFolderOf(name)}/judgements.yaml`;
  const text = textAt(files, file);
  const read = text === undefined ? undefined : readYaml(file, text, judgementsSchema);
  return read !== undefined && "value" in read ? read.value.judgements : [];
}

// the judgements of scenarios on their rules: a state's judgement is no scenario's
export const judgementsIn = (
  files: readonly SourceFile[],
  name: string,
): readonly RuleJudgement[] =>
  judgementsRead(files, name).flatMap((judged) => ("rule" in judged ? [judged] : []));

// the judgements of states' sentences on their paths
export const stateJudgementsIn = (
  files: readonly SourceFile[],
  name: string,
): readonly StateJudgement[] =>
  judgementsRead(files, name).flatMap((judged) => ("state" in judged ? [judged] : []));

// the states as written, with the findings of their entries
export function statesOf(files: readonly SourceFile[]) {
  const interfaces = interfacesOf(files) ?? [];
  const { structures = [] } = checkStructuresFile(textAt(files, "structures.yaml"));
  return checkStates({
    text: textAt(files, "states.yaml"),
    structures: structures.map(({ structure }) => structure),
    interfaces: interfaces.map(({ interface: name }) => name),
  });
}

// every evidence file of a folder, read: [{slug: "a", evidence}, {slug: "b", findings}]
export function recordingsRead(
  files: readonly SourceFile[],
  name: string,
): readonly (
  | { readonly slug: string; readonly evidence: Evidence }
  | { readonly slug: string; readonly findings: readonly string[] }
)[] {
  return slugsIn(files, `${operationFolderOf(name)}/evidence`).map(({ slug, text }) => {
    const read = readYaml(`evidence/${slug}.yaml`, text, evidenceSchema);
    return "value" in read ? { slug, evidence: read.value } : { slug, ...read };
  });
}

// what target.yaml says the system runs with; nothing when it does not parse
function runsWithOf(files: readonly SourceFile[]) {
  const text = textAt(files, "target.yaml");
  const read =
    text === undefined ? undefined : readYaml("target.yaml", text, targetSchema);
  return read !== undefined && "value" in read ? read.value["runs-with"] : undefined;
}

// the task of one interface's judge on these recordings, when its reading passes and there
// is one at least; each state whose path is one of them is judged on it too:
//   {state: s, path: f/a}, a given -> states: [{state: s, seen: "…", slug: a}]
export function judgeTaskOf(
  files: readonly SourceFile[],
  bound: Interface,
  recordings: readonly { readonly slug: string; readonly evidence: Evidence }[],
) {
  const { common, commonTrigger, rules, trigger } = readerFilesOf(files, bound.interface);
  if (rules === undefined || trigger === undefined || recordings.length === 0)
    return undefined;
  const states = statesOf(files).states.flatMap(({ state, seen, path }) => {
    const { operation, slug } = partsOfPath(path);
    return operation === bound.interface && recordings.some((r) => r.slug === slug)
      ? [{ state, seen, slug }]
      : [];
  });
  const task = judgeTask({
    bound,
    common,
    commonTrigger,
    runsWith: runsWithOf(files),
    rules,
    trigger,
    recordings,
    states,
  });
  return { ...task, recordings, states };
}
