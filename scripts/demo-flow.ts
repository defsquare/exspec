// The flow of `extract` drawn from events written by hand: no target, no agent. Run it in a
// terminal: `bun run demo:flow`, or `bun run demo:flow 21` to stop after 21 events and
// read the frame they leave.
import { renderFlow } from "../src/cli/render-flow.tsx";
import type { Event } from "../src/shapes/event.ts";

const pause = 400;

const reader = (name: string) => ({ role: "reader" as const, interface: name });
const builder = (name: string) => ({ role: "builder" as const, interface: name });
const judge = (name: string) => ({ role: "judge" as const, interface: name });

const evidence = {
  rule: "answers",
  run: { target: "petclinic", version: "1", at: "2026-01-01T00:00:00Z", clock: null },
  exchanges: [],
};

const long = "update-visit-of-a-pet-of-an-owner";

const events: readonly Event[] = [
  { type: "command-started", command: "extract", dir: "/abs/petclinic" },
  { type: "phase-started", phase: "target" },
  {
    type: "agent-said",
    phase: "target",
    step: "interfaces",
    text: "Reading the controllers.",
  },
  {
    type: "agent-used",
    phase: "target",
    step: "interfaces",
    tool: "Grep",
    about: "@RequestMapping",
  },
  {
    type: "agent-ended",
    phase: "target",
    step: "interfaces",
    turns: 9,
    seconds: 40,
    cost: 0.31,
  },
  {
    type: "gate-checked",
    phase: "target",
    step: "interfaces",
    ok: false,
    findings: ["interfaces.yaml 2.pattern: a pattern starts with /"],
  },
  {
    type: "agent-used",
    phase: "target",
    step: "interfaces",
    tool: "Edit",
    about: "exspec/interfaces.yaml",
  },
  {
    type: "agent-ended",
    phase: "target",
    step: "interfaces",
    turns: 2,
    seconds: 6,
    cost: 0.05,
  },
  { type: "gate-checked", phase: "target", step: "interfaces", ok: true, findings: [] },
  { type: "phase-finished", phase: "target", ok: true },

  { type: "phase-started", phase: "specification" },
  {
    type: "role-skipped",
    role: "structures-reader",
    why: "structures.yaml passes its check",
  },
  { type: "role-started", role: "common-reader" },
  {
    type: "agent-used",
    role: "common-reader",
    tool: "Read",
    about: "src/security/Config.java",
  },
  { type: "agent-ended", role: "common-reader", turns: 6, seconds: 30, cost: 0.4 },
  { type: "gate-checked", role: "common-reader", ok: true, findings: [] },
  { type: "role-finished", role: "common-reader", ok: true },
  { type: "roles-queued", role: "reader", count: 4 },
  {
    type: "role-skipped",
    ...reader("list-owners"),
    why: "its rules and hints pass their check",
  },
  { type: "role-started", ...reader("create-pet") },
  { type: "role-started", ...reader("delete-pet") },
  { type: "role-started", ...reader(long) },
  {
    type: "agent-used",
    ...reader("create-pet"),
    tool: "Read",
    about: "src/pet/PetController.java",
  },
  { type: "agent-used", ...reader("delete-pet"), tool: "Grep", about: "deletePet" },
  {
    type: "agent-used",
    ...reader(long),
    tool: "Read",
    about: "src/visit/VisitController.java",
  },
  { type: "agent-ended", ...reader("delete-pet"), turns: 12, seconds: 50, cost: 0.6 },
  {
    type: "gate-checked",
    ...reader("delete-pet"),
    ok: false,
    findings: ["trigger.yaml: missing", "hints.yaml: missing"],
  },
  { type: "agent-ended", ...reader("create-pet"), turns: 14, seconds: 55, cost: 0.7 },
  { type: "gate-checked", ...reader("create-pet"), ok: true, findings: [] },
  { type: "role-finished", ...reader("create-pet"), ok: true },
  {
    type: "agent-used",
    ...reader("delete-pet"),
    tool: "Edit",
    about: "exspec/operations/delete-pet/rules.yaml",
  },
  { type: "agent-ended", ...reader(long), turns: 11, seconds: 60, cost: 0.65 },
  { type: "gate-checked", ...reader(long), ok: true, findings: [] },
  { type: "role-finished", ...reader(long), ok: true },
  { type: "agent-ended", ...reader("delete-pet"), turns: 3, seconds: 10, cost: 0.1 },
  { type: "gate-checked", ...reader("delete-pet"), ok: true, findings: [] },
  { type: "role-finished", ...reader("delete-pet"), ok: true },
  { type: "phase-finished", phase: "specification", ok: true },

  { type: "phase-started", phase: "proof" },
  { type: "roles-queued", role: "builder", count: 4 },
  { type: "target-step", step: "start", state: "started" },
  { type: "target-step", step: "alive", state: "done" },
  {
    type: "role-skipped",
    ...builder("list-owners"),
    why: "every scenario has its evidence",
  },
  {
    type: "role-skipped",
    ...builder(long),
    why: "every scenario has its evidence",
  },
  { type: "role-started", ...builder("create-pet") },
  { type: "role-started", ...builder("delete-pet") },
  { type: "agent-used", ...builder("create-pet"), tool: "play", about: "2 steps" },
  {
    type: "agent-used",
    ...builder("delete-pet"),
    tool: "Write",
    about: "scenarios/unknown-pet.yaml",
  },
  { type: "agent-ended", ...builder("delete-pet"), turns: 8, seconds: 35, cost: 0.3 },
  {
    type: "gate-checked",
    ...builder("delete-pet"),
    ok: false,
    findings: ["scenarios/unknown-pet.yaml: a when step cannot be played: no actor vet"],
  },
  { type: "agent-ended", ...builder("create-pet"), turns: 10, seconds: 45, cost: 0.35 },
  { type: "gate-checked", ...builder("create-pet"), ok: true, findings: [] },
  { type: "role-finished", ...builder("create-pet"), ok: true },
  { type: "agent-ended", ...builder("delete-pet"), turns: 2, seconds: 8, cost: 0.06 },
  { type: "gate-checked", ...builder("delete-pet"), ok: true, findings: [] },
  { type: "role-finished", ...builder("delete-pet"), ok: true },
  { type: "target-step", step: "stop", state: "done" },
  { type: "steps-played", interface: "create-pet", scenario: "accepted", evidence },
  { type: "steps-played", interface: "delete-pet", scenario: "unknown-pet", evidence },
  { type: "reference-kept", path: "list-owners/all" },
  { type: "reference-written", path: "create-pet/accepted", noise: 1 },
  { type: "reference-written", path: "create-pet/name-missing", noise: 0 },
  { type: "reference-written", path: "delete-pet/unknown-pet", noise: 0 },
  { type: "roles-queued", role: "judge", count: 4 },
  {
    type: "role-skipped",
    ...judge("list-owners"),
    why: "every reference has its judgement",
  },
  {
    type: "role-skipped",
    ...judge(long),
    why: "every reference has its judgement",
  },
  { type: "role-started", ...judge("create-pet") },
  { type: "role-started", ...judge("delete-pet") },
  { type: "agent-ended", ...judge("create-pet"), turns: 1, seconds: 12, cost: 0.08 },
  {
    type: "judgement-written",
    interface: "create-pet",
    scenario: "accepted",
    rule: "answers",
    verdict: "holds",
    confidence: 0.9,
  },
  {
    type: "judgement-written",
    interface: "create-pet",
    scenario: "name-missing",
    rule: "name-present",
    verdict: "contradicted",
    confidence: 0.8,
  },
  { type: "gate-checked", ...judge("create-pet"), ok: true, findings: [] },
  { type: "role-finished", ...judge("create-pet"), ok: true },
  { type: "agent-ended", ...judge("delete-pet"), turns: 1, seconds: 9, cost: 0.05 },
  {
    type: "role-failed",
    ...judge("delete-pet"),
    message: "the agent's session ended in error (error_max_turns)",
  },
  { type: "role-finished", ...judge("delete-pet"), ok: false },
  {
    type: "roles-counted",
    verdicts: { holds: 1, contradicted: 1, "refused-unexpectedly": 0, "not-shown": 0 },
  },
  { type: "phase-finished", phase: "proof", ok: false },
  { type: "command-finished", command: "extract", ok: false },
];

const shown = events.slice(0, Number(process.argv[2] ?? events.length));

await renderFlow(
  (async function* () {
    for (const event of shown) {
      yield event;
      await Bun.sleep(pause);
    }
  })(),
);
