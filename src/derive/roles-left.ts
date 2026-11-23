import type { SourceFile } from "../shapes/extraction.ts";
import type { Interface, Observable } from "../shapes/target.ts";
import { builtOf } from "./built-of.ts";
import type { Callable } from "./callables.ts";
import { checkProvider, providerFolderOf } from "./check-provider.ts";
import { checkCommon, checkCommonTrigger, checkStructuresFile } from "./check-reader.ts";
import { isAsWritten } from "./evidence.ts";
import {
  callablesOf,
  commonFile,
  commonTriggerFile,
  evidenceAt,
  judgementsIn,
  judgeTaskOf,
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

// What is left of one provider, each true while left: its reading while its files fail
// their check; its twin while twin.ts is missing
export type ProviderLeft = {
  readonly provider: string;
  readonly reading: boolean;
  readonly twin: boolean;
};

export type Left = {
  // each file, true when it is missing or fails its check
  readonly structures: boolean;
  readonly common: boolean;
  readonly commonTrigger: boolean;
  // true when states.yaml is missing: once written it is the user's, no role rewrites it
  readonly states: boolean;
  readonly interfaces: readonly InterfaceLeft[];
  readonly providers: readonly ProviderLeft[];
};

// what is left of one provider: leftOf for it alone
export const providerLeft = (
  files: readonly SourceFile[],
  name: string,
): ProviderLeft => ({
  provider: name,
  reading: checkProvider(files, name).findings.length > 0,
  twin: textAt(files, `${providerFolderOf(name)}/twin.ts`) === undefined,
});

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
// asked: one entry per interface and per provider, in the order given.
export function leftOf({
  files,
  interfaces,
  providers = [],
}: {
  readonly files: readonly SourceFile[];
  readonly interfaces: readonly Interface[];
  readonly providers?: readonly Observable[];
}): Left {
  const callables = callablesOf(files);
  const common = checkCommon(textAt(files, commonFile));
  return {
    structures: checkStructuresFile(textAt(files, "structures.yaml")).findings.length > 0,
    common: common.findings.length > 0,
    commonTrigger:
      checkCommonTrigger(textAt(files, commonTriggerFile), common.common).findings
        .length > 0,
    states: textAt(files, "states.yaml") === undefined,
    interfaces: interfaces.map((bound) => interfaceLeft(files, bound, callables)),
    providers: providers.map(({ observable }) => providerLeft(files, observable)),
  };
}
