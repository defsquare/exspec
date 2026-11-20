import {
  type CallStep,
  type Json,
  jsonSchema,
  type RequestStep,
  type Sent,
} from "../shapes/roles.ts";
import type { TargetResponse } from "../shapes/scenario.ts";
import type { Callable } from "./callables.ts";
import { fillGiven, fillHoles, type Reads } from "./holes.ts";
import { valueAt } from "./json.ts";
import { sentOfCall } from "./sent-of-call.ts";

export type TargetStep = RequestStep | CallStep;

const callableFor = (operation: string, callables: readonly Callable[]) =>
  callables.find((one) => one.operation === operation);

// The request a step is sent as, its holes filled from what the steps named before it read;
// a call through its operation's trigger:
//   {call: {operation: f, with: {x: "{{s.id}}"}}}, s reads {id: 7}, f on "post /s/{x}"
//   -> {sent: {method: post, path: /s/7}}
//   {call: {operation: z, …}} -> {unplayable: 'no reading declares the operation "z"'}
export function sentOfStep(
  step: TargetStep,
  reads: Reads,
  callables: readonly Callable[],
): { readonly sent: Sent } | { readonly unplayable: string } {
  if ("request" in step) return fillHoles(step.request, reads);
  const { operation, with: given } = step.call;
  const callable = callableFor(operation, callables);
  if (callable === undefined) {
    return { unplayable: `no reading declares the operation "${operation}"` };
  }
  const filled = fillGiven(given, reads);
  if ("unplayable" in filled) return filled;
  const sent = sentOfCall({
    call: { operation, with: filled.given },
    places: callable.places,
    bound: callable.bound,
  });
  return "refused" in sent ? { unplayable: sent.refused } : sent;
}

// What a later hole naming the step reads: of a request, its answer; of a call, the
// structure its operation answers, where it sits in the answer — nothing when it is not
// there (a refusal):
//   request, {status: 201, body: {data: {id: 7}}} -> {status: 201, body: {data: {id: 7}}}
//   call answered at [data], the same             -> {id: 7}
export function readOfStep(
  step: TargetStep,
  response: TargetResponse,
  callables: readonly Callable[],
): Json | undefined {
  if ("request" in step) return response;
  const answer = callableFor(step.call.operation, callables)?.answer;
  if (answer === undefined || "none" in answer) return undefined;
  const value = valueAt(response.body, answer.at);
  return value === undefined || value === null ? undefined : jsonSchema.parse(value);
}
