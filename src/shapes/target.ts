import { z } from "zod";

export const methodSchema = z.enum(["get", "post", "put", "patch", "delete"]);

export const sourceSchema = z
  .string()
  .regex(/\.\w+:\d+/, "a source is path/to/File.ext:line or :from-to");

// {observable: p, kind: provider}: a system the target calls, stood in for by its twin
// exspec/providers/p/twin.ts, served by exspec on a port of its own
export const observableSchema = z
  .strictObject({
    observable: z
      .string()
      .regex(
        /^[a-z][a-z0-9-]*$/,
        "an observable's name is lower-case words joined by dashes",
      ),
    kind: z.literal("provider"),
  })
  .readonly();

export type Observable = z.infer<typeof observableSchema>;

// quiet: the milliseconds of silence at the proxy that end a step
export const proxySchema = z
  .strictObject({ port: z.int(), quiet: z.int().default(150) })
  .readonly();

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
    proxy: proxySchema.optional(),
    observables: z.array(observableSchema).readonly().optional(),
    // what the start sets that changes how the system answers:
    //   [{setting: "a is on", source: "exspec/target/compose.yaml:12"}]
    "runs-with": z
      .array(z.strictObject({ setting: z.string(), source: sourceSchema }).readonly())
      .readonly()
      .optional(),
  })
  .refine(
    ({ proxy, observables }) => (proxy === undefined) === (observables === undefined),
    {
      message: "proxy and observables go together: one is given without the other",
    },
  )
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
        form: parametersSchema.optional(),
        auth: z.enum(["required", "optional", "none"]).optional(),
      })
      .readonly()
      .default({}),
    // headers: the headers the caller reads, {x-a: string}
    responses: z
      .record(
        z.string().regex(/^\d{3}$/),
        z
          .strictObject({
            body: shapeSchema,
            headers: z.record(z.string(), shapeSchema).readonly().optional(),
          })
          .readonly(),
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

// written by the seed: { alice: { Authorization: "Token …" } }
export const credentialsSchema = z
  .record(z.string(), z.record(z.string(), z.string()).readonly())
  .readonly();

export type Credentials = z.infer<typeof credentialsSchema>;
