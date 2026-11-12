import type { Extraction, Gap } from "../shapes/extraction.ts";
import type { Structure } from "../shapes/specification.ts";
import { rulesOf } from "./operation.ts";

// [A] -> [A, B] when A has a field {structure: B}; a field {structure: C, by: identity}
// shows C's identity only, not C
function withNested(structures: readonly Structure[], roots: readonly string[]) {
  const nested = (name: string) =>
    Object.values(structures.find((s) => s.structure === name)?.fields ?? {}).flatMap(
      (field) =>
        "structure" in field && field.by === undefined ? [field.structure] : [],
    );
  const visit = (seen: readonly string[], name: string): readonly string[] =>
    seen.includes(name) ? seen : nested(name).reduce(visit, [...seen, name]);
  return new Set(roots.reduce(visit, []));
}

export function findGaps({
  interfaces,
  structures,
  facts,
  operations,
  projections,
  triggers,
  scenarios,
}: Extraction): readonly Gap[] {
  const proved = new Set(
    scenarios.flatMap(({ scenario: { act, proves } }) =>
      proves.map((rule) => `${act.call.operation}/${rule}`),
    ),
  );
  const shown = withNested(
    structures,
    projections.flatMap(({ shows }) => shows.map(({ structure }) => structure)),
  );
  const cited = new Set([...projections, ...triggers].map((b) => b.interface));
  const triggered = new Set(triggers.map(({ operation }) => operation));
  return [
    ...operations.flatMap(({ operation }) =>
      rulesOf(operation)
        .map((rule) => `${operation.operation}/${rule}`)
        .filter((name) => !proved.has(name))
        .map((name) => ({
          kind: "rule-without-scenario" as const,
          name,
          message: "no scenario proves it",
        })),
    ),
    ...structures
      .filter(({ structure }) => !shown.has(structure))
      .map(({ structure }) => ({
        kind: "structure-not-shown" as const,
        name: structure,
        message: "no projection shows it",
      })),
    ...interfaces
      .filter((i) => !cited.has(i.interface))
      .map((i) => ({
        kind: "interface-not-bound" as const,
        name: i.interface,
        message: "no trigger and no projection cites it",
      })),
    ...operations
      .filter(({ operation }) => !triggered.has(operation.operation))
      .map(({ operation }) => ({
        kind: "operation-without-trigger" as const,
        name: operation.operation,
        message: "no trigger calls it",
      })),
    ...facts
      .filter(({ condition }) => condition.length === 0)
      .map(({ fact }) => ({
        kind: "fact-not-observable" as const,
        name: fact,
        message: "its condition is empty",
      })),
  ];
}
