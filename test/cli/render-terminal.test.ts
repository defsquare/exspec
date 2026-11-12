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
        specification: "to-do",
        scenarios: "to-do",
        record: "to-do",
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
    { type: "command-failed", message: "m" },
    { type: "command-finished", command: "check", ok: false },
  ];
  expect(events.map(describeEvent)).toEqual([
    "status /abs/dir",
    "no extraction in /abs/dir: /abs/dir/specimen is missing",
    "9 interfaces, 3 structures, 5 facts, 5 operations, 20 rules, 4 projections, 5 triggers, 4 scenarios, 0 references",
    "phases   target done, interfaces done, specification to-do, scenarios to-do, record to-do",
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
    "failed   m",
    "check failed",
  ]);
});
