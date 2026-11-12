import type { Operation } from "../shapes/specification.ts";

// every rule an operation declares, with where it is declared in the operation's file:
//   { rule: "r", at: "takes.a.rules.0.rule" }, { rule: "s", at: "requires.0.rule" }, …
export function declaredRules(
  operation: Operation,
): readonly { readonly rule: string; readonly at: string }[] {
  return [
    ...Object.entries(operation.takes).flatMap(([name, input]) =>
      "rules" in input && input.rules
        ? input.rules.map(({ rule }, i) => ({
            rule,
            at: `takes.${name}.rules.${i}.rule`,
          }))
        : [],
    ),
    ...operation.requires.map(({ rule }, i) => ({ rule, at: `requires.${i}.rule` })),
    ...operation.effects.map(({ rule }, i) => ({ rule, at: `effects.${i}.rule` })),
  ];
}

export function rulesOf(operation: Operation): readonly string[] {
  return [...new Set(declaredRules(operation).map(({ rule }) => rule))];
}

export function refusalsOf(operation: Operation): readonly string[] {
  return [
    ...new Set([
      ...Object.values(operation.takes).flatMap((input) =>
        "rules" in input && input.rules
          ? input.rules.map(({ otherwise }) => otherwise)
          : [],
      ),
      ...operation.requires.map(({ otherwise }) => otherwise),
    ]),
  ];
}
