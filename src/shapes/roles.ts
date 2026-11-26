import { z } from "zod";
import { noiseSchema, responseSchema, runSchema } from "./scenario.ts";
import { methodSchema, sourceSchema as source } from "./target.ts";

// The files of a reading by three roles kept apart, under exspec/:
//   common.yaml                                what holds for the whole system, in its words
//   common-trigger.yaml                        how this target says the refusals of common.yaml
//   operations/<op>/rules.yaml, hints.yaml     what one operation is supposed to do
//   operations/<op>/trigger.yaml               how this target says it: its statuses, its refusals'
//   operations/<op>/scenarios/<slug>.yaml      a scenario: calls, requests, a service's conditions
//   operations/<op>/evidence/<slug>.yaml       what the system answered to it, written by the tool
//   operations/<op>/judgements.yaml            what the judge made of it, written by the tool

export const ruleName = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, "a rule's name is lower-case words joined by dashes");

// service: the service of exspec/services/ the rule rests on
// otherwise: the refusal's name; how it leaves is the trigger's
export const requirementSchema = z
  .strictObject({
    rule: ruleName,
    on: z.string().optional(),
    when: z.string().optional(),
    service: z.string().optional(),
    fact: z.string(),
    otherwise: ruleName,
    source,
  })
  .readonly();

export type Requirement = z.infer<typeof requirementSchema>;

// on: the entry of takes its `when` looks at, when the request alone tells whether it is met
export const effectSchema = z
  .strictObject({
    rule: ruleName,
    when: z.string().optional(),
    on: z.string().optional(),
    says: z.string(),
    service: z.string().optional(),
    source,
  })
  .readonly();

export const commonRuleSchema = z
  .strictObject({
    rule: ruleName,
    "applies-to": z.string(),
    fact: z.string(),
    otherwise: ruleName,
    source,
  })
  .readonly();

const unsureSchema = z
  .array(z.strictObject({ about: z.string(), what: z.string() }).readonly())
  .readonly()
  .default([]);

export const commonSchema = z
  .strictObject({
    target: z.string(),
    rules: z.array(commonRuleSchema).readonly().default([]),
    unsure: unsureSchema,
  })
  .readonly();

export type Common = z.infer<typeof commonSchema>;

const structureFieldSchema = z.tuple([z.string(), z.string()]).readonly();

// takes: {itemId: {says: "the item", field: [Item, id]}, dryRun: {says: "…"}}
// requires: [{rule: a, on: itemId, fact: "…", otherwise: r, source: "…"}], on an entry of takes
// answers: {says: "the item", structure: Item}, structure null when it shows none
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
// form in place of body: {method: post, path: /a, form: {to: "x", copy: true}}
export const stepRequestSchema = z
  .strictObject({
    method: methodSchema,
    path: z.string(),
    query: z.record(z.string(), scalarSchema).readonly().optional(),
    body: z.json().optional(),
    form: z.record(z.string(), scalarSchema).readonly().optional(),
  })
  .refine(({ body, form }) => body === undefined || form === undefined, {
    message: "a request carries a body or a form, not both",
  })
  .readonly();

export type StepRequest = z.infer<typeof stepRequestSchema>;

const givenSchema = z.record(z.string(), z.json()).readonly();

// A step calls an operation of the target, sends it a request, or gives a service a
// condition; its key tells which:
//   {when: arrange, as: a, name: c, call: {operation: f, with: {x: 1, y: "{{b.id}}"}}}
//   {when: call, as: a, name: n, request: {method: post, path: /x}}
//   {when: arrange, service: s, is: refuses, with: {address: "{{n.body.to}}"}}
// as: an actor's name, null for a call by nobody; name: what a later hole cites;
// call.with: a value for each input given, by the input's name; a service step's with: a
// value for each parameter the condition takes; holes filled as in a request
const requestStepSchema = z
  .strictObject({
    when: whenSchema,
    as: z.string().nullable(),
    name: z.string().optional(),
    request: stepRequestSchema,
  })
  .readonly();

export const stepCallSchema = z
  .strictObject({ operation: z.string(), with: givenSchema.default({}) })
  .readonly();

const callStepSchema = z
  .strictObject({
    when: whenSchema,
    as: z.string().nullable(),
    name: z.string().optional(),
    call: stepCallSchema,
  })
  .readonly();

const serviceStepSchema = z
  .strictObject({
    when: whenSchema,
    service: z.string(),
    is: z.string(),
    with: givenSchema.optional(),
  })
  .readonly();

export const stepSchema = z.union([requestStepSchema, callStepSchema, serviceStepSchema]);

export type Step = z.infer<typeof stepSchema>;

// A scenario starts from a state of exspec/states.yaml, an arrange step only:
//   {when: arrange, state: s, name: p}
// what is played holds none: the step is replaced by the steps of the state's path
export const stateStepSchema = z
  .strictObject({ when: z.literal("arrange"), state: z.string(), name: z.string() })
  .readonly();

export const writtenStepSchema = z.union([
  requestStepSchema,
  callStepSchema,
  serviceStepSchema,
  stateStepSchema,
]);

export type WrittenStep = z.infer<typeof writtenStepSchema>;
export type RequestStep = z.infer<typeof requestStepSchema>;
export type CallStep = z.infer<typeof callStepSchema>;
export type StepCall = z.infer<typeof stepCallSchema>;
export type ServiceStep = z.infer<typeof serviceStepSchema>;

export const roleScenarioSchema = z
  .strictObject({
    rule: z.string(),
    situation: z.string(),
    reached: z.union([
      z.literal("yes"),
      z.literal(true),
      z.string().regex(/^no — /, "reached is yes, or `no — why`"),
    ]),
    steps: z.array(writtenStepSchema).min(1).readonly(),
  })
  .readonly();

export type RoleScenario = z.infer<typeof roleScenarioSchema>;

// a scenario as it is played, its state steps replaced
export type PlayableScenario = Omit<RoleScenario, "steps"> & {
  readonly steps: readonly Step[];
};

// a request as sent, its holes filled: a hole alone in a string keeps its value's type
export const sentSchema = z
  .strictObject({
    method: methodSchema,
    path: z.string(),
    query: z.record(z.string(), z.json()).readonly().optional(),
    body: z.json().optional(),
    form: z.record(z.string(), z.json()).readonly().optional(),
  })
  .refine(({ body, form }) => body === undefined || form === undefined, {
    message: "a request carries a body or a form, not both",
  })
  .readonly();

export type Sent = z.infer<typeof sentSchema>;

// What the target sent to a provider while a step was played, and what it was answered:
//   {observable: p, request: {method: post, path: /b, body: {to: x}}, response: {status: 200, body: {id: e}}}
// No header is kept. A file in a body is its length and digest: {bytes: 1234, sha256: "9f…"}.
export const sideEffectSchema = z
  .strictObject({ observable: z.string(), request: sentSchema, response: responseSchema })
  .readonly();

export type SideEffect = z.infer<typeof sideEffectSchema>;

// A step as it was played; a service step is kept as sent, its holes filled:
//   {when: call, as: a, request: {…}, response: {…}, side-effects: […]}
//   {when: arrange, service: s, is: refuses, with: {address: "u@x"}}
// unplayable: why the step could not be sent; the steps after it are not sent either.
// side-effects absent: what the target sent is unknown; []: observed, and it sent nothing.
export const exchangeSchema = z.union([
  z
    .strictObject({
      when: whenSchema,
      as: z.string().nullable(),
      request: sentSchema,
      response: responseSchema,
      "side-effects": z.array(sideEffectSchema).readonly().optional(),
    })
    .readonly(),
  z
    .strictObject({
      when: whenSchema,
      as: z.string().nullable(),
      unplayable: z.string(),
    })
    .readonly(),
  serviceStepSchema,
  z
    .strictObject({
      when: whenSchema,
      service: z.string(),
      is: z.string(),
      unplayable: z.string(),
    })
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

// A judgement of a scenario on its rule, or of a state's sentence on the scenario that is
// its path; its key tells which:
//   {scenario: a, rule: r,  situation: "yes", verdict: contradicted, …, of: h}
//   {scenario: a, state: s, situation: "yes", verdict: holds,        …, of: k}
// of: the hash of the text the judge was given for that part; another text, a stale
// judgement
export const ruleJudgementSchema = judgedSchema
  .unwrap()
  .extend({ rule: z.string(), of: z.string() })
  .readonly();

export const stateJudgementSchema = judgedSchema
  .unwrap()
  .extend({ state: z.string(), of: z.string() })
  .readonly();

export const judgementSchema = z.union([ruleJudgementSchema, stateJudgementSchema]);

export type RuleJudgement = z.infer<typeof ruleJudgementSchema>;
export type StateJudgement = z.infer<typeof stateJudgementSchema>;

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
