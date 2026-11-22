import { triggerSchema } from "../shapes/bindings.ts";
import type { SourceFile } from "../shapes/extraction.ts";
import {
  type Evidence,
  evidenceSchema,
  type Judgement,
  judgementsSchema,
  readYaml,
  roleScenarioSchema,
  rulesSchema,
} from "../shapes/roles.ts";
import { type Interface, interfacesFileSchema } from "../shapes/target.ts";
import { type Callable, callableOf } from "./callables.ts";
import { checkBuilt, ownersOf } from "./check-built.ts";
import {
  checkCommon,
  checkProtocol,
  checkRulesAndHints,
  checkStructuresFile,
} from "./check-reader.ts";
import { servicesIn } from "./check-service.ts";
import { checkStates } from "./check-states.ts";
import { checkTrigger } from "./check-trigger.ts";
import { judgeTask } from "./judge-task.ts";
import type { Path } from "./steps-from-states.ts";

// "delete-item" -> "roles/delete-item"
export const folderOf = (name: string) => `roles/${name}`;

export const textAt = (files: readonly SourceFile[], path: string) =>
  files.find((file) => file.path === path)?.text;

// the YAML files directly in a folder, by slug: "roles/i/scenarios" -> [{slug: "a", text}]
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
  const file = `${folderOf(name)}/evidence/${slug}.yaml`;
  const text = textAt(files, file);
  const read = text === undefined ? undefined : readYaml(file, text, evidenceSchema);
  return read !== undefined && "value" in read ? read.value : undefined;
}

// the target's interfaces, undefined when interfaces.yaml does not parse
function interfacesOf(files: readonly SourceFile[]): readonly Interface[] | undefined {
  const text = textAt(files, "interfaces.yaml");
  const read =
    text === undefined
      ? undefined
      : readYaml("interfaces.yaml", text, interfacesFileSchema);
  return read !== undefined && "value" in read ? read.value.interfaces : undefined;
}

const interfacesNamed = (files: readonly SourceFile[]) =>
  interfacesOf(files)?.map(({ interface: name }) => name);

// The operations a step may call: one per interface whose rules.yaml and trigger.yaml
// parse, checked or not — a step calls what a reading declares.
export function callablesOf(files: readonly SourceFile[]): readonly Callable[] {
  const { structures = [] } = checkStructuresFile(textAt(files, "structures.yaml"));
  return (interfacesOf(files) ?? []).flatMap((bound) => {
    const folder = folderOf(bound.interface);
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
  const { common } = checkCommon(textAt(files, "roles/common.yaml"));
  const { protocol } = checkProtocol(textAt(files, "roles/protocol.yaml"));
  const { structures } = checkStructuresFile(textAt(files, "structures.yaml"));
  const folder = folderOf(name);
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
    return { common, protocol, findings: read.findings };
  const { trigger, findings } = checkTrigger({
    name,
    interfaces: interfacesNamed(files),
    rules: parsed.value,
    common,
    protocol,
    text: textAt(files, `${folder}/trigger.yaml`),
  });
  return read.rules === undefined || trigger === undefined
    ? { common, protocol, findings: [...read.findings, ...findings] }
    : { common, protocol, rules: read.rules, trigger, findings };
}

// The actors its scenarios name, for a check told without the target: the credentials are
// written by the seed, and a fresh checkout has none. The finding "is not an actor" never
// fires then, and nothing is lost: a step as an actor the target lacks is played unplayable,
//   step {as: c, …}  ->  exchange {as: c, unplayable: 'no credentials for "c"'}
// and an evidence with an unplayable exchange is never of its scenario as written.
// An actor the credentials held when the evidence was taken, and no longer hold: the
// evidence stands, it is what the target answered then; a replay tells the step unplayable.
export function actorsNamed(
  written: readonly { readonly slug: string; readonly text: string }[],
): readonly string[] {
  return written.flatMap(({ slug, text }) => {
    const read = readYaml(slug, text, roleScenarioSchema);
    return "value" in read
      ? read.value.steps.flatMap((step) => ("as" in step ? (step.as ?? []) : []))
      : [];
  });
}

// what the builder wrote for one interface, checked against the actors given, or those its
// scenarios name; undefined when its reading does not pass. callables: those of the files,
// given when they are already computed
export function builtOf(
  files: readonly SourceFile[],
  bound: Interface,
  {
    actors,
    callables = callablesOf(files),
  }: {
    readonly actors?: readonly string[] | undefined;
    readonly callables?: readonly Callable[];
  } = {},
) {
  const { rules, trigger } = readerFilesOf(files, bound.interface);
  if (rules === undefined || trigger === undefined) return undefined;
  const written = slugsIn(files, `${folderOf(bound.interface)}/scenarios`);
  const read = pathsRead(files);
  const built = checkBuilt({
    bound,
    rules,
    protocol: trigger.protocol ?? [],
    actors: actors ?? actorsNamed(written),
    services: servicesIn(files),
    callables,
    paths: read.flatMap((one) => ("path" in one ? [one.path] : [])),
    files: written,
  });
  // why a state its scenarios start from is not reached, once each
  const cited = statesNamed(written);
  return {
    ...built,
    findings: [
      ...built.findings,
      ...read.flatMap((one) =>
        "finding" in one && cited.includes(one.state) ? [one.finding] : [],
      ),
    ],
  };
}

// the states the scenarios start from
function statesNamed(
  written: readonly { readonly slug: string; readonly text: string }[],
): readonly string[] {
  return written.flatMap(({ slug, text }) => {
    const read = readYaml(slug, text, roleScenarioSchema);
    return "value" in read
      ? read.value.steps.flatMap((step) => ("state" in step ? [step.state] : []))
      : [];
  });
}

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

// Each state of states.yaml, with its path when it is reached: the scenario its entry names
// parses, starts from no state, and its judgement holds on the text its judge is given today.
//   {state: s, path: f/a}, a judged holds  -> {state: s, path: {state: s, steps: […]}}
//   {state: s, path: f/a}, a not judged    -> {state: s, finding: "states.yaml: s: …"}
function pathsRead(
  files: readonly SourceFile[],
): readonly (
  | { readonly state: string; readonly path: Path }
  | { readonly state: string; readonly finding: string }
)[] {
  const interfaces = interfacesOf(files) ?? [];
  return statesOf(files).states.map(({ state, path }) => {
    const [name = "", slug = ""] = path.split("/");
    const unreached = {
      state,
      finding: `states.yaml: ${state}: its path ${path} is not judged to hold`,
    };
    const bound = interfaces.find(({ interface: one }) => one === name);
    const file = `${folderOf(name)}/scenarios/${slug}.yaml`;
    const text = textAt(files, file);
    const read =
      text === undefined ? undefined : readYaml(file, text, roleScenarioSchema);
    if (bound === undefined || read === undefined || !("value" in read)) return unreached;
    const steps = read.value.steps.flatMap((step) => ("state" in step ? [] : [step]));
    if (steps.length < read.value.steps.length) {
      return {
        state,
        finding: `states.yaml: ${state}: its path ${path}: a path does not start from a state`,
      };
    }
    const evidence = evidenceAt(files, name, slug);
    const of =
      evidence === undefined
        ? undefined
        : judgeTaskOf(files, bound, [{ slug, evidence }])?.of.get(slug);
    const judged = judgementsIn(files, name).find(({ scenario }) => scenario === slug);
    return of !== undefined && judged?.verdict === "holds" && judged.of === of
      ? { state, path: { state, steps } }
      : unreached;
  });
}

// the states that are reached, and why each other is not
export function pathsOf(files: readonly SourceFile[]): {
  readonly paths: readonly Path[];
  readonly findings: readonly string[];
} {
  const read = pathsRead(files);
  return {
    paths: read.flatMap((one) => ("path" in one ? [one.path] : [])),
    findings: read.flatMap((one) => ("finding" in one ? [one.finding] : [])),
  };
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
  const owners = ownersOf(rules, trigger.protocol ?? []);
  return slugsIn(files, `${folderOf(name)}/scenarios`)
    .map(({ slug }) => slug)
    .filter((slug) => !owners.some((rule) => slug.startsWith(rule)));
}

// the judgements of a folder as they are written, none when there is no file or it does
// not parse
export function judgementsIn(
  files: readonly SourceFile[],
  name: string,
): readonly Judgement[] {
  const file = `${folderOf(name)}/judgements.yaml`;
  const text = textAt(files, file);
  const read = text === undefined ? undefined : readYaml(file, text, judgementsSchema);
  return read !== undefined && "value" in read ? read.value.judgements : [];
}

// every evidence file of a folder, read: [{slug: "a", evidence}, {slug: "b", findings}]
export function recordingsRead(
  files: readonly SourceFile[],
  name: string,
): readonly (
  | { readonly slug: string; readonly evidence: Evidence }
  | { readonly slug: string; readonly findings: readonly string[] }
)[] {
  return slugsIn(files, `${folderOf(name)}/evidence`).map(({ slug, text }) => {
    const read = readYaml(`evidence/${slug}.yaml`, text, evidenceSchema);
    return "value" in read ? { slug, evidence: read.value } : { slug, ...read };
  });
}

// the task of one interface's judge on these recordings, when its reading passes and there
// is one at least
export function judgeTaskOf(
  files: readonly SourceFile[],
  bound: Interface,
  recordings: readonly { readonly slug: string; readonly evidence: Evidence }[],
) {
  const { common, protocol, rules, trigger } = readerFilesOf(files, bound.interface);
  if (rules === undefined || trigger === undefined || recordings.length === 0)
    return undefined;
  const task = judgeTask({ bound, common, protocol, rules, trigger, recordings });
  return { ...task, recordings };
}
