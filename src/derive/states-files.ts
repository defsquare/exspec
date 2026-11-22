import type { Gap, SourceFile } from "../shapes/extraction.ts";
import { readYaml, roleScenarioSchema, type StateJudgement } from "../shapes/roles.ts";
import type { State } from "../shapes/state.ts";
import { partsOfPath } from "./check-states.ts";
import { isAsWritten } from "./evidence.ts";
import {
  callablesOf,
  evidenceAt,
  folderOf,
  interfacesOf,
  judgeTaskOf,
  stateJudgementsIn,
  statesOf,
  textAt,
} from "./roles-files.ts";
import type { Path, Unreached } from "./steps-from-states.ts";

// the states whose path is a scenario of an interface: {state: s, path: f/a}, f -> [it]
export const statesWithPathIn = (states: readonly State[], name: string) =>
  states.filter(({ path }) => partsOfPath(path).operation === name);

// Each state of states.yaml, with its path when it is reached: the scenario its entry names
// parses, starts from no state, and the judgement of the state's sentence on it holds on
// the text its judge is given today. What its own rule is judged does not count.
//   {state: s, path: f/a}, s judged holds on a      -> {state: s, path: {state: s, steps: […]}}
//   {state: s, path: f/a}, s not judged on a        -> {state: s, awaited: true, why: "it is not judged on its path f/a yet"}
//   {state: s, path: f/a}, s judged not-shown on a  -> {state: s, awaited: false, why: "its path f/a does not show it: judged not-shown"}
// judged: the state's judgement on its path, when it is of the text its judge is given today
function pathsRead(
  files: readonly SourceFile[],
  states: readonly State[],
): readonly {
  readonly read: { readonly state: string; readonly path: Path } | Unreached;
  readonly judged?: StateJudgement;
}[] {
  const interfaces = interfacesOf(files) ?? [];
  const callables = callablesOf(files);
  return states.map(({ state, path }) => {
    const { operation: name, slug } = partsOfPath(path);
    const awaited = {
      state,
      awaited: true,
      why: `it is not judged on its path ${path} yet`,
    };
    const bound = interfaces.find(({ interface: one }) => one === name);
    const file = `${folderOf(name)}/scenarios/${slug}.yaml`;
    const text = textAt(files, file);
    const read =
      text === undefined ? undefined : readYaml(file, text, roleScenarioSchema);
    if (bound === undefined || read === undefined || !("value" in read))
      return { read: awaited };
    const steps = read.value.steps.flatMap((step) => ("state" in step ? [] : [step]));
    if (steps.length < read.value.steps.length) {
      return {
        read: {
          state,
          awaited: false,
          why: `its path ${path}: a path does not start from a state`,
        },
      };
    }
    // no reference of the path as written, no text its judge is given today
    const evidence = evidenceAt(files, name, slug);
    const of =
      evidence === undefined ||
      evidence.noise === undefined ||
      !isAsWritten({ ...read.value, steps }, evidence, callables)
        ? undefined
        : judgeTaskOf(files, bound, [{ slug, evidence }])?.ofStates.get(state);
    const judged = stateJudgementsIn(files, name).find(
      (j) => j.scenario === slug && j.state === state,
    );
    if (of === undefined || judged === undefined || judged.of !== of)
      return { read: awaited };
    return {
      read:
        judged.verdict === "holds"
          ? { state, path: { state, steps } }
          : {
              state,
              awaited: false,
              why: `its path ${path} does not show it: judged ${judged.verdict}`,
            },
      judged,
    };
  });
}

// The states that are reached, the others with why. A state its path does not show, or
// whose path starts from a state, is a finding of states.yaml; one not judged on its path
// yet, a gap.
export function pathsOf(
  files: readonly SourceFile[],
  states: readonly State[] = statesOf(files).states,
): {
  readonly paths: readonly Path[];
  readonly unreached: readonly Unreached[];
  readonly findings: readonly string[];
  readonly gaps: readonly (Gap & { readonly kind: "state-not-reached" })[];
} {
  const read = pathsRead(files, states).map(({ read }) => read);
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

// each state's judgement on its path, of the text its judge is given today: s -> {verdict, …}
export const judgedOnPaths = (
  files: readonly SourceFile[],
  states: readonly State[],
): ReadonlyMap<string, StateJudgement> =>
  new Map(
    pathsRead(files, states).flatMap(({ read: { state }, judged }) =>
      judged === undefined ? [] : [[state, judged] as const],
    ),
  );
