import { expect, test } from "bun:test";
import type { Drive } from "../../src/agent/drive.ts";
import { type Extracting, extract, stepWrites } from "../../src/agent/extract.ts";
import type { Event, SessionStep } from "../../src/shapes/event.ts";
import type { Evidence } from "../../src/shapes/roles.ts";
import { interfaces, target } from "../files.ts";
import { declared, type Files, points, reading } from "../roles-left-fixture.ts";
import { at, fakeIo, step } from "../run/fake.ts";

// each session writes its files, says its words, then ends; ok: false for a session that
// ends in error
function fakeAgent(
  initial: Files,
  sessions: readonly { writes: Files; said?: string; ok?: boolean; how?: string }[],
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
    return {
      session: resume ?? `s${received.length}`,
      ok: session.ok ?? true,
      ...(session.how === undefined ? {} : { how: session.how }),
    };
  };
  const readFiles = async () => [...files].map(([path, text]) => ({ path, text }));
  const readStartFiles = async () =>
    (await readFiles()).filter(({ path }) => /^target\/[^/]+$/.test(path));
  const writeFile = async (_dir: string, path: string, text: string) => {
    files.set(path, text);
  };
  const removeFile = async (_dir: string, path: string) => {
    files.delete(path);
  };
  return { drive, readFiles, readStartFiles, writeFile, removeFile, received, files };
}

const instructions = {
  system: "system",
  sessions: { target: "target", interfaces: "interfaces" },
};

const failed = (...findings: string[]) =>
  [
    "The check of this session failed. Fix what follows, then end with the same short message.",
    "",
    ...findings,
  ].join("\n");

const ended = (step: SessionStep): Event => ({
  type: "agent-ended",
  phase: "target",
  step,
  turns: 1,
  seconds: 1,
});

function extracting(
  agent: ReturnType<typeof fakeAgent>,
  io: Extracting["io"],
  only?: Extracting["only"],
  ioForProof: Extracting["ioForProof"] = async () => io,
): Extracting {
  const { drive, readFiles, readStartFiles, writeFile, removeFile } = agent;
  return {
    dir: "/d",
    model: "m",
    jobs: 1,
    effort: undefined,
    instructions,
    drive,
    io,
    ioForProof,
    readFiles,
    readStartFiles,
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

test("the target's session runs, then the target's lifecycle once, then the interfaces' session", async () => {
  const agent = fakeAgent({}, [
    { writes: { "target.yaml": target } },
    { writes: { "interfaces.yaml": interfaces } },
  ]);
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
      { type: "gate-checked", phase: "target", step: "target", ok: true, findings: [] },
      ended("interfaces"),
      {
        type: "gate-checked",
        phase: "target",
        step: "interfaces",
        ok: true,
        findings: [],
      },
      { type: "phase-finished", phase: "target", ok: true },
      { type: "command-finished", command: "extract", ok: true },
    ],
    received: [{ prompt: "target" }, { prompt: "interfaces" }],
    lines: ["stop", "start", "seed", "reset", "stop"],
  });
});

test("a failed gate resumes the session with its findings", async () => {
  const agent = fakeAgent({ "target.yaml": target }, [
    { writes: { "interfaces.yaml": "interfaces: []" } },
    { writes: { "interfaces.yaml": interfaces } },
  ]);
  const { io } = fakeIo({});
  const events = await Array.fromAsync(extract(extracting(agent, io, "target")));
  expect({ events, received: agent.received }).toEqual({
    events: [
      { type: "command-started", command: "extract", dir: "/d" },
      { type: "phase-started", phase: "target" },
      ended("interfaces"),
      {
        type: "gate-checked",
        phase: "target",
        step: "interfaces",
        ok: false,
        findings: ["no interface is declared"],
      },
      ended("interfaces"),
      {
        type: "gate-checked",
        phase: "target",
        step: "interfaces",
        ok: true,
        findings: [],
      },
      { type: "phase-finished", phase: "target", ok: true },
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
    step: "target",
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
  const agent = fakeAgent({}, [{ writes: {}, ok: false, how: "x" }]);
  const { io } = fakeIo({});
  expect(await Array.fromAsync(extract(extracting(agent, io, "target")))).toEqual([
    { type: "command-started", command: "extract", dir: "/d" },
    { type: "phase-started", phase: "target" },
    ended("target"),
    { type: "command-failed", message: "the agent's session ended in error (x)" },
    { type: "phase-finished", phase: "target", ok: false },
    { type: "command-finished", command: "extract", ok: false },
  ]);
});

test("every phase done: the three are skipped, no session, the target never started", async () => {
  const agent = fakeAgent({ ...reading, ...points.judged }, []);
  const { io, lines } = fakeIo({});
  const events = await Array.fromAsync(extract(extracting(agent, io)));
  expect({ events, received: agent.received, lines }).toEqual({
    events: [
      { type: "command-started", command: "extract", dir: "/d" },
      { type: "phase-skipped", phase: "target" },
      { type: "phase-skipped", phase: "specification" },
      { type: "phase-skipped", phase: "proof" },
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
      { type: "phase-skipped", phase: "specification" },
      { type: "phase-started", phase: "proof" },
      { type: "roles-queued", role: "builder", count: 1 },
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
      { type: "roles-queued", role: "judge", count: 1 },
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
      { type: "phase-finished", phase: "proof", ok: true },
      { type: "command-finished", command: "extract", ok: true },
    ],
    lines: ["stop", "start", "seed", "reset", "stop"],
  });
});

test("a whole run: the target's session, the states' reader, then the proof", async () => {
  const answer = JSON.stringify([
    {
      scenario: "exists-a",
      situation: "yes",
      verdict: "holds",
      confidence: 1,
      evidence: "e",
    },
  ]);
  const {
    "target.yaml": _target,
    "states.yaml": _states,
    ...rest
  } = { ...reading, ...points["played once"] };
  const agent = fakeAgent(rest, [
    { writes: { "target.yaml": target } },
    { writes: { "states.yaml": "[]" } },
    { writes: {}, said: answer },
  ]);
  const { io } = fakeIo({ "http://h/f/x": [{ status: 404, body: null }] });
  const events = await Array.fromAsync(extract(extracting(agent, io)));
  expect({
    phases: events.flatMap((event) =>
      event.type === "phase-started" ||
      event.type === "phase-skipped" ||
      event.type === "phase-finished"
        ? [event]
        : [],
    ),
    sessions: events.flatMap((event): Event[] =>
      event.type === "agent-ended" ? [event] : [],
    ),
  }).toEqual({
    phases: [
      { type: "phase-started", phase: "target" },
      { type: "phase-finished", phase: "target", ok: true },
      { type: "phase-started", phase: "specification" },
      { type: "phase-finished", phase: "specification", ok: true },
      { type: "phase-started", phase: "proof" },
      { type: "phase-finished", phase: "proof", ok: true },
    ],
    sessions: [
      ended("target"),
      { type: "agent-ended", role: "states-reader", turns: 1, seconds: 1 },
      { type: "agent-ended", role: "judge", ...f, turns: 1, seconds: 1 },
    ],
  });
});

test("the target's phase named on a target and interfaces already described runs no session", async () => {
  const agent = fakeAgent({ "target.yaml": target, "interfaces.yaml": interfaces }, []);
  const { io, lines } = fakeIo({});
  const events = await Array.fromAsync(extract(extracting(agent, io, "target")));
  expect({ events, received: agent.received, lines }).toEqual({
    events: [
      { type: "command-started", command: "extract", dir: "/d" },
      { type: "phase-started", phase: "target" },
      { type: "phase-finished", phase: "target", ok: true },
      { type: "command-finished", command: "extract", ok: true },
    ],
    received: [],
    lines: [],
  });
});

test("a phase named with nothing left: its roles skipped, no session", async () => {
  const agent = fakeAgent({ ...reading, ...points.judged }, []);
  const { io } = fakeIo({});
  const events = await Array.fromAsync(extract(extracting(agent, io, "proof")));
  expect({ events, received: agent.received }).toEqual({
    events: [
      { type: "command-started", command: "extract", dir: "/d" },
      { type: "phase-started", phase: "proof" },
      { type: "roles-queued", role: "builder", count: 1 },
      {
        type: "role-skipped",
        role: "builder",
        ...f,
        why: "every scenario passes and has its evidence as written",
      },
      { type: "reference-kept", path: "f/exists-a" },
      { type: "roles-queued", role: "judge", count: 1 },
      {
        type: "role-skipped",
        role: "judge",
        ...f,
        why: "every reference as written has its judgement",
      },
      { type: "roles-counted", verdicts: { ...noVerdict, holds: 1 } },
      { type: "phase-finished", phase: "proof", ok: true },
      { type: "command-finished", command: "extract", ok: true },
    ],
    received: [],
  });
});

test("a reader's gate failing its rounds ends the extraction at the specification", async () => {
  const agent = fakeAgent(
    {
      ...declared,
      "structures.yaml": reading["structures.yaml"] ?? "",
      "common.yaml": reading["common.yaml"] ?? "",
      "common-trigger.yaml": reading["common-trigger.yaml"] ?? "",
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
      { type: "phase-started", phase: "specification" },
      {
        type: "role-skipped",
        role: "structures-reader",
        why: "structures.yaml passes its check",
      },
      {
        type: "role-skipped",
        role: "common-reader",
        why: "common.yaml and common-trigger.yaml pass their check",
      },
      { type: "roles-queued", role: "reader", count: 1 },
      { type: "role-started", role: "reader", ...f },
      ...[1, 2, 3, 4].flatMap((): Event[] => [
        { type: "agent-ended", role: "reader", ...f, turns: 1, seconds: 1 },
        gate,
      ]),
      { type: "role-finished", role: "reader", ...f, ok: false },
      { type: "phase-finished", phase: "specification", ok: false },
      { type: "command-finished", command: "extract", ok: false },
    ],
    sessions: 4,
    lines: [],
  });
});

const answersPath: Files = {
  "operations/f/scenarios/answers.yaml": `
rule: answers
situation: an item
reached: yes
steps:
  - {when: call, as: u, request: {method: get, path: /f/x}}
  - {when: after, as: u, request: {method: get, path: /f/x}}
`,
  "operations/f/evidence/answers.yaml": Bun.YAML.stringify(
    {
      rule: "answers",
      run: { target: "t", version: "v", at, clock: null },
      exchanges: ["call", "after"].map((when) => ({
        when,
        as: "u",
        request: { method: "get", path: "/f/x" },
        response: { status: 404, body: null },
      })),
      noise: [],
    },
    null,
    2,
  ),
};

const rolesOf = (events: readonly Event[]) =>
  events.flatMap((event) =>
    event.type === "role-started" || event.type === "role-skipped"
      ? [{ type: event.type, role: event.role, interface: event.interface }]
      : [],
  );

test("in the proof, the interfaces a path of a state not reached names go first, as far as their judgement", async () => {
  const answer = JSON.stringify(
    ["answers", "exists-a", "state:s"].map((scenario) => ({
      scenario,
      situation: "yes",
      verdict: "holds",
      confidence: 1,
      evidence: "e",
    })),
  );
  const at = (states: string) => {
    const agent = fakeAgent(
      { ...reading, ...points.judged, ...answersPath, "states.yaml": states },
      [{ writes: {}, said: answer }],
    );
    return Array.fromAsync(extract(extracting(agent, fakeIo({}).io, "proof")));
  };
  const builderSkipped = {
    type: "role-skipped",
    role: "builder",
    interface: "f",
  } as const;
  const judgeSkipped = { ...builderSkipped, role: "judge" } as const;
  expect({
    unreached: rolesOf(await at("- {state: s, of: [S], seen: x, path: f/answers}")),
    none: rolesOf(await at("[]")),
  }).toEqual({
    unreached: [
      builderSkipped,
      { type: "role-started", role: "judge", interface: "f" },
      builderSkipped,
      judgeSkipped,
    ],
    none: [builderSkipped, { type: "role-started", role: "judge", interface: "f" }],
  });
});

test("each of the two sessions writes its own files, never the other's", () => {
  const paths = [
    "exspec/target.yaml",
    "exspec/.gitignore",
    "exspec/target/seed.sh",
    "exspec/interfaces.yaml",
    "exspec/structures.yaml",
    "exspec/operations/f/rules.yaml",
    "src/a.ts",
  ];
  expect({
    target: paths.filter(stepWrites("/d", "target")),
    interfaces: paths.filter(stepWrites("/d", "interfaces")),
  }).toEqual({
    target: ["exspec/target.yaml", "exspec/.gitignore", "exspec/target/seed.sh"],
    interfaces: ["exspec/interfaces.yaml"],
  });
});

const withProvider = `${target}proxy: {port: 9100}
observables: [{observable: p, kind: provider}]
`;

const providerFiles = {
  "providers/p/interfaces.yaml":
    'interfaces: [{interface: make, method: post, pattern: /items, responses: {"200": {body: any}}}]',
  "providers/p/provider.yaml": `
provider: p
renders: items
state: {shape: {made: int}, says: made counts what was made}
expects:
  - {expect: make-gives-key, on: make, says: a made item is answered with its key, source: src/a/b.ts}
`,
  "services/items.yaml": "{service: items, says: makes items, conditions: []}",
};

test("from nothing, the target's phase runs its two sessions, then the provider's reader and its twin's writer", async () => {
  const agent = fakeAgent({}, [
    {
      writes: {
        "target.yaml": withProvider,
        "target/env": "P_URL=http://127.0.0.1:9100/p\n",
      },
    },
    { writes: { "interfaces.yaml": interfaces } },
    { writes: providerFiles },
    { writes: { "providers/p/twin.ts": "t" } },
  ]);
  const { io } = fakeIo({});
  const tried = { ...io, tryTwin: async () => ({ fresh: {}, again: {}, given: [] }) };
  const events = await Array.fromAsync(extract(extracting(agent, tried, "target")));
  const reader = { role: "provider-reader", provider: "p" } as const;
  const writer = { role: "twin-writer", provider: "p" } as const;
  const roleEvents = (by: typeof reader | typeof writer): Event[] => [
    { type: "roles-queued", role: by.role, count: 1 },
    { type: "role-started", ...by },
    { type: "agent-ended", ...by, turns: 1, seconds: 1 },
    { type: "gate-checked", ...by, ok: true, findings: [] },
    { type: "role-finished", ...by, ok: true },
  ];
  expect(events).toEqual([
    { type: "command-started", command: "extract", dir: "/d" },
    { type: "phase-started", phase: "target" },
    ended("target"),
    ...step("stop"),
    ...step("start"),
    ...step("alive"),
    ...step("seed"),
    ...step("reset"),
    ...step("stop"),
    { type: "gate-checked", phase: "target", step: "target", ok: true, findings: [] },
    ended("interfaces"),
    { type: "gate-checked", phase: "target", step: "interfaces", ok: true, findings: [] },
    ...roleEvents(reader),
    ...roleEvents(writer),
    { type: "phase-finished", phase: "target", ok: true },
    { type: "command-finished", command: "extract", ok: true },
  ]);
});

test("a provider that nothing starting the target names at the proxy fails the target's gate before the lifecycle", async () => {
  const agent = fakeAgent({}, [{ writes: { "target.yaml": withProvider } }]);
  const { io, lines } = fakeIo({});
  const events = await Array.fromAsync(extract(extracting(agent, io, "target")));
  expect({ gate: events[3], lines }).toEqual({
    gate: {
      type: "gate-checked",
      phase: "target",
      step: "target",
      ok: false,
      findings: [
        'target.yaml: the provider "p" is declared and nothing that starts the target names it at the proxy — expected http://127.0.0.1:9100/p in the start lines or in a file of exspec/target/',
      ],
    },
    lines: [],
  });
});

test("the providers are stood once, when the proof starts, and only there", async () => {
  const log: (Event | "stood")[] = [];
  const effect = {
    observable: "p",
    request: { method: "post", path: "/items" },
    response: { status: 200, body: null },
  } as const;
  const { io } = fakeIo({
    "http://h/f/x": [
      { status: 404, body: null },
      { status: 404, body: null },
    ],
  });
  const stand: Extracting["ioForProof"] = async () => {
    log.push("stood");
    return {
      ...io,
      takeSideEffects: async () => [effect],
      resetProviders: async () => {},
    };
  };
  const files = { ...reading, ...points["played once"] };
  const run = (only: Extracting["only"]) =>
    extract(extracting(fakeAgent(files, []), io, only, stand));
  for (const only of ["target", "specification"] as const) {
    for await (const event of run(only)) log.push(event);
  }
  const before = log.length;
  for await (const event of run("proof")) log.push(event);
  const proof = log.slice(before);
  expect({
    before: log.slice(0, before).filter((one) => one === "stood"),
    head: proof.slice(0, 4),
    evidence: proof.flatMap((one) =>
      one !== "stood" && one.type === "steps-played" ? [one.evidence.exchanges] : [],
    ),
  }).toEqual({
    before: [],
    head: [
      { type: "command-started", command: "extract", dir: "/d" },
      { type: "phase-started", phase: "proof" },
      "stood",
      { type: "roles-queued", role: "builder", count: 1 },
    ],
    evidence: [1, 2].map(() => [
      {
        when: "call",
        as: "u",
        request: { method: "get", path: "/f/x" },
        response: { status: 404, body: null },
        "side-effects": [effect],
      },
    ]),
  });
});
