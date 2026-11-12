import { z } from "zod";

export const eventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("command-started"),
    command: z.literal("status"),
    dir: z.string(),
  }),
  z.object({
    type: z.literal("extraction-not-found"),
    dir: z.string(),
    expected: z.string(),
  }),
  z.object({
    type: z.literal("command-finished"),
    command: z.literal("status"),
    ok: z.boolean(),
  }),
]);

export type Event = z.infer<typeof eventSchema>;
