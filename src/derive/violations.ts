import type { Call } from "../shapes/scenario.ts";
import type { Operation, Structure } from "../shapes/specification.ts";
import { fieldOf } from "./check-operations.ts";

type Rule = NonNullable<
  Extract<Operation["takes"][string], { readonly field: unknown }>["rules"]
>[number];

export type InputRule = Rule & { readonly input: string };

// takes {a: {rules: [{rule: r, violates: required, otherwise: x}]}}
//   -> [{input: a, rule: r, violates: required, otherwise: x}]
export function inputRulesOf(operation: Operation): readonly InputRule[] {
  return Object.entries(operation.takes).flatMap(([input, taken]) =>
    "rules" in taken ? (taken.rules ?? []).map((rule) => ({ input, ...rule })) : [],
  );
}

const email = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Whether the call violates what the rule names, from the values it gives and the form
// of the field the input is:
//   {p: "1234567"}, p is [S, p] with min-length 8, violates min-length  ->  "present"
// A format other than email is not computed.
export function violationOf({
  call,
  operation,
  structures,
  rule: { input, violates },
}: {
  readonly call: Call;
  readonly operation: Operation;
  readonly structures: readonly Structure[];
  readonly rule: InputRule;
}): "present" | "absent" | "not-computed" {
  const given = Object.hasOwn(call.with, input);
  if (violates === "required") return given ? "absent" : "present";
  if (!given) return "absent";
  const value = call.with[input];
  const taken = operation.takes[input];
  const field = taken && "field" in taken ? fieldOf(structures, taken.field) : undefined;
  if (field === undefined || !("type" in field)) return "not-computed";
  const bound = field[violates];
  if (bound === undefined) return "not-computed";
  const present = (violated: boolean) => (violated ? "present" : "absent");
  switch (violates) {
    case "format":
      if (bound !== "email") return "not-computed";
      return present(typeof value === "string" && !email.test(value));
    case "min-length":
      return present(typeof value === "string" && value.length < Number(bound));
    case "max-length":
      return present(typeof value === "string" && value.length > Number(bound));
    case "min":
      return present(typeof value === "number" && value < Number(bound));
    case "max":
      return present(typeof value === "number" && value > Number(bound));
    default: {
      const unreachable: never = violates;
      return unreachable;
    }
  }
}
