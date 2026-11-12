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
  readonly now: () => string;
  readonly version: string;
};
