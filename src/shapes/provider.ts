import { z } from "zod";
import { ruleName } from "./roles.ts";
import { shapeSchema } from "./target.ts";

// A system the target calls, as the target's code expects it, rendering a service, under
// exspec/providers/<name>/:
//   provider.yaml     the service it renders, the form of its state, what the target expects
//   interfaces.yaml   where the target calls it, in the notation of the target's interfaces
//   twin.ts           the program that stands for it
//
// provider.yaml:
//   provider: p
//   renders: s
//   state: {shape: {made: int, kept: [string]}, says: "a key not in kept is gone"}
//   expects:
//     - {expect: make-gives-key, on: make, says: "…", source: src/a/b.ts}
//   unsure: ["whether a key is ever answered without x-a"]
// renders: a service of exspec/services/; on: an interface of interfaces.yaml
export const providerSchema = z
  .strictObject({
    provider: z.string(),
    renders: z.string(),
    state: z.strictObject({ shape: shapeSchema, says: z.string() }).readonly(),
    expects: z
      .array(
        z
          .strictObject({
            expect: ruleName,
            on: z.string(),
            says: z.string(),
            source: z.string(),
          })
          .readonly(),
      )
      .readonly(),
    unsure: z.array(z.string()).readonly().default([]),
  })
  .readonly();

export type Provider = z.infer<typeof providerSchema>;
