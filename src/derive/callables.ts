import type { Trigger } from "../shapes/bindings.ts";
import type { Rules } from "../shapes/roles.ts";
import type { Structure } from "../shapes/specification.ts";
import type { Interface } from "../shapes/target.ts";
import { type AnswerPlace, placeOfAnswer } from "./answer-place.ts";
import type { Exposure } from "./call-of-request.ts";
import { type Places, placesOfInputs } from "./input-places.ts";

// An operation as a step calls it: its inputs and where each is sent, the structure it
// answers and where that sits in the answer.
// fields: the structure's, undefined when it answers none or structures.yaml lacks it
export type Callable = Exposure & {
  readonly takes: NonNullable<Rules["takes"]>;
  readonly unplaced: Places["unplaced"];
  readonly structure: string | null;
  readonly fields: readonly string[] | undefined;
  readonly answer: AnswerPlace;
};

// rules {operation: f, takes: {x: …}, answers: {structure: S}}, trigger of f, "post /s/{x}"
//   -> {operation: f, bound, places: {x: [path, x]}, unplaced: [], structure: S,
//       fields: [id, …], answer: {at: [data]}, takes: {x: …}}
export function callableOf({
  rules,
  trigger,
  bound,
  structures,
}: {
  readonly rules: Rules;
  readonly trigger: Trigger;
  readonly bound: Interface;
  readonly structures: readonly Structure[];
}): Callable {
  const takes = rules.takes ?? {};
  const { places, unplaced } = placesOfInputs({
    inputs: Object.keys(takes),
    sends: trigger.sends,
    bound,
  });
  const { structure } = rules.answers;
  const fields = structures.find((one) => one.structure === structure)?.fields;
  return {
    operation: rules.operation,
    bound,
    places,
    takes,
    unplaced,
    structure,
    fields: fields === undefined ? undefined : Object.keys(fields),
    answer: placeOfAnswer({ structure, shows: trigger.answers.shows, bound }),
  };
}
