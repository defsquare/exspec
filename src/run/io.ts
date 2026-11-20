import type { ConditionTaken } from "../io/providers.ts";
import type { ConditionGiven, ConditionOfTwin, TwinTrial } from "../io/twins.ts";
import type { SideEffect } from "../shapes/roles.ts";
import type { HttpRequest, Reference, TargetResponse } from "../shapes/scenario.ts";
import type { Credentials, Target } from "../shapes/target.ts";

// what a run does to the world, passed in so a test passes fakes
export type Io = {
  readonly runLines: (lines: readonly string[], cwd: string) => Promise<void>;
  readonly send: (request: HttpRequest) => Promise<TargetResponse>;
  readonly sleep: (milliseconds: number) => Promise<void>;
  readonly readCredentials: (dir: string, target: Target) => Promise<Credentials>;
  readonly writeReference: (
    dir: string,
    path: string,
    reference: Reference,
  ) => Promise<void>;
  // what the target sent to its providers since the last take; absent: nothing observes
  readonly takeSideEffects?: () => Promise<readonly SideEffect[]>;
  // the providers back to their start: what was recorded, dropped; each twin given its
  // fresh state
  readonly resetProviders?: () => Promise<void>;
  // a service given a condition by the twin of the provider that renders it:
  //   {service: s, condition: refuses, with: {address: "u@x"}} -> {taken: true}
  //   no provider renders s, or its twin refuses               -> {refused: "…"}
  // absent: no provider is stood
  readonly giveCondition?: (given: ConditionGiven) => Promise<ConditionTaken>;
  // the twin of <dir>/exspec/providers/<name> served a moment: its state read, put back
  // and read again, then each condition given on a fresh state; {failed: "…"} when it did
  // not come up or did not answer
  readonly tryTwin?: (
    dir: string,
    name: string,
    conditions: readonly ConditionOfTwin[],
  ) => Promise<TwinTrial>;
  readonly now: () => string;
  readonly version: string;
};
