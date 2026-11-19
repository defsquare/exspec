import { expect, test } from "bun:test";
import { emptyFlow, type Flow, flowAfter } from "../../src/cli/flow.ts";
import { countsOf, duration, panelOf } from "../../src/cli/flow-panel.ts";
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
    sessions: [],
    troubles: [],
    boxes: [
      { phase: "target", state: "skipped", round: 0 },
      {
        phase: "interfaces",
        state: "done",
        round: 2,
        cost: 0.75,
        startedAt: 2,
        endedAt: 10,
      },
      { phase: "reading", state: "to-do", round: 0 },
      { phase: "evidence", state: "to-do", round: 0 },
      { phase: "judgement", state: "to-do", round: 0 },
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
    sessions: [],
    troubles: [],
    boxes: [
      { phase: "target", state: "to-do", round: 1 },
      { phase: "interfaces", state: "running", round: 1, startedAt: 1 },
      { phase: "reading", state: "to-do", round: 0 },
      { phase: "evidence", state: "to-do", round: 0 },
      { phase: "judgement", state: "to-do", round: 0 },
    ],
  });
});

test("a roles' phase keeps its sessions that run and what is wrong by session", () => {
  const events: readonly (readonly [number, Event])[] = [
    [1, { type: "phase-started", phase: "reading" }],
    [2, { type: "role-skipped", role: "structures-reader", why: "w" }],
    [3, { type: "role-started", role: "reader", interface: "f" }],
    [4, { type: "role-started", role: "reader", interface: "g" }],
    [5, { type: "agent-said", role: "reader", interface: "f", text: "t" }],
    [6, { type: "agent-used", role: "reader", interface: "f", tool: "Read", about: "a" }],
    [7, { type: "agent-used", role: "reader", interface: "g", tool: "Grep", about: "b" }],
    [
      8,
      {
        type: "gate-checked",
        role: "reader",
        interface: "f",
        ok: false,
        findings: ["x", "y"],
      },
    ],
    [
      9,
      {
        type: "gate-checked",
        role: "reader",
        interface: "g",
        ok: false,
        findings: ["z"],
      },
    ],
    [
      10,
      { type: "gate-checked", role: "reader", interface: "g", ok: true, findings: [] },
    ],
    [11, { type: "role-finished", role: "reader", interface: "g", ok: true }],
    [12, { type: "role-started", role: "reader", interface: "h" }],
    [13, { type: "role-finished", role: "reader", interface: "h", ok: false }],
  ];
  const flow = events.reduce(
    (folded, [at, event]) => flowAfter(folded, event, at),
    emptyFlow,
  );
  expect({
    sessions: flow.sessions,
    troubles: flow.troubles,
    gate: flow.gate,
    said: flow.said,
    counts: countsOf("reading", flow),
    panel: panelOf(flow, 1),
  }).toEqual({
    sessions: [
      {
        role: "reader",
        interface: "f",
        startedAt: 3,
        round: 2,
        used: { tool: "Read", about: "a" },
      },
    ],
    troubles: [
      { by: "f", lines: ["x", "y"] },
      { by: "h", lines: ["ended in error"] },
    ],
    gate: undefined,
    said: undefined,
    counts: ["1 read", "1 running", "1 failed", "1 skipped"],
    panel: {
      kind: "roles",
      phase: "reading",
      running: true,
      sessions: [
        {
          role: "reader",
          interface: "f",
          startedAt: 3,
          round: 2,
          used: { tool: "Read", about: "a" },
        },
      ],
      troubles: [{ by: "h", lines: ["ended in error"] }],
      more: 1,
    },
  });
});

test("a roles' phase takes the cost of its sessions", () => {
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
  ];
  const flow = events.reduce((folded, event) => flowAfter(folded, event, 1), emptyFlow);
  expect(flow.boxes[2]).toEqual({
    phase: "reading",
    state: "running",
    round: 1,
    cost: 0.1 + 0.2,
    startedAt: 1,
  });
});

test("the evidence phase counts what it wrote, kept and found unstable", () => {
  const events: readonly Event[] = [
    { type: "phase-started", phase: "evidence" },
    { type: "reference-written", path: "p", noise: 0 },
    { type: "reference-kept", path: "q" },
    {
      type: "scenario-unstable",
      path: "r",
      differences: [
        { at: ["a"], first: 1, second: 2 },
        { at: ["b"], first: 1, second: 2 },
      ],
    },
  ];
  const flow = events.reduce((folded, event) => flowAfter(folded, event, 1), emptyFlow);
  expect({ counts: countsOf("evidence", flow), troubles: flow.troubles }).toEqual({
    counts: ["1 references", "1 unstable", "1 kept"],
    troubles: [{ by: "r", lines: ["unstable: 2 differences"] }],
  });
});

test("a failed roles' phase gives every trouble once the extraction has failed", () => {
  const events: readonly Event[] = [
    { type: "phase-started", phase: "evidence" },
    {
      type: "gate-checked",
      role: "builder",
      interface: "f",
      ok: false,
      findings: ["x", "y"],
    },
    { type: "role-finished", role: "builder", interface: "f", ok: false },
    { type: "phase-finished", phase: "evidence", ok: false },
    { type: "command-finished", command: "extract", ok: false },
  ];
  const flow = events.reduce((folded, event) => flowAfter(folded, event, 1), emptyFlow);
  expect(panelOf(flow, 1)).toEqual({
    kind: "roles",
    phase: "evidence",
    running: false,
    sessions: [],
    troubles: [{ by: "f", lines: ["x", "y"] }],
    more: 0,
  });
});

test("the verdicts counted are kept", () => {
  const verdicts = {
    holds: 3,
    contradicted: 1,
    "refused-unexpectedly": 0,
    "not-shown": 2,
  };
  expect(flowAfter(emptyFlow, { type: "roles-counted", verdicts }, 1).verdicts).toEqual(
    verdicts,
  );
});

test("a phase starting empties the sessions and the troubles", () => {
  const events: readonly Event[] = [
    { type: "phase-started", phase: "reading" },
    { type: "role-started", role: "reader", interface: "f" },
    { type: "gate-checked", role: "reader", interface: "f", ok: false, findings: ["x"] },
    { type: "roles-queued", role: "reader", count: 2 },
    { type: "phase-started", phase: "evidence" },
  ];
  const flow = events.reduce((folded, event) => flowAfter(folded, event, 1), emptyFlow);
  expect({
    sessions: flow.sessions,
    troubles: flow.troubles,
    queued: flow.queued,
  }).toEqual({
    sessions: [],
    troubles: [],
    queued: undefined,
  });
});

test("a roles' step queued counts its sessions over, not the readers before it", () => {
  const events: readonly Event[] = [
    { type: "phase-started", phase: "reading" },
    { type: "role-skipped", role: "structures-reader", why: "w" },
    { type: "role-started", role: "common-reader" },
    { type: "role-finished", role: "common-reader", ok: true },
    { type: "roles-queued", role: "reader", count: 2 },
    { type: "role-skipped", role: "reader", interface: "f", why: "w" },
  ];
  const flow = events.reduce((folded, event) => flowAfter(folded, event, 1), emptyFlow);
  expect({ queued: flow.queued, counts: countsOf("reading", flow) }).toEqual({
    queued: { role: "reader", count: 2, done: 1 },
    counts: ["1 of 2 readers", "2 skipped"],
  });
});

test("a role's failure is its session's trouble, in place of its failed gate", () => {
  const events: readonly Event[] = [
    { type: "phase-started", phase: "reading" },
    { type: "role-started", role: "reader", interface: "f" },
    { type: "gate-checked", role: "reader", interface: "f", ok: false, findings: ["x"] },
    { type: "role-failed", role: "reader", interface: "f", message: "m" },
    { type: "role-finished", role: "reader", interface: "f", ok: false },
  ];
  const flow = events.reduce((folded, event) => flowAfter(folded, event, 1), emptyFlow);
  expect(flow.troubles).toEqual([{ by: "f", lines: ["m"] }]);
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
    running: {
      kind: "session",
      phase: "target",
      running: { round: 2 },
      findings: ["a", "b"],
      more: 1,
    },
    failed: { kind: "session", phase: "target", findings: ["a", "b", "c"], more: 0 },
    box: {
      phase: "target",
      state: "failed",
      round: 2,
      startedAt: 0,
      endedAt: 0,
    },
  });
});
