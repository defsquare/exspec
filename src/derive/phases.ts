import type { Phase, Phases } from "../shapes/event.ts";
import type { Extraction, Gap, Problem } from "../shapes/extraction.ts";

export type Examined = {
  readonly extraction: Extraction;
  readonly problems: readonly Problem[];
  readonly gaps: readonly Gap[];
};

export type AgentPhase = Exclude<Phase, "record">;

// { file: "a.yaml", at: "b.0", message: "m" } -> "a.yaml b.0: m"
export const problemLine = ({ file, at, message }: Problem) =>
  `${file}${at ? ` ${at}` : ""}: ${message}`;

const gapLine = ({ kind, name, message }: Gap) => `${kind} ${name}: ${message}`;

const closedBySpecification: readonly Gap["kind"][] = [
  "operation-without-trigger",
  "refusal-not-translated",
];

// what the files alone say against a phase's gate; [] when they pass it
export function staticFindings(
  phase: AgentPhase,
  { extraction, problems, gaps }: Examined,
): readonly string[] {
  const { target, interfaces, operations, scenarios } = extraction;
  const lines = problems.map(problemLine);
  switch (phase) {
    case "target":
      return target === undefined ? [...lines, "no target is declared"] : lines;
    case "interfaces":
      return interfaces.length === 0 ? [...lines, "no interface is declared"] : lines;
    case "specification":
      return [
        ...lines,
        ...(operations.length === 0 ? ["no operation is declared"] : []),
        ...gaps.filter(({ kind }) => closedBySpecification.includes(kind)).map(gapLine),
      ];
    case "scenarios": {
      const judged = new Set(
        scenarios.map(({ scenario }) => scenario.act.call.operation),
      );
      return [
        ...lines,
        ...(operations.length === 0 ? ["no operation is declared"] : []),
        ...operations
          .filter(({ operation }) => !judged.has(operation.operation))
          .map(({ operation }) => `${operation.operation} has no scenario`),
      ];
    }
    default: {
      const unreachable: never = phase;
      return unreachable;
    }
  }
}

// A phase is done when the files say so: the target is not started to find out.
export function phasesOf(examined: Examined): Phases {
  const { extraction, problems } = examined;
  const { target, scenarios, references } = extraction;
  const passes = (phase: AgentPhase) =>
    staticFindings(phase, examined).length === 0 ? "done" : "to-do";
  const referenced = new Set(references.map(({ path }) => path));
  return {
    target:
      target !== undefined && !problems.some(({ file }) => file === "target.yaml")
        ? "done"
        : "to-do",
    interfaces: passes("interfaces"),
    specification: passes("specification"),
    scenarios: passes("scenarios"),
    record:
      scenarios.length > 0 && scenarios.every(({ path }) => referenced.has(path))
        ? "done"
        : "to-do",
  };
}
