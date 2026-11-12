import { z } from "zod";

const callSchema = z
  .strictObject({
    operation: z.string(),
    with: z.record(z.string(), z.json()).readonly().default({}),
    caller: z.string().optional(),
  })
  .readonly();

export type Call = z.infer<typeof callSchema>;

const writtenSchema = {
  scenario: z.string(),
  says: z.string(),
  proves: z.array(z.string()).min(1).readonly(),
};

// A scenario as written: no answer, no value seen. Its schema has no key for them, so a
// predicted value cannot be written.
export const scenarioSchema = z
  .strictObject({
    ...writtenSchema,
    arrange: z
      .array(z.strictObject({ call: callSchema }).readonly())
      .readonly()
      .default([]),
    act: z.strictObject({ call: callSchema }).readonly(),
  })
  .readonly();

export type Scenario = z.infer<typeof scenarioSchema>;

// body: any JSON value; null for an empty body, a string when it is not JSON
export const responseSchema = z
  .strictObject({ status: z.int(), body: z.json() })
  .readonly();

export type TargetResponse = z.infer<typeof responseSchema>;

// { method: "delete", url: "http://h/a/b%20c?x=1", headers: {h: "v"}, body: undefined }
export const httpRequestSchema = z
  .strictObject({
    method: z.enum(["get", "post", "put", "patch", "delete"]),
    url: z.string(),
    headers: z.record(z.string(), z.string()).readonly(),
    body: z.json().optional(),
  })
  .readonly();

export type HttpRequest = z.infer<typeof httpRequestSchema>;

const playedCallSchema = z
  .strictObject({ call: callSchema, response: responseSchema })
  .readonly();

// clock: the time the target was started with, null when it runs on its own
const runSchema = z
  .strictObject({
    target: z.string(),
    version: z.string(),
    at: z.string(),
    clock: z.string().nullable(),
  })
  .readonly();

export type Run = z.infer<typeof runSchema>;

const playedSchema = {
  ...writtenSchema,
  run: runSchema,
  arrange: z.array(playedCallSchema).readonly(),
  act: playedCallSchema,
};

// The written scenario, filled by one execution.
export const playedScenarioSchema = z.strictObject(playedSchema).readonly();

export type PlayedScenario = z.infer<typeof playedScenarioSchema>;

// [act, response, body, a, 0] -> the first element of a in the act's body
export const placeSchema = z.array(z.union([z.string(), z.int()])).readonly();

export type Place = z.infer<typeof placeSchema>;

export const noiseSchema = z
  .strictObject({ at: placeSchema, class: z.int().min(1) })
  .readonly();

export type Noise = z.infer<typeof noiseSchema>;

// A played copy kept, and beside it the places where two executions disagreed.
export const referenceSchema = z
  .strictObject({ ...playedSchema, noise: z.array(noiseSchema).readonly() })
  .readonly();

export type Reference = z.infer<typeof referenceSchema>;

// what two executions answered differently where they must not: a status
export const disagreementSchema = z
  .strictObject({ at: placeSchema, first: z.unknown(), second: z.unknown() })
  .readonly();

export type Disagreement = z.infer<typeof disagreementSchema>;

// what a played copy answered differently from its reference
export const differenceSchema = z
  .strictObject({ at: placeSchema, expected: z.unknown(), actual: z.unknown() })
  .readonly();

export type Difference = z.infer<typeof differenceSchema>;
