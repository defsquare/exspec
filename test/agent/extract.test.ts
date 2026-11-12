import { expect, test } from "bun:test";
import type { Drive } from "../../src/agent/drive.ts";
import { type Extracting, extract } from "../../src/agent/extract.ts";
import type { Event, Phase } from "../../src/shapes/event.ts";
import type { PlayedScenario } from "../../src/shapes/scenario.ts";
import { bindings, facts, interfaces, operation, reference, target } from "../files.ts";
import { at, fakeIo, scenarioFile, step } from "../run/fake.ts";

type Files = Readonly<Record<string, string>>;

// each session writes its files, then ends; ok: false for a session that ends in error
function fakeAgent(initial: Files, sessions: readonly { writes: Files; ok?: boolean }[]) {
  const files = new Map(Object.entries(initial));
  const received: { prompt: string; resume?: string }[] = [];
  const drive: Drive = async function* ({ prompt, resume }) {
    const session = sessions[received.length];
    received.push({ prompt, ...(resume === undefined ? {} : { resume }) });
    if (session === undefined) throw new Error("no session left");
    for (const [path, text] of Object.entries(session.writes)) files.set(path, text);
    yield { type: "agent-ended", turns: 1, seconds: 1 };
    return { session: resume ?? `s${received.length}`, ok: session.ok ?? true };
  };
  const readFiles = async () => [...files].map(([path, text]) => ({ path, text }));
  return { drive, readFiles, received };
}

const instructions = {
  system: "system",
  phases: {
    target: "target",
    interfaces: "interfaces",
    specification: "specification",
    scenarios: "scenarios",
  },
};

const failed = (...findings: string[]) =>
  [
    "The check of this phase failed. Fix what follows, then end with the same short message.",
    "",
    ...findings,
  ].join("\n");

const specified = {
  "target.yaml": target,
  "interfaces.yaml": interfaces,
  "facts.yaml": facts,
  "operations/f.yaml": operation,
  "bindings.yaml": bindings,
};

const answered = { status: 200, body: null };

const playedCopy: PlayedScenario = {
  scenario: "s",
  says: "s",
  proves: ["r"],
  run: { target: "t", version: "v", at, clock: null },
  arrange: [],
  act: { call: { operation: "f", with: { a: "x" }, caller: "u" }, response: answered },
};

const ended = (phase: Phase): Event => ({
  type: "agent-ended",
  phase,
  turns: 1,
  seconds: 1,
});

function extracting(
  agent: ReturnType<typeof fakeAgent>,
  io: Extracting["io"],
  only?: Extracting["only"],
): Extracting {
  const { drive, readFiles } = agent;
  return {
    dir: "/d",
    model: "m",
    instructions,
    drive,
    io,
    readFiles,
    ...(only === undefined ? {} : { only }),
  };
}

test("each phase not done is run, its gate checked, then the references recorded", async () => {
  const agent = fakeAgent({}, [
    { writes: { "target.yaml": target } },
    { writes: { "interfaces.yaml": interfaces } },
    {
      writes: {
        "facts.yaml": facts,
        "operations/f.yaml": operation,
        "bindings.yaml": bindings,
      },
    },
    { writes: { "scenarios/f/a.yaml": scenarioFile("x") } },
  ]);
  const { io, lines, written } = fakeIo({
    "http://h/f/x": [answered, answered, answered],
  });
  const events = await Array.fromAsync(extract(extracting(agent, io)));
  expect({ events, received: agent.received, lines, written }).toEqual({
    events: [
      { type: "command-started", command: "extract", dir: "/d" },
      { type: "phase-started", phase: "target" },
      ended("target"),
      ...step("stop"),
      ...step("start"),
      ...step("alive"),
      ...step("seed"),
      ...step("reset"),
      ...step("stop"),
      { type: "gate-checked", phase: "target", ok: true, findings: [] },
      { type: "phase-finished", phase: "target", ok: true },
      { type: "phase-started", phase: "interfaces" },
      ended("interfaces"),
      { type: "gate-checked", phase: "interfaces", ok: true, findings: [] },
      { type: "phase-finished", phase: "interfaces", ok: true },
      { type: "phase-started", phase: "specification" },
      ended("specification"),
      { type: "gate-checked", phase: "specification", ok: true, findings: [] },
      { type: "phase-finished", phase: "specification", ok: true },
      { type: "phase-started", phase: "scenarios" },
      ...step("start"),
      ...step("alive"),
      ...step("seed"),
      ended("scenarios"),
      ...step("reset"),
      { type: "scenario-played", path: "f/a", played: playedCopy },
      { type: "gate-checked", phase: "scenarios", ok: true, findings: [] },
      ...step("stop"),
      { type: "phase-finished", phase: "scenarios", ok: true },
      { type: "phase-started", phase: "record" },
      { type: "command-started", command: "record", dir: "/d" },
      ...step("stop"),
      ...step("start"),
      ...step("alive"),
      ...step("seed"),
      ...step("reset"),
      { type: "scenario-played", path: "f/a", played: playedCopy },
      ...step("stop"),
      ...step("start"),
      ...step("alive"),
      ...step("seed"),
      ...step("reset"),
      { type: "scenario-played", path: "f/a", played: playedCopy },
      ...step("stop"),
      { type: "reference-written", path: "f/a", noise: 0 },
      { type: "command-finished", command: "record", ok: true },
      { type: "gate-checked", phase: "record", ok: true, findings: [] },
      { type: "phase-finished", phase: "record", ok: true },
      { type: "command-finished", command: "extract", ok: true },
    ],
    received: [
      { prompt: "target" },
      { prompt: "interfaces" },
      { prompt: "specification" },
      { prompt: "scenarios" },
    ],
    lines: [
      ...["stop", "start", "seed", "reset", "stop"],
      ...["start", "seed", "reset", "stop"],
      ...["stop", "start", "seed", "reset", "stop", "start", "seed", "reset", "stop"],
    ],
    written: [{ path: "f/a", reference: { ...playedCopy, noise: [] } }],
  });
});

test("phases already done are skipped", async () => {
  const agent = fakeAgent(
    {
      ...specified,
      "scenarios/f/a.yaml": scenarioFile("x"),
      "references/f/a.yaml": reference,
    },
    [],
  );
  const { io, lines } = fakeIo({});
  const events = await Array.fromAsync(extract(extracting(agent, io)));
  expect({ events, received: agent.received, lines }).toEqual({
    events: [
      { type: "command-started", command: "extract", dir: "/d" },
      { type: "phase-skipped", phase: "target" },
      { type: "phase-skipped", phase: "interfaces" },
      { type: "phase-skipped", phase: "specification" },
      { type: "phase-skipped", phase: "scenarios" },
      { type: "phase-skipped", phase: "record" },
      { type: "command-finished", command: "extract", ok: true },
    ],
    received: [],
    lines: [],
  });
});

test("a failed gate resumes the session with its findings", async () => {
  const agent = fakeAgent({ "target.yaml": target }, [
    { writes: { "interfaces.yaml": "interfaces: []" } },
    { writes: { "interfaces.yaml": interfaces } },
  ]);
  const { io } = fakeIo({});
  const events = await Array.fromAsync(extract(extracting(agent, io, "interfaces")));
  expect({ events, received: agent.received }).toEqual({
    events: [
      { type: "command-started", command: "extract", dir: "/d" },
      { type: "phase-started", phase: "interfaces" },
      ended("interfaces"),
      {
        type: "gate-checked",
        phase: "interfaces",
        ok: false,
        findings: ["no interface is declared"],
      },
      ended("interfaces"),
      { type: "gate-checked", phase: "interfaces", ok: true, findings: [] },
      { type: "phase-finished", phase: "interfaces", ok: true },
      { type: "command-finished", command: "extract", ok: true },
    ],
    received: [
      { prompt: "interfaces" },
      { prompt: failed("no interface is declared"), resume: "s1" },
    ],
  });
});

test("a gate still failing after three rounds ends the extraction", async () => {
  const agent = fakeAgent({}, [
    { writes: {} },
    { writes: {} },
    { writes: {} },
    { writes: {} },
  ]);
  const { io, lines } = fakeIo({});
  const events = await Array.fromAsync(extract(extracting(agent, io)));
  const gate: Event = {
    type: "gate-checked",
    phase: "target",
    ok: false,
    findings: ["no target is declared"],
  };
  expect({ events, received: agent.received, lines }).toEqual({
    events: [
      { type: "command-started", command: "extract", dir: "/d" },
      { type: "phase-started", phase: "target" },
      ...[1, 2, 3, 4].flatMap(() => [ended("target"), gate]),
      { type: "phase-finished", phase: "target", ok: false },
      { type: "command-finished", command: "extract", ok: false },
    ],
    received: [
      { prompt: "target" },
      ...[1, 2, 3].map(() => ({ prompt: failed("no target is declared"), resume: "s1" })),
    ],
    lines: [],
  });
});

test("a phase named runs alone, done or not", async () => {
  const agent = fakeAgent(specified, [{ writes: {} }]);
  const { io } = fakeIo({});
  const events = await Array.fromAsync(extract(extracting(agent, io, "specification")));
  expect({ events, received: agent.received }).toEqual({
    events: [
      { type: "command-started", command: "extract", dir: "/d" },
      { type: "phase-started", phase: "specification" },
      ended("specification"),
      { type: "gate-checked", phase: "specification", ok: true, findings: [] },
      { type: "phase-finished", phase: "specification", ok: true },
      { type: "command-finished", command: "extract", ok: true },
    ],
    received: [{ prompt: "specification" }],
  });
});

test("a scenario that cannot be played fails the gate, the target stopped after", async () => {
  const agent = fakeAgent(specified, [
    { writes: { "scenarios/f/a.yaml": scenarioFile("x", "w") } },
    { writes: {} },
    { writes: {} },
    { writes: {} },
  ]);
  const { io, lines } = fakeIo({});
  const events = await Array.fromAsync(extract(extracting(agent, io, "scenarios")));
  const gate: Event[] = [
    ...step("reset"),
    { type: "scenario-unplayable", path: "f/a", message: 'no credentials for "w"' },
    {
      type: "gate-checked",
      phase: "scenarios",
      ok: false,
      findings: ['f/a: no credentials for "w"'],
    },
  ];
  expect({ events, lines }).toEqual({
    events: [
      { type: "command-started", command: "extract", dir: "/d" },
      { type: "phase-started", phase: "scenarios" },
      ...step("start"),
      ...step("alive"),
      ...step("seed"),
      ...[1, 2, 3, 4].flatMap(() => [ended("scenarios"), ...gate]),
      ...step("stop"),
      { type: "phase-finished", phase: "scenarios", ok: false },
      { type: "command-finished", command: "extract", ok: false },
    ],
    lines: ["start", "seed", "reset", "reset", "reset", "reset", "stop"],
  });
});

test("a session that ends in error fails its phase", async () => {
  const agent = fakeAgent({}, [{ writes: {}, ok: false }]);
  const { io } = fakeIo({});
  expect(await Array.fromAsync(extract(extracting(agent, io, "target")))).toEqual([
    { type: "command-started", command: "extract", dir: "/d" },
    { type: "phase-started", phase: "target" },
    ended("target"),
    { type: "command-failed", message: "the agent's session ended in error" },
    { type: "phase-finished", phase: "target", ok: false },
    { type: "command-finished", command: "extract", ok: false },
  ]);
});
