import { z } from "zod";

const scalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const valueTypeSchema = z.enum(["string", "int", "number", "boolean", "instant"]);

const typedFieldSchema = z
  .strictObject({
    type: valueTypeSchema,
    format: z.string().optional(),
    "min-length": z.int().optional(),
    "max-length": z.int().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    shown: z.boolean().optional(),
  })
  .readonly();

const referenceFieldSchema = z
  .strictObject({
    structure: z.string(),
    by: z.literal("identity").optional(),
    many: z.boolean().optional(),
  })
  .readonly();

export const fieldSchema = z.union([typedFieldSchema, referenceFieldSchema]);

export type Field = z.infer<typeof fieldSchema>;

export const structureSchema = z
  .strictObject({
    structure: z.string(),
    identity: z.string(),
    fields: z.record(z.string(), fieldSchema).readonly(),
  })
  .readonly();

export type Structure = z.infer<typeof structureSchema>;

const termSchema = z.union([
  z.strictObject({ caller: z.literal("signed-in") }).readonly(),
  z
    .strictObject({
      structure: z.string(),
      where: z
        .record(z.string(), z.tuple([z.literal("call"), z.string()]).readonly())
        .readonly(),
      "seen-by": z.literal("caller").optional(),
      field: z.array(z.string()).readonly().optional(),
      "must-be": z.union([
        z.tuple([z.literal("exists")]).readonly(),
        z.tuple([z.literal("eq"), scalarSchema]).readonly(),
      ]),
    })
    .readonly(),
]);

export const factSchema = z
  .strictObject({ fact: z.string(), condition: z.array(termSchema).readonly() })
  .readonly();

export type Fact = z.infer<typeof factSchema>;

const structureFieldSchema = z.tuple([z.string(), z.string()]).readonly();

const inputRuleSchema = z
  .strictObject({
    rule: z.string(),
    violates: z.enum(["required", "format", "min-length", "max-length", "min", "max"]),
    otherwise: z.string(),
  })
  .readonly();

const inputSchema = z.union([
  z
    .strictObject({
      field: structureFieldSchema,
      optional: z.boolean().optional(),
      rules: z.array(inputRuleSchema).readonly().optional(),
    })
    .readonly(),
  z
    .strictObject({
      type: valueTypeSchema,
      min: z.number().optional(),
      max: z.number().optional(),
      optional: z.boolean().optional(),
      default: scalarSchema.optional(),
    })
    .readonly(),
]);

const thenSchema = z.union([
  z.literal("nothing-changes"),
  z.strictObject({ says: z.string() }).readonly(),
  z
    .strictObject({
      fact: z.record(z.string(), z.boolean()).readonly().optional(),
      field: z
        .array(
          z
            .strictObject({
              of: structureFieldSchema,
              change: z.union([
                z.tuple([z.enum(["plus", "minus"]), z.number()]).readonly(),
                z.tuple([z.literal("set"), scalarSchema]).readonly(),
              ]),
            })
            .readonly(),
        )
        .readonly()
        .optional(),
    })
    .readonly(),
]);

export const operationSchema = z
  .strictObject({
    operation: z.string(),
    takes: z.record(z.string(), inputSchema).readonly(),
    requires: z
      .array(
        z
          .strictObject({ rule: z.string(), fact: z.string(), otherwise: z.string() })
          .readonly(),
      )
      .readonly()
      .default([]),
    answers: z.string().nullable(),
    effects: z
      .array(
        z
          .strictObject({
            rule: z.string(),
            when: z
              .union([
                z.string(),
                z.tuple([z.enum(["not", "given"]), z.string()]).readonly(),
              ])
              .optional(),
            then: thenSchema,
          })
          .readonly(),
      )
      .readonly()
      .default([]),
  })
  .readonly();

export type Operation = z.infer<typeof operationSchema>;
