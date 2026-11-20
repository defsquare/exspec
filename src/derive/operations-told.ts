import type { Callable } from "./callables.ts";

// The operations a builder may call, one line each: its inputs with what they say, what it
// answers and its fields — what a later hole on it reads:
//   - f: takes x (the s), n (a number). Answers S: id, name.
//   - g: takes nothing. Answers no structure a hole can read: the operation answers no structure.
// An input the tool cannot place is told with why: x (the s; cannot be sent: why).
export function operationsTold(callables: readonly Callable[]): readonly string[] {
  return callables.map(({ operation, takes, unplaced, structure, fields, answer }) => {
    const inputs = Object.entries(takes).map(([input, { says }]) => {
      const why = unplaced.find((one) => one.input === input)?.why;
      return `${input} (${says}${why === undefined ? "" : `; cannot be sent: ${why}`})`;
    });
    const answers =
      "none" in answer
        ? `Answers no structure a hole can read: ${answer.none}.`
        : `Answers ${structure}${fields === undefined ? "" : `: ${fields.join(", ")}`}.`;
    return `- ${operation}: takes ${inputs.join(", ") || "nothing"}. ${answers}`;
  });
}
