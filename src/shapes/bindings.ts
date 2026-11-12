import { z } from "zod";

// "each" in a path steps into every element of a list: [articles, each]
const showSchema = z
  .strictObject({ structure: z.string(), at: z.array(z.string()).readonly() })
  .readonly();

export const projectionSchema = z
  .strictObject({
    projection: z.string(),
    interface: z.string(),
    shows: z.array(showSchema).readonly(),
  })
  .readonly();

export type Projection = z.infer<typeof projectionSchema>;

const placeSchema = z.union([
  z.tuple([z.enum(["path", "query"]), z.string()]).readonly(),
  z.tuple([z.literal("body"), z.string()], z.string()).readonly(),
]);

export const triggerSchema = z
  .strictObject({
    trigger: z.string(),
    interface: z.string(),
    operation: z.string(),
    sends: z.record(z.string(), placeSchema).readonly().default({}),
    answers: z
      .strictObject({
        status: z.int(),
        shows: z.array(showSchema).readonly().default([]),
      })
      .readonly(),
    refuses: z
      .record(z.string(), z.strictObject({ status: z.int() }).readonly())
      .readonly()
      .default({}),
  })
  .readonly();

export type Trigger = z.infer<typeof triggerSchema>;

export const bindingsFileSchema = z
  .strictObject({
    projections: z.array(projectionSchema).readonly().default([]),
    triggers: z.array(triggerSchema).readonly().default([]),
  })
  .readonly();
