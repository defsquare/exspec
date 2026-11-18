import { expect, test } from "bun:test";
import {
  countsOf,
  duration,
  emptyFlow,
  type Flow,
  flowAfter,
  panelOf,
} from "../../src/cli/flow.ts";
import type { Counts, Event } from "../../src/shapes/event.ts";

const counts: Counts = {
  interfaces: 2,
  structures: 4,
  facts: 0,
  operations: 17,
  rules: 31,
  projections: 0,
  triggers: 0,
  scenarios: 0,
  references: 0,
};

test("a run is folded into its boxes, its panel and its totals", () => {
  const events: readonly (readonly [number, Event])[] = [
    [0, { type: "command-started", command: "extract", dir: "/abs/dir" }],
    [1, { type: "phase-skipped", phase: "target" }],
    [2, { type: "phase-started", phase: "interfaces" }],
    [3, { type: "agent-said", phase: "interfaces", text: "a\nb" }],
    [4, { type: "agent-used", phase: "interfaces", tool: "Read", about: "f.yaml" }],
    [5, { type: "agent-ended", phase: "interfaces", turns: 3, seconds: 1, cost: 0.25 }],
    [6, { type: "target-step", step: "alive", state: "done" }],
    [
      7,
      {
        type: "gate-checked",
        phase: "interfaces",
        ok: false,
        findings: ["f.yaml a.0: m"],
      },
    ],
    [8, { type: "agent-ended", phase: "interfaces", turns: 2, seconds: 1, cost: 0.5 }],
    [9, { type: "gate-checked", phase: "interfaces", ok: true, findings: [] }],
    [10, { type: "extraction-counted", counts }],
    [11, { type: "agent-said", role: "reader", text: "ignored" }],
    [12, { type: "phase-finished", phase: "interfaces", ok: true }],
    [13, { type: "command-failed", message: "m" }],
    [14, { type: "command-finished", command: "extract", ok: false }],
  ];
  const flow = events.reduce(
    (folded, [at, event]) => flowAfter(folded, event, at),
    emptyFlow,
  );
  const expected: Flow = {
    dir: "/abs/dir",
    startedAt: 0,
    endedAt: 14,
    ok: false,
    counts,
    gate: { round: 1, findings: ["f.yaml a.0: m"] },
    said: "a",
    used: { tool: "Read", about: "f.yaml" },
    target: { step: "alive", state: "done" },
    failed: "m",
    boxes: [
      { phase: "target", state: "skipped", round: 0, turns: 0 },
      {
        phase: "interfaces",
        state: "done",
        round: 2,
        turns: 5,
        cost: 0.75,
        startedAt: 2,
        endedAt: 12,
      },
      { phase: "specification", state: "to-do", round: 0, turns: 0 },
      { phase: "scenarios", state: "to-do", round: 0, turns: 0 },
      { phase: "record", state: "to-do", round: 0, turns: 0 },
    ],
  };
  expect(flow).toEqual(expected);
});

test("a phase starting empties the panel", () => {
  const events: readonly Event[] = [
    { type: "agent-said", phase: "target", text: "a" },
    { type: "agent-used", phase: "target", tool: "t", about: "f" },
    { type: "target-step", step: "alive", state: "done" },
    { type: "gate-checked", phase: "target", ok: false, findings: ["m"] },
    { type: "command-failed", message: "m" },
    { type: "phase-started", phase: "interfaces" },
  ];
  expect(events.reduce((flow, event) => flowAfter(flow, event, 1), emptyFlow)).toEqual({
    failed: "m",
    boxes: [
      { phase: "target", state: "to-do", round: 1, turns: 0 },
      { phase: "interfaces", state: "running", round: 1, turns: 0, startedAt: 1 },
      { phase: "specification", state: "to-do", round: 0, turns: 0 },
      { phase: "scenarios", state: "to-do", round: 0, turns: 0 },
      { phase: "record", state: "to-do", round: 0, turns: 0 },
    ],
  });
});

test("countsOf says the counts a phase writes, a zero left out", () => {
  expect({
    specification: countsOf("specification", counts),
    interfaces: countsOf("interfaces", counts),
    scenarios: countsOf("scenarios", counts),
    target: countsOf("target", counts),
    unknown: countsOf("record", undefined),
  }).toEqual({
    specification: ["4 structures", "17 operations", "31 rules"],
    interfaces: ["2 interfaces"],
    scenarios: [],
    target: [],
    unknown: [],
  });
});

test("duration writes a time short", () => {
  expect([0, 9_999, 65_000, 3_725_000].map(duration)).toEqual([
    "0s",
    "9s",
    "1m05",
    "1h02m",
  ]);
});

test("panelOf cuts a running phase's findings and gives a failed extraction all of them", () => {
  const failing: readonly Event[] = [
    { type: "phase-started", phase: "target" },
    { type: "agent-ended", phase: "target", turns: 2, seconds: 1 },
    { type: "gate-checked", phase: "target", ok: false, findings: ["a", "b", "c"] },
  ];
  const ending: readonly Event[] = [
    { type: "phase-finished", phase: "target", ok: false },
    { type: "command-finished", command: "extract", ok: false },
  ];
  const fold = (events: readonly Event[]) =>
    events.reduce((flow, event) => flowAfter(flow, event, 0), emptyFlow);
  expect({
    before: panelOf(emptyFlow, 2),
    running: panelOf(fold(failing), 2),
    failed: panelOf(fold([...failing, ...ending]), 2),
    box: fold([...failing, ...ending]).boxes[0],
  }).toEqual({
    before: undefined,
    running: { phase: "target", running: { round: 2 }, findings: ["a", "b"], more: 1 },
    failed: { phase: "target", findings: ["a", "b", "c"], more: 0 },
    box: {
      phase: "target",
      state: "failed",
      round: 2,
      turns: 2,
      startedAt: 0,
      endedAt: 0,
    },
  });
});
