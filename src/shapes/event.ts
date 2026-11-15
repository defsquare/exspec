import { z } from "zod";
import { gapSchema, problemSchema } from "./extraction.ts";
import { evidenceSchema, verdictSchema } from "./roles.ts";
import {
  differenceSchema,
  disagreementSchema,
  playedScenarioSchema,
} from "./scenario.ts";

const commandSchema = z.enum([
  "status",
  "check",
  "up",
  "down",
  "play",
  "record",
  "replay",
  "extract",
  "verdicts",
  "roles-read",
  "roles-build",
  "roles-judge",
  "roles-play",
]);

export const phaseSchema = z.enum([
  "target",
  "interfaces",
  "specification",
  "scenarios",
  "record",
]);

export type Phase = z.infer<typeof phaseSchema>;

export const roleSchema = z.enum([
  "structures-reader",
  "common-reader",
  "reader",
  "builder",
  "judge",
]);

export type Role = z.infer<typeof roleSchema>;

// the session a role's event comes from: one per interface, but the common reader's
const bySchema = { role: roleSchema, interface: z.string().optional() };

const progressSchema = z.enum(["done", "to-do"]);

export const phasesSchema = z
  .object({
    target: progressSchema,
    interfaces: progressSchema,
    specification: progressSchema,
    scenarios: progressSchema,
    record: progressSchema,
  })
  .readonly();

export type Phases = z.infer<typeof phasesSchema>;

export const countsSchema = z
  .object({
    interfaces: z.int(),
    structures: z.int(),
    facts: z.int(),
    operations: z.int(),
    rules: z.int(),
    projections: z.int(),
    triggers: z.int(),
    scenarios: z.int(),
    references: z.int(),
  })
  .readonly();

export type Counts = z.infer<typeof countsSchema>;

// what one scenario says of a rule it proves
export const ruleVerdictSchema = z
  .object({
    rule: z.string(),
    verdict: z.enum(["verified", "refuted", "not-exercised", "unjudged", "ambiguous"]),
    reason: z.string().optional(),
  })
  .readonly();

export type RuleVerdict = z.infer<typeof ruleVerdictSchema>;

// what one scenario says of its operation's trigger: expected, what was declared and not
// seen ("not-found declared 404"); observed, the status answered
export const bindingVerdictSchema = z
  .object({
    verdict: z.enum(["verified", "refuted", "not-exercised"]),
    expected: z.string().optional(),
    observed: z.int().optional(),
  })
  .readonly();

export type BindingVerdict = z.infer<typeof bindingVerdictSchema>;

// a rule over every reference: refuted if one refutes it, else verified if one verifies
// it, else declared only — reason: why no scenario judges it
export const ruleJudgedSchema = z.object({
  type: z.literal("rule-judged"),
  operation: z.string(),
  rule: z.string(),
  provenance: z.enum(["verified", "refuted", "declared-only"]),
  reason: z.string().optional(),
  by: z
    .array(
      ruleVerdictSchema.unwrap().omit({ rule: true }).extend({ scenario: z.string() }),
    )
    .readonly(),
});

export type RuleJudged = z.infer<typeof ruleJudgedSchema>;

export const bindingJudgedSchema = z.object({
  type: z.literal("binding-judged"),
  trigger: z.string(),
  provenance: z.enum(["verified", "refuted", "declared-only"]),
  by: z.array(bindingVerdictSchema.unwrap().extend({ scenario: z.string() })).readonly(),
});

export type BindingJudged = z.infer<typeof bindingJudgedSchema>;

// a fact unknown before the judged call, and the rules it leaves ambiguous or unjudged
export const factBlocksSchema = z.object({
  type: z.literal("fact-blocks"),
  fact: z.string(),
  why: z.string(),
  rules: z.array(z.string()).readonly(),
});

export type FactBlocks = z.infer<typeof factBlocksSchema>;

const agentSaid = z.object({ type: z.literal("agent-said"), text: z.string() });
// about: the file a tool works on, or the first line of a shell command
const agentUsed = z.object({
  type: z.literal("agent-used"),
  tool: z.string(),
  about: z.string(),
});
// cost: in USD, when known
const agentEnded = z.object({
  type: z.literal("agent-ended"),
  turns: z.int(),
  seconds: z.number(),
  cost: z.number().optional(),
});

// what an agent's session says and does, before it is known which phase it serves
export const agentEventSchema = z.discriminatedUnion("type", [
  agentSaid,
  agentUsed,
  agentEnded,
]);

export type AgentEvent = z.infer<typeof agentEventSchema>;

// Not a discriminated union: an agent's event and a gate's come from a phase or from a role,
// two shapes under one type.
export const eventSchema = z.union([
  z.object({
    type: z.literal("command-started"),
    command: commandSchema,
    dir: z.string(),
  }),
  z.object({
    type: z.literal("extraction-not-found"),
    dir: z.string(),
    expected: z.string(),
  }),
  problemSchema.unwrap().extend({ type: z.literal("problem") }),
  gapSchema.unwrap().extend({ type: z.literal("gap") }),
  z.object({
    type: z.literal("extraction-counted"),
    counts: countsSchema,
  }),
  z.object({ type: z.literal("extraction-phases"), phases: phasesSchema }),
  z.object({
    type: z.literal("target-step"),
    step: z.enum(["start", "alive", "seed", "stop", "reset"]),
    state: z.enum(["started", "done"]),
  }),
  z.object({
    type: z.literal("scenario-played"),
    path: z.string(),
    played: playedScenarioSchema,
  }),
  z.object({
    type: z.literal("scenario-unplayable"),
    path: z.string(),
    message: z.string(),
  }),
  // noise: the number of noisy places
  z.object({ type: z.literal("reference-written"), path: z.string(), noise: z.int() }),
  // a reference exists and the recording was not forced
  z.object({ type: z.literal("reference-kept"), path: z.string() }),
  z.object({
    type: z.literal("scenario-unstable"),
    path: z.string(),
    differences: z.array(disagreementSchema).readonly(),
  }),
  // differences: [] when the replay answers what the reference answered
  z.object({
    type: z.literal("scenario-replayed"),
    path: z.string(),
    differences: z.array(differenceSchema).readonly(),
  }),
  // the verdicts of one played copy, its noise unknown
  z.object({
    type: z.literal("scenario-judged"),
    path: z.string(),
    rules: z.array(ruleVerdictSchema).readonly(),
    binding: bindingVerdictSchema,
  }),
  ruleJudgedSchema,
  bindingJudgedSchema,
  factBlocksSchema,
  z.object({
    type: z.literal("extraction-judged"),
    rules: z.object({ verified: z.int(), refuted: z.int(), "declared-only": z.int() }),
    bindings: z.object({ verified: z.int(), refuted: z.int(), "declared-only": z.int() }),
  }),
  // what no verdict sees: a refused call that still wrote something
  z.object({ type: z.literal("not-observed"), what: z.literal("side-effects") }),
  z.object({ type: z.literal("phase-started"), phase: phaseSchema }),
  // the files say it is done already
  z.object({ type: z.literal("phase-skipped"), phase: phaseSchema }),
  agentSaid.extend({ phase: phaseSchema }),
  agentUsed.extend({ phase: phaseSchema }),
  agentEnded.extend({ phase: phaseSchema }),
  // findings: [] when the gate passes; else what is sent back to the agent
  z.object({
    type: z.literal("gate-checked"),
    phase: phaseSchema,
    ok: z.boolean(),
    findings: z.array(z.string()).readonly(),
  }),
  z.object({ type: z.literal("phase-finished"), phase: phaseSchema, ok: z.boolean() }),
  z.object({ type: z.literal("role-started"), ...bySchema }),
  // why: its files pass already, or what it needs is not there
  z.object({ type: z.literal("role-skipped"), ...bySchema, why: z.string() }),
  agentSaid.extend(bySchema),
  agentUsed.extend(bySchema),
  agentEnded.extend(bySchema),
  z.object({
    type: z.literal("gate-checked"),
    ...bySchema,
    ok: z.boolean(),
    findings: z.array(z.string()).readonly(),
  }),
  z.object({ type: z.literal("role-finished"), ...bySchema, ok: z.boolean() }),
  // scenario: its slug
  z.object({
    type: z.literal("steps-played"),
    interface: z.string(),
    scenario: z.string(),
    evidence: evidenceSchema,
  }),
  z.object({
    type: z.literal("judgement-written"),
    interface: z.string(),
    scenario: z.string(),
    rule: z.string(),
    verdict: verdictSchema,
    confidence: z.number(),
  }),
  // every judgement of every interface, by verdict
  z.object({
    type: z.literal("roles-counted"),
    verdicts: z.record(verdictSchema, z.int()),
  }),
  // what ended a command before its end: the target failed to start, a command failed
  z.object({ type: z.literal("command-failed"), message: z.string() }),
  z.object({
    type: z.literal("command-finished"),
    command: commandSchema,
    ok: z.boolean(),
  }),
]);

export type Event = z.infer<typeof eventSchema>;
