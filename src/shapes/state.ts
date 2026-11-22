import { z } from "zod";
import { ruleName } from "./roles.ts";

// A situation of the system, named by what a reading shows once in it; one entry of
// exspec/states.yaml:
//   - {state: s, of: [A], seen: "reading the a shows …", path: f/accepted, serves: [g/r]}
// path: the scenario that reaches it, <operation>/<scenario>; serves: the rules that need it
export const stateSchema = z
  .strictObject({
    state: ruleName,
    of: z.array(z.string()).readonly(),
    seen: z.string(),
    path: z.string().regex(/^[^/]+\/[^/]+$/),
    serves: z.array(z.string()).readonly().default([]),
  })
  .readonly();

export const statesFileSchema = z.array(stateSchema).readonly();

export type State = z.infer<typeof stateSchema>;
