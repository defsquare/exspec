import { z } from "zod";
import { ruleName } from "./roles.ts";
import { sourceSchema } from "./target.ts";

// "each" in a path steps into every element of a list: [articles, each]
const showSchema = z
  .strictObject({ structure: z.string(), at: z.array(z.string()).readonly() })
  .readonly();

// locates: how one instance is found, {<field>: [path|query, <name>]};
// absent: the status that means there is no such instance
export const projectionSchema = z
  .strictObject({
    projection: z.string(),
    interface: z.string(),
    shows: z.array(showSchema).readonly(),
    locates: z
      .record(z.string(), z.tuple([z.enum(["path", "query"]), z.string()]).readonly())
      .readonly()
      .optional(),
    absent: z.int().optional(),
  })
  .readonly();

export type Projection = z.infer<typeof projectionSchema>;

// where an input goes: [path, id], [query, q], [form, to], [body, a, b]
export const placeSchema = z.union([
  z.tuple([z.enum(["path", "query", "form"]), z.string()]).readonly(),
  z.tuple([z.literal("body"), z.string()], z.string()).readonly(),
]);

export type InputPlace = z.infer<typeof placeSchema>;

// answers.status: the status an accepted call is answered with, or every one of them;
// a refusal may say its body as it was read
//   {trigger: f, interface: f, operation: f, answers: {status: [200, 302]},
//    refuses: {r: {status: 422, body: "{error: X}"}}}
export const triggerSchema = z
  .strictObject({
    trigger: z.string(),
    interface: z.string(),
    operation: z.string(),
    sends: z.record(z.string(), placeSchema).readonly().default({}),
    answers: z
      .strictObject({
        status: z.union([z.int(), z.array(z.int()).readonly()]),
        shows: z.array(showSchema).readonly().default([]),
      })
      .readonly(),
    refuses: z
      .record(
        z.string(),
        z.strictObject({ status: z.int(), body: z.string().optional() }).readonly(),
      )
      .readonly()
      .default({}),
  })
  .readonly();

export type Trigger = z.infer<typeof triggerSchema>;

// The trigger of the shared rules, exspec/common-trigger.yaml:
//   refuses: {r: {status: 401, body: "{error: X}"}}     how each refusal of common.yaml leaves
//   errors: [{kind: "…", status: 400, body: "…", source: "…"}]     how a refusal is answered, by kind
export const commonTriggerSchema = z
  .strictObject({
    refuses: z
      .record(ruleName, z.strictObject({ status: z.int(), body: z.string() }).readonly())
      .readonly()
      .default({}),
    errors: z
      .array(
        z
          .strictObject({
            kind: z.string(),
            status: z.int(),
            body: z.string(),
            source: sourceSchema,
          })
          .readonly(),
      )
      .readonly()
      .default([]),
  })
  .readonly();

export type CommonTrigger = z.infer<typeof commonTriggerSchema>;

export const bindingsFileSchema = z
  .strictObject({
    projections: z.array(projectionSchema).readonly().default([]),
    triggers: z.array(triggerSchema).readonly().default([]),
  })
  .readonly();
