import type { SourceFile } from "../shapes/extraction.ts";
import type { Interface } from "../shapes/target.ts";
import { builtOf } from "./built-of.ts";
import type { Callable } from "./callables.ts";
import { checkCommon, checkProtocol, checkStructuresFile } from "./check-reader.ts";
import { isAsWritten } from "./evidence.ts";
import {
  callablesOf,
  commonFile,
  evidenceAt,
  judgementsIn,
  judgeTaskOf,
  protocolFile,
  stateJudgementsIn,
  textAt,
} from "./roles-files.ts";

// What is left of one interface. Its reading to do: nothing can be built, recorded or
// judged of it yet. Its reading done:
//   build   the builder's check of its scenarios, and the slugs of those that pass it with
//           no evidence of them as written
//   record  the slugs whose evidence is of them as written and has no noise; none while the
//           builder's check finds something
//   judge   the slugs whose evidence is a reference of them as written, with no judgement of
//           the same hash on their rule, or, when one is the path of a state, on its sentence
export type InterfaceLeft =
  | { readonly interface: string; readonly reading: "to-do" }
  | {
      readonly interface: string;
      readonly reading: "done";
      readonly build: {
        readonly findings: readonly string[];
        readonly scenarios: readonly string[];
      };
      readonly record: readonly string[];
      readonly judge: readonly string[];
    };

export type Left = {
  // each file, true when it is missing or fails its check
  readonly structures: boolean;
  readonly common: boolean;
  readonly protocol: boolean;
  // true when states.yaml is missing: once written it is the user's, no role rewrites it
  readonly states: boolean;
  readonly interfaces: readonly InterfaceLeft[];
};

// what is left of one interface: leftOf for it alone
export function interfaceLeft(
  files: readonly SourceFile[],
  bound: Interface,
  callables: readonly Callable[] = callablesOf(files),
): InterfaceLeft {
  const name = bound.interface;
  const built = builtOf(files, bound, { callables });
  if (built === undefined) return { interface: name, reading: "to-do" };
  const withEvidence = built.scenarios.map(({ slug, scenario }) => {
    const evidence = evidenceAt(files, name, slug);
    return {
      slug,
      evidence:
        evidence !== undefined && isAsWritten(scenario, evidence, callables)
          ? evidence
          : undefined,
    };
  });
  const references = withEvidence.flatMap(({ slug, evidence }) =>
    evidence?.noise === undefined ? [] : [{ slug, evidence }],
  );
  const task = judgeTaskOf(files, bound, references);
  const judged = judgementsIn(files, name);
  const statesJudged = stateJudgementsIn(files, name);
  const stateLeft = (slug: string) =>
    (task?.states ?? []).some(
      ({ state, slug: path }) =>
        path === slug &&
        !statesJudged.some(
          (j) =>
            j.scenario === slug &&
            j.state === state &&
            j.of === task?.ofStates.get(state),
        ),
    );
  return {
    interface: name,
    reading: "done",
    build: {
      findings: built.findings,
      scenarios: withEvidence.flatMap(({ slug, evidence }) =>
        evidence === undefined ? [slug] : [],
      ),
    },
    record:
      built.findings.length > 0
        ? []
        : withEvidence.flatMap(({ slug, evidence }) =>
            evidence !== undefined && evidence.noise === undefined ? [slug] : [],
          ),
    judge: references.flatMap(({ slug }) =>
      judged.some(({ scenario, of }) => scenario === slug && of === task?.of.get(slug)) &&
      !stateLeft(slug)
        ? []
        : [slug],
    ),
  };
}

// What is left for each role, told from the files alone, the target neither started nor
// asked: one interface entry per interface, in the order given.
export function leftOf({
  files,
  interfaces,
}: {
  readonly files: readonly SourceFile[];
  readonly interfaces: readonly Interface[];
}): Left {
  const callables = callablesOf(files);
  return {
    structures: checkStructuresFile(textAt(files, "structures.yaml")).findings.length > 0,
    common: checkCommon(textAt(files, commonFile)).findings.length > 0,
    protocol: checkProtocol(textAt(files, protocolFile)).findings.length > 0,
    states: textAt(files, "states.yaml") === undefined,
    interfaces: interfaces.map((bound) => interfaceLeft(files, bound, callables)),
  };
}
