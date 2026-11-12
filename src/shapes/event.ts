import { z } from "zod";
import { gapSchema, problemSchema } from "./extraction.ts";

const commandSchema = z.enum(["status", "check"]);

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
    type: z.literal("command-finished"),
    command: commandSchema,
    ok: z.boolean(),
  }),
]);

export type Event = z.infer<typeof eventSchema>;
