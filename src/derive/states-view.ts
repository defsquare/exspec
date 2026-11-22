import type { SourceFile } from "../shapes/extraction.ts";
import { readYaml, roleScenarioSchema, type StateJudgement } from "../shapes/roles.ts";
import { partsOfPath } from "./check-states.ts";
import { folderOf, interfacesOf, slugsIn, statesOf } from "./roles-files.ts";
import { judgedOnPaths, pathsOf } from "./states-files.ts";

// one state as the page shows it, for a review with the business:
//   {state: s, seen: "…", of: [A], path: {operation: f, scenario: a}, reached: "no",
//    why: "its path f/a does not show it: judged not-shown",
//    judged: {verdict: not-shown, confidence: 0.9, evidence: "…"},
//    serves: [{operation: g, rules: [r, q]}], startedFrom: [{operation: g, scenarios: [r]}]}
export type StateView = {
  readonly state: string;
  readonly seen: string;
  readonly of: readonly string[];
  readonly path: { readonly operation: string; readonly scenario: string };
  readonly reached: "yes" | "not-yet" | "no";
  readonly why?: string;
  readonly judged?: {
    readonly verdict: StateJudgement["verdict"];
    readonly confidence: number;
    readonly evidence: string;
  };
  readonly serves: readonly {
    readonly operation: string;
    readonly rules: readonly string[];
  }[];
  readonly startedFrom: readonly {
    readonly operation: string;
    readonly scenarios: readonly string[];
  }[];
};

// the scenarios of an interface that start from a state, with the states they start from,
// as written: [{slug: "b", states: ["s"]}]
export function statesStartedFrom(
  files: readonly SourceFile[],
  name: string,
): readonly { readonly slug: string; readonly states: readonly string[] }[] {
  return slugsIn(files, `${folderOf(name)}/scenarios`).flatMap(({ slug, text }) => {
    const read = readYaml(slug, text, roleScenarioSchema);
    const states =
      "value" in read
        ? read.value.steps.flatMap((step) => ("state" in step ? [step.state] : []))
        : [];
    return states.length === 0 ? [] : [{ slug, states }];
  });
}

// ["g/r", "h/z", "g/q"] -> [{operation: g, rules: [r, q]}, {operation: h, rules: [z]}]
function byOperation(paths: readonly string[]) {
  const operations = [...new Set(paths.map((path) => partsOfPath(path).operation))];
  return operations.map((operation) => ({
    operation,
    rules: paths.flatMap((path) => {
      const parts = partsOfPath(path);
      return parts.operation === operation ? [parts.slug] : [];
    }),
  }));
}

// Each state of states.yaml, in the file's order, as the page shows it; none without the
// file
export function statesView(files: readonly SourceFile[]): readonly StateView[] {
  const { states } = statesOf(files);
  const { paths, unreached } = pathsOf(files, states);
  const judged = judgedOnPaths(files, states);
  const started = (interfacesOf(files) ?? []).map(({ interface: name }) => ({
    operation: name,
    scenarios: statesStartedFrom(files, name),
  }));
  return states.map(({ state, seen, of, path, serves }): StateView => {
    const { operation, slug } = partsOfPath(path);
    const not = unreached.find((one) => one.state === state);
    const judgement = judged.get(state);
    return {
      state,
      seen,
      of,
      path: { operation, scenario: slug },
      reached: paths.some((one) => one.state === state)
        ? "yes"
        : not?.awaited === false
          ? "no"
          : "not-yet",
      ...(not === undefined ? {} : { why: not.why }),
      ...(judgement === undefined
        ? {}
        : {
            judged: {
              verdict: judgement.verdict,
              confidence: judgement.confidence,
              evidence: judgement.evidence,
            },
          }),
      serves: byOperation(serves),
      startedFrom: started.flatMap(({ operation, scenarios }) => {
        const from = scenarios.flatMap(({ slug, states }) =>
          states.includes(state) ? [slug] : [],
        );
        return from.length === 0 ? [] : [{ operation, scenarios: from }];
      }),
    };
  });
}
