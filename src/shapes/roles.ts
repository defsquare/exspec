import { z } from "zod";
import { noiseSchema, responseSchema, runSchema } from "./scenario.ts";
import { methodSchema } from "./target.ts";

// The files of a reading by three roles kept apart, under exspec/roles/:
//   common.yaml                        what holds for the whole system
//   <interface>/rules.yaml, hints.yaml what one operation is supposed to do
//   <interface>/scenarios/<slug>.yaml  a scenario, requests only
//   <interface>/evidence/<slug>.yaml   what the system answered to it, written by the tool
//   <interface>/judgements.yaml        what the judge made of it, written by the tool

const ruleName = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, "a rule's name is lower-case words joined by dashes");
const source = z
  .string()
  .regex(/\.\w+:\d+/, "a source is path/to/File.ext:line or :from-to");

const refusalSchema = z
  .strictObject({ refusal: ruleName, status: z.int(), body: z.string() })
  .readonly();

export const requirementSchema = z
  .strictObject({
    rule: ruleName,
    on: z.string().optional(),
    when: z.string().optional(),
    fact: z.string(),
    otherwise: refusalSchema,
    source,
  })
  .readonly();

export type Requirement = z.infer<typeof requirementSchema>;

export const effectSchema = z
  .strictObject({ rule: ruleName, when: z.string().optional(), says: z.string(), source })
  .readonly();

export const commonRuleSchema = z
  .strictObject({
    rule: ruleName,
    "applies-to": z.string(),
    fact: z.string(),
    otherwise: refusalSchema,
    source,
  })
  .readonly();

export const commonSchema = z
  .strictObject({
    target: z.string(),
    "runs-with": z
      .array(z.strictObject({ setting: z.string(), source }).readonly())
      .readonly()
      .default([]),
    rules: z.array(commonRuleSchema).readonly().default([]),
    errors: z
      .array(
        z
          .strictObject({ kind: z.string(), status: z.int(), body: z.string(), source })
          .readonly(),
      )
      .readonly()
      .default([]),
    contract: z.array(z.string()).readonly().default([]),
    unsure: z
      .array(z.strictObject({ about: z.string(), what: z.string() }).readonly())
      .readonly()
      .default([]),
  })
  .readonly();

export type Common = z.infer<typeof commonSchema>;

const structureFieldSchema = z.tuple([z.string(), z.string()]).readonly();

// takes: {itemId: {says: "the item", field: [Item, id]}, dryRun: {says: "…"}}
// requires: [{rule: a, on: itemId, fact: "…", otherwise: {…}, source: "…"}], on an entry of takes
// answers: {says: "200 with the item", structure: Item}, structure null when it shows none
// unsure.rule: a rule of the file, a name under common, or "answers"
export const rulesSchema = z
  .strictObject({
    operation: z.string(),
    takes: z
      .record(
        z.string(),
        z
          .strictObject({ says: z.string(), field: structureFieldSchema.optional() })
          .readonly(),
      )
      .readonly()
      .nullable()
      .default({}),
    common: z.array(ruleName).readonly().default([]),
    requires: z.array(requirementSchema).readonly().default([]),
    effects: z.array(effectSchema).readonly().default([]),
    answers: z
      .strictObject({ says: z.string(), structure: z.string().nullable() })
      .readonly(),
    unsure: z
      .array(z.strictObject({ rule: z.string(), what: z.string() }).readonly())
      .readonly()
      .default([]),
  })
  .readonly();

export type Rules = z.infer<typeof rulesSchema>;

export const hintsSchema = z
  .array(
    z
      .strictObject({
        rule: ruleName,
        situation: z.string(),
        how: z.string(),
        "seen-in": z.string(),
        reachable: z.union([
          z.literal("yes"),
          z.literal(true),
          z
            .string()
            .regex(
              /^(no|unsure) — /,
              "reachable is yes, or `no — why`, or `unsure — why`",
            ),
        ]),
      })
      .readonly(),
  )
  .readonly();

export type Hints = z.infer<typeof hintsSchema>;

export const whenSchema = z.enum(["arrange", "before", "call", "after"]);

const scalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

// a request as a builder writes it, holes and all: {method: get, path: "/a/{{m.body.id}}"}
export const stepRequestSchema = z
  .strictObject({
    method: methodSchema,
    path: z.string(),
    query: z.record(z.string(), scalarSchema).readonly().optional(),
    body: z.json().optional(),
  })
  .readonly();

export type StepRequest = z.infer<typeof stepRequestSchema>;

// as: an actor's name, null for a call by nobody; name: what a later hole cites
export const stepSchema = z
  .strictObject({
    when: whenSchema,
    as: z.string().nullable(),
    name: z.string().optional(),
    request: stepRequestSchema,
  })
  .readonly();

export type Step = z.infer<typeof stepSchema>;

export const roleScenarioSchema = z
  .strictObject({
    rule: z.string(),
    situation: z.string(),
    reached: z.union([
      z.literal("yes"),
      z.literal(true),
      z.string().regex(/^no — /, "reached is yes, or `no — why`"),
    ]),
    steps: z.array(stepSchema).min(1).readonly(),
  })
  .readonly();

export type RoleScenario = z.infer<typeof roleScenarioSchema>;

// a request as sent, its holes filled: a hole alone in a string keeps its value's type
export const sentSchema = z
  .strictObject({
    method: methodSchema,
    path: z.string(),
    query: z.record(z.string(), z.json()).readonly().optional(),
    body: z.json().optional(),
  })
  .readonly();

export type Sent = z.infer<typeof sentSchema>;

// unplayable: why the step could not be sent; the steps after it are not sent either
export const exchangeSchema = z.union([
  z
    .strictObject({
      when: whenSchema,
      as: z.string().nullable(),
      request: sentSchema,
      response: responseSchema,
    })
    .readonly(),
  z
    .strictObject({ when: whenSchema, as: z.string().nullable(), unplayable: z.string() })
    .readonly(),
]);

export type Exchange = z.infer<typeof exchangeSchema>;

export const evidenceSchema = z
  .strictObject({
    rule: z.string(),
    run: runSchema,
    exchanges: z.array(exchangeSchema).readonly(),
    // absent: played once; present, even []: a reference, the places starting at the exchange
    noise: z.array(noiseSchema).readonly().optional(),
  })
  .readonly();

export type Evidence = z.infer<typeof evidenceSchema>;

export const verdictSchema = z.enum([
  "holds",
  "contradicted",
  "refused-unexpectedly",
  "not-shown",
]);

// one entry of the judge's answer
export const judgedSchema = z
  .strictObject({
    scenario: z.string(),
    situation: z.enum(["yes", "no", "partly"]),
    verdict: verdictSchema,
    confidence: z.number().min(0).max(1),
    evidence: z.string(),
  })
  .readonly();

export type Judged = z.infer<typeof judgedSchema>;

// of: the hash of the text the judge was given for that scenario; another text, a stale
// judgement
export const judgementSchema = judgedSchema
  .unwrap()
  .extend({ rule: z.string(), of: z.string() })
  .readonly();

export type Judgement = z.infer<typeof judgementSchema>;

export const judgementsSchema = z
  .strictObject({
    model: z.string(),
    at: z.string(),
    judgements: z.array(judgementSchema).readonly(),
  })
  .readonly();

export type Judgements = z.infer<typeof judgementsSchema>;

// "a: [" -> {findings: ["f: not YAML: …"]}; {a: 1} against {a: string} -> {findings: ["f: a: …"]}
export function readYaml<T>(
  file: string,
  text: string,
  schema: z.ZodType<T>,
): { readonly value: T } | { readonly findings: readonly string[] } {
  let yaml: unknown;
  try {
    yaml = Bun.YAML.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { findings: [`${file}: not YAML: ${message.split("\n")[0]}`] };
  }
  const parsed = schema.safeParse(yaml);
  if (parsed.success) return { value: parsed.data };
  return {
    findings: parsed.error.issues.map(
      ({ path, message }) =>
        `${file}: ${path.map(String).join(".") || "(file)"}: ${message}`,
    ),
  };
}

export const jsonSchema = z.json();

export type Json = z.infer<typeof jsonSchema>;
