import type { State } from "../shapes/state.ts";
import { partsOfPath } from "./check-states.ts";

// What the states' reader is asked of the states it gathers, beyond the file's own check;
// rules: "<operation>/<rule>" for each rule an operation read can own
//   {state: s, path: f/x}           -> 's: its path is f/x: the path of a state is <operation>/answers'
//   serves [g/r, g/q]               -> 's: it serves rules of one operation: a state serves two at least'
//   serves [g/r, h/zz], h/zz none   -> 's: "h/zz" is not a rule of an operation read'
export function checkGathered({
  states,
  rules,
}: {
  readonly states: readonly State[];
  readonly rules: readonly string[];
}): readonly string[] {
  return states.flatMap(({ state, path, serves }) => [
    ...(partsOfPath(path).slug === "answers"
      ? []
      : [`${state}: its path is ${path}: the path of a state is <operation>/answers`]),
    ...(new Set(serves.map((rule) => partsOfPath(rule).operation)).size >= 2
      ? []
      : [`${state}: it serves rules of one operation: a state serves two at least`]),
    ...serves
      .filter((rule) => !rules.includes(rule))
      .map((rule) => `${state}: "${rule}" is not a rule of an operation read`),
  ]);
}
