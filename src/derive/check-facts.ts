import type { Extraction, Problem } from "../shapes/extraction.ts";
import type { Structure } from "../shapes/specification.ts";
import { fieldOf } from "./check-operations.ts";

const file = "facts.yaml";

// S, [a, b] -> true when a is a field of S that is a structure T, and b a field of T
function hasFieldPath(
  structures: readonly Structure[],
  structure: string,
  path: readonly string[],
): boolean {
  const [first, ...rest] = path;
  if (first === undefined) return true;
  const field = fieldOf(structures, [structure, first]);
  if (field === undefined) return false;
  if (rest.length === 0) return true;
  return "structure" in field && hasFieldPath(structures, field.structure, rest);
}

export function checkFacts({ structures, facts }: Extraction): readonly Problem[] {
  const structureNames = new Set(structures.map(({ structure }) => structure));
  return facts.flatMap(({ condition }, i) =>
    condition.flatMap((term, j) => {
      if (!("structure" in term)) return [];
      const at = `${i}.condition.${j}`;
      if (!structureNames.has(term.structure)) {
        return [
          {
            file,
            at: `${at}.structure`,
            message: `unknown structure "${term.structure}"`,
          },
        ];
      }
      return [
        ...Object.keys(term.where)
          .filter((key) => !hasFieldPath(structures, term.structure, [key]))
          .map((key) => ({
            file,
            at: `${at}.where.${key}`,
            message: `"${key}" is not a field of ${term.structure}`,
          })),
        ...(term.field && !hasFieldPath(structures, term.structure, term.field)
          ? [
              {
                file,
                at: `${at}.field`,
                message: `${term.structure} has no field ${term.field.join(".")}`,
              },
            ]
          : []),
      ];
    }),
  );
}
