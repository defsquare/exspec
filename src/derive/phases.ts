import type { Phases, SessionStep } from "../shapes/event.ts";
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

// { file: "a.yaml", at: "b.0", message: "m" } -> "a.yaml b.0: m"
export const problemLine = ({ file, at, message }: Problem) =>
  `${file}${at ? ` ${at}` : ""}: ${message}`;

// what the files alone say against a session's gate; [] when they pass it
export function staticFindings(
  step: SessionStep,
  { extraction, problems }: Examined,
): readonly string[] {
  const { target, interfaces } = extraction;
  const lines = problems.map(problemLine);
  switch (step) {
    case "target":
      return target === undefined ? [...lines, "no target is declared"] : lines;
    case "interfaces":
      return interfaces.length === 0 ? [...lines, "no interface is declared"] : lines;
    default: {
      const unreachable: never = step;
      return unreachable;
    }
  }
}

// A session's step is done when its files pass what its gate checks of them: the target
// declared with no problem of target.yaml; the interfaces with none of any file. The
// interfaces are told done without the target.
export function stepDone(step: SessionStep, examined: Examined): boolean {
  switch (step) {
    case "target":
      return (
        examined.extraction.target !== undefined &&
        !examined.problems.some(({ file }) => file === "target.yaml")
      );
    case "interfaces":
      return staticFindings("interfaces", examined).length === 0;
    default: {
      const unreachable: never = step;
      return unreachable;
    }
  }
}

// A phase is done when the files say so, and the one before it is done: the target is not
// started to find out. With no interface, nothing is read, built or judged.
//   target         both its sessions' steps done, every provider declared read and its
//                  twin written
//   specification  structures, common, common-trigger and states.yaml not left, every
//                  interface read
//   proof          no scenario left to build, no finding of the builder's check, none to
//                  record, no reference left to judge
export function phasesOf(examined: Examined, left: Left): Phases {
  const read = left.interfaces.flatMap((one) => (one.reading === "done" ? [one] : []));
  const every = (holds: (one: (typeof read)[number]) => boolean) =>
    left.interfaces.length > 0 &&
    read.length === left.interfaces.length &&
    read.every(holds);
  const target =
    stepDone("target", examined) &&
    stepDone("interfaces", examined) &&
    left.providers.every(({ reading, twin }) => !reading && !twin);
  const specification =
    target &&
    !left.structures &&
    !left.common &&
    !left.commonTrigger &&
    !left.states &&
    every(() => true);
  const proof =
    specification &&
    every(
      ({ build, record, judge }) =>
        build.findings.length === 0 &&
        build.scenarios.length === 0 &&
        record.length === 0 &&
        judge.length === 0,
    );
  const progress = (done: boolean) => (done ? "done" : "to-do");
  return {
    target: progress(target),
    specification: progress(specification),
    proof: progress(proof),
  };
}
