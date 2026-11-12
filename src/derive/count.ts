import type { Counts } from "../shapes/event.ts";
import type { Extraction } from "../shapes/extraction.ts";
import { rulesOf } from "./operation.ts";

export function countExtraction({
  interfaces,
  structures,
  facts,
  operations,
  projections,
  triggers,
  scenarios,
}: Extraction): Counts {
  return {
    interfaces: interfaces.length,
    structures: structures.length,
    facts: facts.length,
    operations: operations.length,
    rules: operations.reduce((sum, { operation }) => sum + rulesOf(operation).length, 0),
    projections: projections.length,
    triggers: triggers.length,
    scenarios: scenarios.length,
  };
}
