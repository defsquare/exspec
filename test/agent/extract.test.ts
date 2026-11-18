import { expect, test } from "bun:test";
import type { Drive } from "../../src/agent/drive.ts";
import { type Extracting, extract } from "../../src/agent/extract.ts";
import type { Event, Phase } from "../../src/shapes/event.ts";
import type { Evidence } from "../../src/shapes/roles.ts";
import { interfaces, target } from "../files.ts";
import { declared, type Files, points, reading } from "../roles-left-fixture.ts";
import { at, fakeIo, step } from "../run/fake.ts";

// each session writes its files, says its words, then ends; ok: false for a session that
// ends in error
function fakeAgent(
  initial: Files,
  sessions: readonly { writes: Files; said?: string; ok?: boolean }[],
) {
  const files = new Map(Object.entries(initial));
  const received: { prompt: string; resume?: string }[] = [];
  const drive: Drive = async function* ({ prompt, resume }) {
    const session = sessions[received.length];
    received.push({ prompt, ...(resume === undefined ? {} : { resume }) });
    if (session === undefined) throw new Error("no session left");
    for (const [path, text] of Object.entries(session.writes)) files.set(path, text);
    if (session.said !== undefined) yield { type: "agent-said", text: session.said };
    yield { type: "agent-ended", turns: 1, seconds: 1 };
    return { session: resume ?? `s${received.length}`, ok: session.ok ?? true };
  };
  const readFiles = async () => [...files].map(([path, text]) => ({ path, text }));
  const writeFile = async (_dir: string, path: string, text: string) => {
    files.set(path, text);
  };
  const removeFile = async (_dir: string, path: string) => {
    files.delete(path);
  };
  return { drive, readFiles, writeFile, removeFile, received, files };
}

const instructions = {
  system: "system",
  phases: { target: "target", interfaces: "interfaces" },
};

const failed = (...findings: string[]) =>
  [
    "The check of this phase failed. Fix what follows, then end with the same short message.",
    "",
    ...findings,
  ].join("\n");

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
  const { drive, readFiles, writeFile, removeFile } = agent;
  return {
    dir: "/d",
    model: "m",
    jobs: 1,
    effort: undefined,
    instructions,
    drive,
    io,
    readFiles,
    writeFile,
    removeFile,
    ...(only === undefined ? {} : { only }),
  };
}

const f = { interface: "f" };

const noVerdict = {
  holds: 0,
  contradicted: 0,
  "refused-unexpectedly": 0,
  "not-shown": 0,
};

test("the target phase runs its session, then the target's lifecycle once", async () => {
  const agent = fakeAgent({}, [{ writes: { "target.yaml": target } }]);
  const { io, lines } = fakeIo({});
  const events = await Array.fromAsync(extract(extracting(agent, io, "target")));
  expect({ events, received: agent.received, lines }).toEqual({
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
      { type: "command-finished", command: "extract", ok: true },
    ],
    received: [{ prompt: "target" }],
    lines: ["stop", "start", "seed", "reset", "stop"],
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

test("every phase done: each is skipped, no session, the target never started", async () => {
  const agent = fakeAgent({ ...reading, ...points.judged }, []);
  const { io, lines } = fakeIo({});
  const events = await Array.fromAsync(extract(extracting(agent, io)));
  expect({ events, received: agent.received, lines }).toEqual({
    events: [
      { type: "command-started", command: "extract", dir: "/d" },
      { type: "phase-skipped", phase: "target" },
      { type: "phase-skipped", phase: "interfaces" },
      { type: "phase-skipped", phase: "reading" },
      { type: "phase-skipped", phase: "evidence" },
      { type: "phase-skipped", phase: "judgement" },
      { type: "command-finished", command: "extract", ok: true },
    ],
    received: [],
    lines: [],
  });
});

test("a scenario waiting for its second play: its reference recorded, then judged", async () => {
  const answer = JSON.stringify([
    {
      scenario: "exists-a",
      situation: "yes",
      verdict: "holds",
      confidence: 1,
      evidence: "e",
    },
  ]);
  const agent = fakeAgent({ ...reading, ...points["played once"] }, [
    { writes: {}, said: answer },
  ]);
  const { io, lines } = fakeIo({ "http://h/f/x": [{ status: 404, body: null }] });
  const events = await Array.fromAsync(extract(extracting(agent, io)));
  const second: Evidence = {
    rule: "exists",
    run: { target: "t", version: "v", at, clock: null },
    exchanges: [
      {
        when: "call",
        as: "u",
        request: { method: "get", path: "/f/x" },
        response: { status: 404, body: null },
      },
    ],
  };
  expect({ events, lines }).toEqual({
    events: [
      { type: "command-started", command: "extract", dir: "/d" },
      { type: "phase-skipped", phase: "target" },
      { type: "phase-skipped", phase: "interfaces" },
      { type: "phase-skipped", phase: "reading" },
      { type: "phase-started", phase: "evidence" },
      {
        type: "role-skipped",
        role: "builder",
        ...f,
        why: "every scenario passes and has its evidence as written",
      },
      ...step("stop"),
      ...step("start"),
      ...step("alive"),
      ...step("seed"),
      { type: "steps-played", ...f, scenario: "exists-a", evidence: second },
      { type: "reference-written", path: "f/exists-a", noise: 0 },
      ...step("stop"),
      { type: "phase-finished", phase: "evidence", ok: true },
      { type: "phase-started", phase: "judgement" },
      { type: "role-started", role: "judge", ...f },
      { type: "agent-said", role: "judge", ...f, text: answer },
      { type: "agent-ended", role: "judge", ...f, turns: 1, seconds: 1 },
      {
        type: "judgement-written",
        ...f,
        scenario: "exists-a",
        rule: "exists",
        verdict: "holds",
        confidence: 1,
      },
      { type: "gate-checked", role: "judge", ...f, ok: true, findings: [] },
      { type: "role-finished", role: "judge", ...f, ok: true },
      { type: "roles-counted", verdicts: { ...noVerdict, holds: 1 } },
      { type: "phase-finished", phase: "judgement", ok: true },
      { type: "command-finished", command: "extract", ok: true },
    ],
    lines: ["stop", "start", "seed", "reset", "stop"],
  });
});

test("a phase named with nothing left: its roles skipped, no session", async () => {
  const agent = fakeAgent({ ...reading, ...points.judged }, []);
  const { io } = fakeIo({});
  const events = await Array.fromAsync(extract(extracting(agent, io, "judgement")));
  expect({ events, received: agent.received }).toEqual({
    events: [
      { type: "command-started", command: "extract", dir: "/d" },
      { type: "phase-started", phase: "judgement" },
      {
        type: "role-skipped",
        role: "judge",
        ...f,
        why: "every reference as written has its judgement",
      },
      { type: "roles-counted", verdicts: { ...noVerdict, holds: 1 } },
      { type: "phase-finished", phase: "judgement", ok: true },
      { type: "command-finished", command: "extract", ok: true },
    ],
    received: [],
  });
});

test("a reader's gate failing its rounds ends the extraction at the reading", async () => {
  const agent = fakeAgent(
    {
      ...declared,
      "structures.yaml": reading["structures.yaml"] ?? "",
      "roles/common.yaml": reading["roles/common.yaml"] ?? "",
    },
    [{ writes: {} }, { writes: {} }, { writes: {} }, { writes: {} }],
  );
  const { io, lines } = fakeIo({});
  const events = await Array.fromAsync(extract(extracting(agent, io)));
  const gate: Event = {
    type: "gate-checked",
    role: "reader",
    ...f,
    ok: false,
    findings: ["rules.yaml: missing", "hints.yaml: missing"],
  };
  expect({ events, sessions: agent.received.length, lines }).toEqual({
    events: [
      { type: "command-started", command: "extract", dir: "/d" },
      { type: "phase-skipped", phase: "target" },
      { type: "phase-skipped", phase: "interfaces" },
      { type: "phase-started", phase: "reading" },
      {
        type: "role-skipped",
        role: "structures-reader",
        why: "structures.yaml passes its check",
      },
      {
        type: "role-skipped",
        role: "common-reader",
        why: "common.yaml passes its check",
      },
      { type: "role-started", role: "reader", ...f },
      ...[1, 2, 3, 4].flatMap((): Event[] => [
        { type: "agent-ended", role: "reader", ...f, turns: 1, seconds: 1 },
        gate,
      ]),
      { type: "role-finished", role: "reader", ...f, ok: false },
      { type: "phase-finished", phase: "reading", ok: false },
      { type: "command-finished", command: "extract", ok: false },
    ],
    sessions: 4,
    lines: [],
  });
});
