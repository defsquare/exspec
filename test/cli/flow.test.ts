import { expect, test } from "bun:test";
import {
  countsOf,
  duration,
  emptyFlow,
  type Flow,
  flowAfter,
  panelOf,
} from "../../src/cli/flow.ts";
import type { Event } from "../../src/shapes/event.ts";

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
    [10, { type: "phase-finished", phase: "interfaces", ok: true }],
    [11, { type: "agent-said", role: "reader", text: "ignored" }],
    [12, { type: "command-failed", message: "m" }],
    [13, { type: "command-finished", command: "extract", ok: false }],
  ];
  const flow = events.reduce(
    (folded, [at, event]) => flowAfter(folded, event, at),
    emptyFlow,
  );
  const expected: Flow = {
    dir: "/abs/dir",
    startedAt: 0,
    endedAt: 13,
    ok: false,
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
        endedAt: 10,
      },
      { phase: "reading", state: "to-do", round: 0, turns: 0 },
      { phase: "evidence", state: "to-do", round: 0, turns: 0 },
      { phase: "judgement", state: "to-do", round: 0, turns: 0 },
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
      { phase: "reading", state: "to-do", round: 0, turns: 0 },
      { phase: "evidence", state: "to-do", round: 0, turns: 0 },
      { phase: "judgement", state: "to-do", round: 0, turns: 0 },
    ],
  });
});

test("a roles' phase takes the events of its sessions", () => {
  const events: readonly Event[] = [
    { type: "phase-started", phase: "reading" },
    {
      type: "agent-ended",
      role: "reader",
      interface: "f",
      turns: 4,
      seconds: 1,
      cost: 0.1,
    },
    {
      type: "agent-ended",
      role: "reader",
      interface: "g",
      turns: 2,
      seconds: 1,
      cost: 0.2,
    },
    { type: "gate-checked", role: "reader", interface: "g", ok: false, findings: ["x"] },
    { type: "agent-said", role: "reader", interface: "g", text: "t" },
    { type: "agent-used", role: "reader", interface: "g", tool: "Read", about: "a" },
  ];
  const flow = events.reduce((folded, event) => flowAfter(folded, event, 1), emptyFlow);
  expect({
    box: flow.boxes[2],
    gate: flow.gate,
    said: flow.said,
    used: flow.used,
    panel: panelOf(flow, 2),
  }).toEqual({
    box: {
      phase: "reading",
      state: "running",
      round: 1,
      turns: 6,
      cost: 0.1 + 0.2,
      startedAt: 1,
    },
    gate: { round: 1, findings: ["g: x"] },
    said: "t",
    used: { tool: "Read", about: "a" },
    panel: { phase: "reading", running: { round: 1 }, findings: ["g: x"], more: 0 },
  });
});

test("a role's event outside any running phase changes nothing", () => {
  const events: readonly Event[] = [
    { type: "agent-ended", role: "reader", interface: "f", turns: 4, seconds: 1 },
    { type: "gate-checked", role: "reader", interface: "f", ok: false, findings: ["x"] },
    { type: "agent-said", role: "reader", text: "t" },
    { type: "agent-used", role: "reader", tool: "Read", about: "a" },
  ];
  expect(
    events.reduce((folded, event) => flowAfter(folded, event, 1), emptyFlow),
  ).toEqual(emptyFlow);
});

test("a roles' phase counts what it wrote, a zero left out", () => {
  const written: readonly Event[] = [
    { type: "role-finished", role: "reader", interface: "f", ok: true },
    { type: "role-finished", role: "reader", interface: "g", ok: true },
    { type: "role-finished", role: "reader", interface: "h", ok: false },
    { type: "role-finished", role: "common-reader", ok: true },
    { type: "reference-written", path: "p", noise: 0 },
    {
      type: "judgement-written",
      interface: "f",
      scenario: "s",
      rule: "r",
      verdict: "holds",
      confidence: 1,
    },
  ];
  const flow = written.reduce((folded, event) => flowAfter(folded, event, 1), emptyFlow);
  expect({
    reading: countsOf("reading", flow.counts),
    evidence: countsOf("evidence", flow.counts),
    judgement: countsOf("judgement", flow.counts),
    interfaces: countsOf("interfaces", flow.counts),
    none: countsOf("reading", undefined),
  }).toEqual({
    reading: ["2 read"],
    evidence: ["1 references"],
    judgement: ["1 judged"],
    interfaces: [],
    none: [],
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
