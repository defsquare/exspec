import { z } from "zod";

const methodSchema = z.enum(["get", "post", "put", "patch", "delete"]);

export const targetSchema = z
  .strictObject({
    target: z.string(),
    start: z.array(z.string()).readonly(),
    alive: z
      .strictObject({ method: methodSchema, path: z.string(), status: z.int() })
      .readonly(),
    seed: z.array(z.string()).readonly(),
    reset: z.array(z.string()).readonly(),
    stop: z.array(z.string()).readonly(),
    api: z.strictObject({ "base-url": z.string() }).readonly(),
    credentials: z.string().optional(),
  })
  .readonly();

export type Target = z.infer<typeof targetSchema>;

// A wire shape, as the target writes a body:
//   string | int | number | boolean | any     a leaf
//   null                                      no body
//   {k: X}                                    a map
//   [X]                                       a list of X
//   [maybe, X]  [optional, X]                 X or null; a key that may be absent
//   [schema, N]                               the named shape N
// zod infers no recursive union, so this one type is written beside its schema.
export type Shape =
  | "string"
  | "int"
  | "number"
  | "boolean"
  | "any"
  | null
  | readonly [Shape]
  | readonly ["maybe" | "optional", Shape]
  | readonly ["schema", string]
  | { readonly [key: string]: Shape };

export const shapeSchema: z.ZodType<Shape> = z.lazy(() =>
  z.union([
    z.enum(["string", "int", "number", "boolean", "any"]),
    z.null(),
    z.tuple([z.enum(["maybe", "optional"]), shapeSchema]).readonly(),
    z.tuple([z.literal("schema"), z.string()]).readonly(),
    z.tuple([shapeSchema]).readonly(),
    z.record(z.string(), shapeSchema).readonly(),
  ]),
);

export const namedShapeSchema = z
  .strictObject({ schema: z.string(), shape: shapeSchema })
  .readonly();

export type NamedShape = z.infer<typeof namedShapeSchema>;

const parametersSchema = z.record(z.string(), shapeSchema).readonly();

export const interfaceSchema = z
  .strictObject({
    interface: z.string(),
    method: methodSchema,
    pattern: z.string(),
    request: z
      .strictObject({
        path: parametersSchema.optional(),
        query: parametersSchema.optional(),
        body: shapeSchema.optional(),
        auth: z.enum(["required", "optional", "none"]).optional(),
      })
      .readonly()
      .default({}),
    responses: z
      .record(
        z.string().regex(/^\d{3}$/),
        z.strictObject({ body: shapeSchema }).readonly(),
      )
      .readonly(),
  })
  .readonly();

export type Interface = z.infer<typeof interfaceSchema>;

export const interfacesFileSchema = z
  .strictObject({
    schemas: z.array(namedShapeSchema).readonly().default([]),
    interfaces: z.array(interfaceSchema).readonly(),
  })
  .readonly();
