import { z } from "zod";
import { gapSchema, problemSchema } from "./extraction.ts";
import {
  differenceSchema,
  disagreementSchema,
  playedScenarioSchema,
} from "./scenario.ts";

const commandSchema = z.enum([
  "status",
  "check",
  "up",
  "down",
  "play",
  "record",
  "replay",
]);

export const countsSchema = z
  .object({
    interfaces: z.int(),
    structures: z.int(),
    facts: z.int(),
    operations: z.int(),
    rules: z.int(),
    projections: z.int(),
    triggers: z.int(),
    scenarios: z.int(),
    references: z.int(),
  })
  .readonly();

export type Counts = z.infer<typeof countsSchema>;

export const eventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("command-started"),
    command: commandSchema,
    dir: z.string(),
  }),
  z.object({
    type: z.literal("extraction-not-found"),
    dir: z.string(),
    expected: z.string(),
  }),
  problemSchema.unwrap().extend({ type: z.literal("problem") }),
  gapSchema.unwrap().extend({ type: z.literal("gap") }),
  z.object({
    type: z.literal("extraction-counted"),
    counts: countsSchema,
  }),
  z.object({
    type: z.literal("target-step"),
    step: z.enum(["start", "alive", "seed", "stop", "reset"]),
    state: z.enum(["started", "done"]),
  }),
  z.object({
    type: z.literal("scenario-played"),
    path: z.string(),
    played: playedScenarioSchema,
  }),
  z.object({
    type: z.literal("scenario-unplayable"),
    path: z.string(),
    message: z.string(),
  }),
  // noise: the number of noisy places
  z.object({ type: z.literal("reference-written"), path: z.string(), noise: z.int() }),
  // a reference exists and the recording was not forced
  z.object({ type: z.literal("reference-kept"), path: z.string() }),
  z.object({
    type: z.literal("scenario-unstable"),
    path: z.string(),
    differences: z.array(disagreementSchema).readonly(),
  }),
  // differences: [] when the replay answers what the reference answered
  z.object({
    type: z.literal("scenario-replayed"),
    path: z.string(),
    differences: z.array(differenceSchema).readonly(),
  }),
  // what ended a command before its end: the target failed to start, a command failed
  z.object({ type: z.literal("command-failed"), message: z.string() }),
  z.object({
    type: z.literal("command-finished"),
    command: commandSchema,
    ok: z.boolean(),
  }),
]);

export type Event = z.infer<typeof eventSchema>;
