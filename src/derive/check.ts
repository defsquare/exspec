import type { Extraction, Gap, Problem } from "../shapes/extraction.ts";
import { checkBindings } from "./check-bindings.ts";
import { checkFacts } from "./check-facts.ts";
import { checkOperations } from "./check-operations.ts";
import { checkScenarios } from "./check-scenarios.ts";
import { findGaps } from "./gaps.ts";

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function checkExtraction(extraction: Extraction): {
  readonly problems: readonly Problem[];
  readonly gaps: readonly Gap[];
} {
  return {
    problems: [
      ...checkBindings(extraction),
      ...checkOperations(extraction),
      ...checkFacts(extraction),
      ...checkScenarios(extraction),
    ].sort((a, b) => compare(a.file, b.file) || compare(a.at, b.at)),
    gaps: [...findGaps(extraction)].sort(
      (a, b) => compare(a.kind, b.kind) || compare(a.name, b.name),
    ),
  };
}
