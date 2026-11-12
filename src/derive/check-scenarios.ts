import type { Extraction, Problem } from "../shapes/extraction.ts";
import type { Call } from "../shapes/scenario.ts";
import { rulesOf } from "./operation.ts";

export function checkScenarios({
  operations,
  triggers,
  scenarios,
}: Extraction): readonly Problem[] {
  const operationNamed = new Map(operations.map(({ operation: o }) => [o.operation, o]));
  return scenarios.flatMap(({ path, scenario }) => {
    const file = `scenarios/${path}.yaml`;
    const problem = (at: string, message: string): Problem => ({ file, at, message });

    // the inputs left out on purpose: a proved rule violates: required on them
    const checkCall = (at: string, call: Call, leftOut: readonly string[]) => {
      const operation = operationNamed.get(call.operation);
      if (operation === undefined) {
        return [problem(`${at}.operation`, `unknown operation "${call.operation}"`)];
      }
      const bound = triggers.filter((t) => t.operation === call.operation).length;
      return [
        ...(bound === 0
          ? [problem(`${at}.operation`, `no trigger calls "${call.operation}"`)]
          : bound > 1
            ? [problem(`${at}.operation`, `${bound} triggers call "${call.operation}"`)]
            : []),
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
    const leftOut = operation
      ? Object.entries(operation.takes)
          .filter(
            ([, input]) =>
              "rules" in input &&
              (input.rules ?? []).some(
                ({ rule, violates }) => violates === "required" && proves.includes(rule),
              ),
          )
          .map(([name]) => name)
      : [];
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
      ...arrange.flatMap(({ call }, i) => checkCall(`arrange.${i}.call`, call, [])),
      ...checkCall("act.call", act.call, leftOut),
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
