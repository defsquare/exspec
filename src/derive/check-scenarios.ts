import type { Extraction, Problem } from "../shapes/extraction.ts";
import type { Call, Scenario } from "../shapes/scenario.ts";
import type { Operation, Structure } from "../shapes/specification.ts";
import { hasFieldPath } from "./check-facts.ts";
import { fieldOf } from "./check-operations.ts";
import { rulesOf } from "./operation.ts";

const wanted = {
  string: "string",
  instant: "string",
  int: "number",
  number: "number",
  boolean: "boolean",
} as const;

// 12 -> "number";  null, a list, a map -> undefined: no judgement
function kindOf(value: unknown): "string" | "number" | "boolean" | undefined {
  switch (typeof value) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    default:
      return undefined;
  }
}

// what a scenario asks to be looked at names a fact, a structure, its fields, the inputs
function checkAssert(
  { assert, act }: Scenario,
  operation: Operation | undefined,
  { facts, structures }: { facts: readonly string[]; structures: readonly Structure[] },
): readonly { readonly at: string; readonly message: string }[] {
  return assert.flatMap((item, i) => {
    if ("fact" in item) {
      return facts.includes(item.fact)
        ? []
        : [{ at: `assert.${i}.fact`, message: `unknown fact "${item.fact}"` }];
    }
    const { structure, where, field } = item.shows;
    const at = `assert.${i}.shows`;
    if (!structures.some((s) => s.structure === structure)) {
      return [{ at: `${at}.structure`, message: `unknown structure "${structure}"` }];
    }
    return [
      ...Object.entries(where).flatMap(([key, value]) => [
        ...(hasFieldPath(structures, structure, [key])
          ? []
          : [
              {
                at: `${at}.where.${key}`,
                message: `"${key}" is not a field of ${structure}`,
              },
            ]),
        ...(Array.isArray(value) &&
        operation !== undefined &&
        !Object.hasOwn(operation.takes, value[1])
          ? [
              {
                at: `${at}.where.${key}`,
                message: `"${value[1]}" is not an input of "${act.call.operation}"`,
              },
            ]
          : []),
      ]),
      ...(hasFieldPath(structures, structure, field)
        ? []
        : [
            {
              at: `${at}.field`,
              message: `${structure} has no field ${field.join(".")}`,
            },
          ]),
    ];
  });
}

export function checkScenarios({
  operations,
  triggers,
  scenarios,
  structures,
  facts,
}: Extraction): readonly Problem[] {
  const factNames = facts.map(({ fact }) => fact);
  const operationNamed = new Map(operations.map(({ operation: o }) => [o.operation, o]));
  return scenarios.flatMap(({ path, scenario }) => {
    const file = `scenarios/${path}.yaml`;
    const problem = (at: string, message: string): Problem => ({ file, at, message });

    const typeOf = (input: Operation["takes"][string]) => {
      if (!("field" in input)) return input.type;
      const field = fieldOf(structures, input.field);
      return field && "type" in field ? field.type : undefined;
    };

    // leftOut: a proved rule violates: required on them
    // wrongOn: a proved rule violates something on them, a wrong value may be the point
    const checkCall = (
      at: string,
      call: Call,
      leftOut: readonly string[],
      wrongOn: readonly string[],
    ) => {
      const operation = operationNamed.get(call.operation);
      if (operation === undefined) {
        return [problem(`${at}.operation`, `unknown operation "${call.operation}"`)];
      }
      const bound = triggers.some((t) => t.operation === call.operation);
      return [
        ...(bound
          ? []
          : [problem(`${at}.operation`, `no trigger calls "${call.operation}"`)]),
        ...Object.entries(call.with).flatMap(([name, value]) => {
          const input = Object.hasOwn(operation.takes, name)
            ? operation.takes[name]
            : undefined;
          const type = input && typeOf(input);
          const given = kindOf(value);
          if (type === undefined || given === undefined || wrongOn.includes(name))
            return [];
          return wanted[type] === given
            ? []
            : [
                problem(
                  `${at}.with.${name}`,
                  `"${name}" is ${type === "int" || type === "instant" ? "an" : "a"} ${type} for ${call.operation}, the scenario gives the ${given} ${JSON.stringify(value)}`,
                ),
              ];
        }),
        ...Object.keys(call.with)
          .filter((input) => !Object.hasOwn(operation.takes, input))
          .map((input) =>
            problem(
              `${at}.with.${input}`,
              `"${input}" is not an input of "${call.operation}"`,
            ),
          ),
        ...Object.entries(operation.takes)
          .filter(
            ([name, input]) =>
              !input.optional &&
              !("default" in input && input.default !== undefined) &&
              !Object.hasOwn(call.with, name) &&
              !leftOut.includes(name),
          )
          .map(([name]) =>
            problem(`${at}.with`, `the required input "${name}" is missing`),
          ),
      ];
    };

    const { act, arrange, proves } = scenario;
    const [directory] = path.split("/");
    const operation = operationNamed.get(act.call.operation);
    const provenOn = (only?: "required") =>
      operation
        ? Object.entries(operation.takes)
            .filter(
              ([, input]) =>
                "rules" in input &&
                (input.rules ?? []).some(
                  ({ rule, violates }) =>
                    (only === undefined || violates === only) && proves.includes(rule),
                ),
            )
            .map(([name]) => name)
        : [];
    const leftOut = provenOn("required");
    const rules = operation ? rulesOf(operation) : [];
    return [
      ...(directory === act.call.operation
        ? []
        : [
            problem(
              "act.call.operation",
              `the scenario is under "${directory}", its act calls "${act.call.operation}"`,
            ),
          ]),
      ...arrange.flatMap(({ call }, i) => checkCall(`arrange.${i}.call`, call, [], [])),
      ...checkAssert(scenario, operation, { facts: factNames, structures }).map(
        ({ at, message }) => problem(at, message),
      ),
      ...checkCall("act.call", act.call, leftOut, provenOn()),
      ...(operation
        ? proves.flatMap((rule, i) =>
            rules.includes(rule)
              ? []
              : [
                  problem(
                    `proves.${i}`,
                    `"${rule}" is not a rule of "${act.call.operation}"`,
                  ),
                ],
          )
        : []),
    ];
  });
}
