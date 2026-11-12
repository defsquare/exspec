import type { Extraction, Problem } from "../shapes/extraction.ts";
import type { Field, Structure } from "../shapes/specification.ts";
import { declaredRules } from "./operation.ts";

// [S, f] -> the field f of the structure S
export function fieldOf(
  structures: readonly Structure[],
  [structure, field]: readonly [string, string],
): Field | undefined {
  const found = structures.find((s) => s.structure === structure)?.fields;
  return found && Object.hasOwn(found, field) ? found[field] : undefined;
}

export function checkOperations({
  structures,
  facts,
  operations,
}: Extraction): readonly Problem[] {
  const factNames = new Set(facts.map(({ fact }) => fact));
  return operations.flatMap(({ path, operation }) => {
    const file = `operations/${path}.yaml`;
    const problem = (at: string, message: string): Problem => ({ file, at, message });
    const unknownField = (at: string, of: readonly [string, string]) =>
      fieldOf(structures, of) ? [] : [problem(at, `unknown field ${of.join(".")}`)];
    const unknownFact = (at: string, fact: string) =>
      factNames.has(fact) ? [] : [problem(at, `unknown fact "${fact}"`)];
    const rules = declaredRules(operation);
    return [
      ...(path === operation.operation
        ? []
        : [
            problem(
              "operation",
              `the file is named "${path}", the operation "${operation.operation}"`,
            ),
          ]),
      ...(operation.answers === null ||
      structures.some((s) => s.structure === operation.answers)
        ? []
        : [problem("answers", `unknown structure "${operation.answers}"`)]),
      ...Object.entries(operation.takes).flatMap(([name, input]) => {
        if (!("field" in input)) return [];
        const field = fieldOf(structures, input.field);
        if (field === undefined) return unknownField(`takes.${name}.field`, input.field);
        return (input.rules ?? []).flatMap(({ violates }, i) =>
          violates === "required" || ("type" in field && field[violates] !== undefined)
            ? []
            : [
                problem(
                  `takes.${name}.rules.${i}.violates`,
                  `${input.field.join(".")} carries no ${violates}`,
                ),
              ],
        );
      }),
      ...operation.requires.flatMap(({ fact }, i) =>
        unknownFact(`requires.${i}.fact`, fact),
      ),
      ...operation.effects.flatMap(({ when, then }, i) => [
        ...(when === undefined
          ? []
          : typeof when === "string"
            ? unknownFact(`effects.${i}.when`, when)
            : when[0] === "not"
              ? unknownFact(`effects.${i}.when`, when[1])
              : Object.hasOwn(operation.takes, when[1])
                ? []
                : [problem(`effects.${i}.when`, `"${when[1]}" is not an input`)]),
        ...(typeof then === "string" || "says" in then
          ? []
          : [
              ...Object.keys(then.fact ?? {}).flatMap((fact) =>
                unknownFact(`effects.${i}.then.fact.${fact}`, fact),
              ),
              ...(then.field ?? []).flatMap(({ of }, j) =>
                unknownField(`effects.${i}.then.field.${j}.of`, of),
              ),
            ]),
      ]),
      ...rules
        .filter(({ rule }, i) => rules.findIndex((r) => r.rule === rule) < i)
        .map(({ rule, at }) => problem(at, `rule "${rule}" is declared twice`)),
    ];
  });
}
