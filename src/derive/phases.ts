import type { Phase, Phases } from "../shapes/event.ts";
import {
  type Extraction,
  type Problem,
  parseExtraction,
  type SourceFile,
} from "../shapes/extraction.ts";
import { checkExtraction } from "./check.ts";
import type { Left } from "./roles-left.ts";

export type Examined = {
  readonly extraction: Extraction;
  readonly problems: readonly Problem[];
};

// target.yaml and interfaces.yaml, parsed and checked: the rest of exspec/ is the roles'
// own, read by them, or a computed specification the phases leave as it is
export function declaredIn(files: readonly SourceFile[]): Examined {
  const parsed = parseExtraction(
    files.filter(({ path }) => path === "target.yaml" || path === "interfaces.yaml"),
  );
  return {
    extraction: parsed.extraction,
    problems: [...parsed.problems, ...checkExtraction(parsed.extraction).problems],
  };
}

// the phases an agent's session of extract writes, in the checkout
export type AgentPhase = Extract<Phase, "target" | "interfaces">;

// { file: "a.yaml", at: "b.0", message: "m" } -> "a.yaml b.0: m"
export const problemLine = ({ file, at, message }: Problem) =>
  `${file}${at ? ` ${at}` : ""}: ${message}`;

// what the files alone say against a phase's gate; [] when they pass it
export function staticFindings(
  phase: AgentPhase,
  { extraction, problems }: Examined,
): readonly string[] {
  const { target, interfaces } = extraction;
  const lines = problems.map(problemLine);
  switch (phase) {
    case "target":
      return target === undefined ? [...lines, "no target is declared"] : lines;
    case "interfaces":
      return interfaces.length === 0 ? [...lines, "no interface is declared"] : lines;
    default: {
      const unreachable: never = phase;
      return unreachable;
    }
  }
}

// A phase is done when the files say so, and the one before it is done: the target is not
// started to find out. With no interface, nothing is read, built or judged.
//   reading    structures, common, protocol and states.yaml not left, every interface read
//   evidence   no scenario left to build, no finding of the builder's check, none to record
//   judgement  no reference left to judge
export function phasesOf(examined: Examined, left: Left): Phases {
  const { extraction, problems } = examined;
  const read = left.interfaces.flatMap((one) => (one.reading === "done" ? [one] : []));
  const every = (holds: (one: (typeof read)[number]) => boolean) =>
    left.interfaces.length > 0 &&
    read.length === left.interfaces.length &&
    read.every(holds);
  const target =
    extraction.target !== undefined &&
    !problems.some(({ file }) => file === "target.yaml");
  const interfaces = staticFindings("interfaces", examined).length === 0;
  // as today, the interfaces are told done without the target; what follows needs both
  const reading =
    target &&
    interfaces &&
    !left.structures &&
    !left.common &&
    !left.protocol &&
    !left.states &&
    every(() => true);
  const evidence =
    reading &&
    every(
      ({ build, record }) =>
        build.findings.length === 0 &&
        build.scenarios.length === 0 &&
        record.length === 0,
    );
  const judgement = evidence && every(({ judge }) => judge.length === 0);
  const progress = (done: boolean) => (done ? "done" : "to-do");
  return {
    target: progress(target),
    interfaces: progress(interfaces),
    reading: progress(reading),
    evidence: progress(evidence),
    judgement: progress(judgement),
  };
}
