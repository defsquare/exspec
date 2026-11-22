import type { Gap, SourceFile } from "../shapes/extraction.ts";
import { readYaml, roleScenarioSchema } from "../shapes/roles.ts";
import type { State } from "../shapes/state.ts";
import { checkStructuresFile } from "./check-reader.ts";
import { checkStates, partsOfPath } from "./check-states.ts";
import {
  evidenceAt,
  folderOf,
  interfacesOf,
  judgementsIn,
  judgeTaskOf,
  textAt,
} from "./roles-files.ts";
import type { Path, Unreached } from "./steps-from-states.ts";

// the states whose path is a scenario of an interface: {state: s, path: f/a}, f -> [it]
export const statesWithPathIn = (states: readonly State[], name: string) =>
  states.filter(({ path }) => partsOfPath(path).operation === name);

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
//   {state: s, path: f/a}, a judged holds      -> {state: s, path: {state: s, steps: […]}}
//   {state: s, path: f/a}, a not judged        -> {state: s, awaited: true, why: "its path f/a is not judged yet"}
//   {state: s, path: f/a}, a judged not-shown  -> {state: s, awaited: false, why: "its path f/a is judged not-shown"}
function pathsRead(
  files: readonly SourceFile[],
  states: readonly State[],
): readonly ({ readonly state: string; readonly path: Path } | Unreached)[] {
  const interfaces = interfacesOf(files) ?? [];
  return states.map(({ state, path }) => {
    const { operation: name, slug } = partsOfPath(path);
    const awaited = { state, awaited: true, why: `its path ${path} is not judged yet` };
    const bound = interfaces.find(({ interface: one }) => one === name);
    const file = `${folderOf(name)}/scenarios/${slug}.yaml`;
    const text = textAt(files, file);
    const read =
      text === undefined ? undefined : readYaml(file, text, roleScenarioSchema);
    if (bound === undefined || read === undefined || !("value" in read)) return awaited;
    const steps = read.value.steps.flatMap((step) => ("state" in step ? [] : [step]));
    if (steps.length < read.value.steps.length) {
      return {
        state,
        awaited: false,
        why: `its path ${path}: a path does not start from a state`,
      };
    }
    const evidence = evidenceAt(files, name, slug);
    const of =
      evidence === undefined
        ? undefined
        : judgeTaskOf(files, bound, [{ slug, evidence }])?.of.get(slug);
    const judged = judgementsIn(files, name).find(({ scenario }) => scenario === slug);
    if (of === undefined || judged === undefined || judged.of !== of) return awaited;
    return judged.verdict === "holds"
      ? { state, path: { state, steps } }
      : { state, awaited: false, why: `its path ${path} is judged ${judged.verdict}` };
  });
}

// The states that are reached, the others with why. A state whose path is refuted, or
// starts from a state, is a finding of states.yaml; one whose path is not judged yet, a gap.
export function pathsOf(
  files: readonly SourceFile[],
  states: readonly State[] = statesOf(files).states,
): {
  readonly paths: readonly Path[];
  readonly unreached: readonly Unreached[];
  readonly findings: readonly string[];
  readonly gaps: readonly (Gap & { readonly kind: "state-not-reached" })[];
} {
  const read = pathsRead(files, states);
  const unreached = read.flatMap((one) => ("why" in one ? [one] : []));
  return {
    paths: read.flatMap((one) => ("path" in one ? [one.path] : [])),
    unreached,
    findings: unreached.flatMap(({ state, awaited, why }) =>
      awaited ? [] : [`states.yaml: ${state}: ${why}`],
    ),
    gaps: unreached.flatMap(({ state, awaited, why }) =>
      awaited ? [{ kind: "state-not-reached" as const, name: state, message: why }] : [],
    ),
  };
}
