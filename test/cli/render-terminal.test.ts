import { expect, test } from "bun:test";
import { describeEvent } from "../../src/cli/render-terminal.tsx";
import type { Event } from "../../src/shapes/event.ts";

test("describeEvent words each event", () => {
  const events: readonly Event[] = [
    { type: "command-started", command: "status", dir: "/abs/dir" },
    { type: "extraction-not-found", dir: "/abs/dir", expected: "/abs/dir/specimen" },
    {
      type: "extraction-counted",
      counts: {
        interfaces: 9,
        structures: 3,
        facts: 5,
        operations: 5,
        rules: 20,
        projections: 4,
        triggers: 5,
        scenarios: 4,
        references: 0,
      },
    },
    {
      type: "extraction-phases",
      phases: {
        target: "done",
        interfaces: "done",
        reading: "to-do",
        evidence: "to-do",
        judgement: "to-do",
      },
    },
    { type: "problem", file: "f.yaml", at: "a.0", message: "m" },
    { type: "problem", file: "f.yaml", at: "", message: "m" },
    { type: "gap", kind: "rule-without-scenario", name: "f/r", message: "m" },
    { type: "target-step", step: "alive", state: "done" },
    {
      type: "scenario-played",
      path: "f/a",
      played: {
        scenario: "s",
        says: "s",
        proves: ["r"],
        run: { target: "t", version: "v", at: "2026-11-13T10:00:00.000Z", clock: null },
        arrange: [],
        act: {
          call: { operation: "f", with: {} },
          response: { status: 400, body: null },
        },
      },
    },
    { type: "scenario-unplayable", path: "f/a", message: "m" },
    { type: "reference-written", path: "f/a", noise: 3 },
    { type: "reference-kept", path: "f/a" },
    {
      type: "scenario-unstable",
      path: "f/a",
      differences: [{ at: ["act", "response", "status"], first: 200, second: 500 }],
    },
    { type: "scenario-replayed", path: "f/a", differences: [] },
    {
      type: "scenario-replayed",
      path: "f/a",
      differences: [
        { at: ["act", "response", "body", "x"], expected: 1, actual: 2 },
        { at: ["act", "response", "body", "y", 0], expected: "a", actual: null },
      ],
    },
    { type: "phase-started", phase: "interfaces" },
    { type: "phase-skipped", phase: "target" },
    { type: "gate-checked", phase: "interfaces", ok: true, findings: [] },
    { type: "gate-checked", phase: "interfaces", ok: false, findings: ["a", "b"] },
    { type: "phase-finished", phase: "interfaces", ok: false },
    { type: "agent-said", phase: "target", text: `${"a".repeat(170)}\nb` },
    { type: "agent-used", phase: "target", tool: "Bash", about: "docker compose up" },
    { type: "agent-ended", phase: "target", turns: 12, seconds: 61.5, cost: 0.4321 },
    { type: "agent-ended", phase: "target", turns: 1, seconds: 2 },
    { type: "command-failed", message: "m" },
    { type: "command-finished", command: "check", ok: false },
  ];
  expect(events.map(describeEvent)).toEqual([
    "status /abs/dir",
    "no extraction in /abs/dir: /abs/dir/specimen is missing",
    "9 interfaces, 3 structures, 5 facts, 5 operations, 20 rules, 4 projections, 5 triggers, 4 scenarios, 0 references",
    "phases   target done, interfaces done, reading to-do, evidence to-do, judgement to-do",
    "problem  f.yaml a.0: m",
    "problem  f.yaml: m",
    "gap      rule-without-scenario f/r",
    "target   alive done",
    "played   f/a  400",
    "unplayable f/a: m",
    "written  f/a  3 noisy",
    "kept     f/a  a reference exists, --force to replace it",
    "unstable f/a\n  act.response.status: 200, then 500",
    "replayed f/a  green",
    'replayed f/a  red  act.response.body.x: expected 1, got 2\n  act.response.body.y.0: expected "a", got null',
    "phase    interfaces",
    "phase    target done already",
    "gate     interfaces passed",
    "gate     interfaces failed\n  a\n  b",
    "phase    interfaces failed",
    `agent    ${"a".repeat(160)}`,
    "  Bash  docker compose up",
    "agent    ended: 12 turns, 61.5 s, $0.43",
    "agent    ended: 1 turns, 2 s",
    "failed   m",
    "check failed",
  ]);
});

test("describeEvent words the verdicts", () => {
  const events: readonly Event[] = [
    {
      type: "rule-judged",
      operation: "rename-item",
      rule: "owner",
      provenance: "refuted",
      by: [
        {
          scenario: "rename-item/not-the-owner",
          verdict: "refuted",
          reason: "accepted where the fact was false",
        },
        { scenario: "rename-item/owner", verdict: "verified" },
      ],
    },
    {
      type: "rule-judged",
      operation: "f",
      rule: "r",
      provenance: "declared-only",
      by: [{ scenario: "f/a", verdict: "ambiguous", reason: "q: the fact is unknown" }],
    },
    {
      type: "rule-judged",
      operation: "f",
      rule: "q",
      provenance: "declared-only",
      reason: "no scenario proves it",
      by: [],
    },
    {
      type: "rule-judged",
      operation: "f",
      rule: "s",
      provenance: "verified",
      by: [{ scenario: "f/a", verdict: "verified" }],
    },
    {
      type: "binding-judged",
      trigger: "put-item",
      provenance: "refuted",
      by: [
        { scenario: "rename-item/owner", verdict: "verified" },
        {
          scenario: "rename-item/unknown",
          verdict: "refuted",
          expected: "not-found declared 404",
          observed: 401,
        },
      ],
    },
    {
      type: "binding-judged",
      trigger: "t",
      provenance: "declared-only",
      by: [{ scenario: "f/a", verdict: "not-exercised" }],
    },
    { type: "binding-judged", trigger: "u", provenance: "declared-only", by: [] },
    {
      type: "extraction-judged",
      rules: { verified: 3, refuted: 1, "declared-only": 2 },
      bindings: { verified: 1, refuted: 1, "declared-only": 0 },
    },
    {
      type: "scenario-judged",
      path: "f/a",
      rules: [
        { rule: "q", verdict: "ambiguous", reason: "p: the fact was false" },
        { rule: "r", verdict: "verified" },
      ],
      binding: { verdict: "refuted", observed: 500 },
    },
    {
      type: "fact-blocks",
      fact: "p",
      why: "it has no condition",
      rules: ["f/q", "f/r"],
    },
    { type: "not-observed", what: "side-effects" },
  ];
  expect(events.map(describeEvent)).toEqual([
    "rule     rename-item/owner  refuted  by rename-item/not-the-owner (accepted where the fact was false)",
    "rule     f/r  declared-only  by f/a (ambiguous: q: the fact is unknown)",
    "rule     f/q  declared-only  no scenario proves it",
    "rule     f/s  verified  by f/a",
    "binding  put-item  refuted  by rename-item/unknown: not-found declared 404, answered 401",
    "binding  t  declared-only  by f/a: not-exercised",
    "binding  u  declared-only",
    "judged   rules 3 verified, 1 refuted, 2 declared-only; bindings 1 verified, 1 refuted, 0 declared-only",
    "judged   f/a  q ambiguous (p: the fact was false), r verified, binding answered 500",
    "blocks   p (it has no condition): 2 rules",
    "side effects are not observed: a refused call that still wrote something is not seen",
  ]);
});
