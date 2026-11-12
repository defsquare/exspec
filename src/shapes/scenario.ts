import { z } from "zod";

const callSchema = z
  .strictObject({
    operation: z.string(),
    with: z.record(z.string(), z.json()).readonly().default({}),
    caller: z.string().optional(),
  })
  .readonly();

export type Call = z.infer<typeof callSchema>;

// A scenario as written: no answer, no value seen. Its schema has no key for them, so a
// predicted value cannot be written.
export const scenarioSchema = z
  .strictObject({
    scenario: z.string(),
    says: z.string(),
    proves: z.array(z.string()).readonly(),
    arrange: z
      .array(z.strictObject({ call: callSchema }).readonly())
      .readonly()
      .default([]),
    act: z.strictObject({ call: callSchema }).readonly(),
  })
  .readonly();

export type Scenario = z.infer<typeof scenarioSchema>;
