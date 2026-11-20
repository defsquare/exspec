import { z } from "zod";
import { ruleName } from "./roles.ts";
import { shapeSchema } from "./target.ts";

// An element of the specification an operation rests on, exspec/services/<name>.yaml; it
// survives the target being rewritten, and says nothing of the wire:
//   service: s
//   says: keeps a document and gives it back by its key
//   conditions:
//     - {condition: forgets-everything, says: no document is kept any longer}
//     - {condition: refuses, takes: {address: string}, says: "…"}
//   unsure: []
// takes: a parameter's name and its wire shape; absent, the condition takes none
export const serviceSchema = z
  .strictObject({
    service: ruleName,
    says: z.string(),
    conditions: z
      .array(
        z
          .strictObject({
            condition: ruleName,
            takes: z.record(z.string(), shapeSchema).readonly().optional(),
            says: z.string(),
          })
          .readonly(),
      )
      .readonly(),
    unsure: z.array(z.string()).readonly().default([]),
  })
  .readonly();

export type Service = z.infer<typeof serviceSchema>;
