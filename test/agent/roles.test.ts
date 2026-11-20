import { expect, test } from "bun:test";
import type { Drive } from "../../src/agent/drive.ts";
import type { RolesRun } from "../../src/agent/roles.ts";
import { rolesBuild } from "../../src/agent/roles-build.ts";
import type { Role } from "../../src/shapes/event.ts";
import type { Evidence } from "../../src/shapes/roles.ts";
import { target } from "../files.ts";
import { at, fakeIo, step } from "../run/fake.ts";

type Files = Readonly<Record<string, string>>;

const reading: Files = {
  "target.yaml": target,
  "interfaces.yaml": `
interfaces:
  - {interface: f, method: get, pattern: "/f/{a}", responses: {200: {body: any}}}
`,
  "roles/common.yaml": "target: t",
  "roles/protocol.yaml": "target: t",
  "roles/f/trigger.yaml":
    "{trigger: f, interface: f, operation: f, answers: {status: 200}, refuses: {not-found: {status: 404, body: empty}}}",
  "roles/f/rules.yaml": `
operation: f
requires:
  - {rule: exists, fact: the item exists, otherwise: not-found, source: "F.java:1"}
answers: {says: "the item", structure: null}
`,
  "roles/f/hints.yaml":
    "- {rule: exists, situation: s, how: h, seen-in: none, reachable: yes}",
};

const scenario = (as: string) => `
rule: exists
situation: an id no item has
reached: yes
steps:
  - {when: call, as: ${as}, request: {method: get, path: /f/x}}
`;

// each session writes its files, then ends; what it may write is noted
function fakeAgent(sessions: readonly Files[], more: Files = {}) {
  const files = new Map(Object.entries({ ...reading, ...more }));
  const received: { prompt: string; resume?: string; mayWrite: boolean[] }[] = [];
  const drive: Drive = async function* ({ prompt, resume, mayWrite }) {
    const writes = sessions[received.length];
    received.push({
      prompt,
      ...(resume === undefined ? {} : { resume }),
      mayWrite: [
        "exspec/roles/f/scenarios/exists.yaml",
        "exspec/roles/f/evidence/exists.yaml",
        "exspec/roles/f/rules.yaml",
      ].map(mayWrite),
    });
    if (writes === undefined) throw new Error("no session left");
    for (const [path, text] of Object.entries(writes)) files.set(path, text);
    yield { type: "agent-ended", turns: 1, seconds: 1 };
    return { session: resume ?? `s${received.length}`, ok: true };
  };
  const written: { path: string; text: string }[] = [];
  const removed: string[] = [];
  const rolesRun = (io: RolesRun["io"]): RolesRun => ({
    dir: "/d",
    jobs: 4,
    model: "m",
    drive,
    io,
    readFiles: async () => [...files].map(([path, text]) => ({ path, text })),
    writeFile: async (_dir, path, text) => {
      written.push({ path, text });
      files.set(path, text);
    },
    removeFile: async (_dir, path) => {
      removed.push(path);
      files.delete(path);
    },
  });
  return { rolesRun, received, written, removed };
}

const by: { readonly role: Role; readonly interface: string } = {
  role: "builder",
  interface: "f",
};

test("a builder's failed gate goes back to its session; the tool writes the evidence", async () => {
  const agent = fakeAgent([
    { "roles/f/scenarios/exists.yaml": scenario("carl") },
    { "roles/f/scenarios/exists.yaml": scenario("u") },
  ]);
  const { io, lines } = fakeIo({ "http://h/f/x": [{ status: 404, body: null }] });
  const events = await Array.fromAsync(rolesBuild(agent.rolesRun(io)));
  const evidence: Evidence = {
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
  expect({
    events,
    received: agent.received,
    lines,
    written: agent.written.map(({ path, text }) => ({
      path,
      evidence: Bun.YAML.parse(text),
    })),
  }).toEqual({
    events: [
      { type: "command-started", command: "roles-build", dir: "/d" },
      { type: "roles-queued", role: "builder", count: 1 },
      ...step("start"),
      ...step("alive"),
      ...step("seed"),
      { type: "role-started", ...by },
      { type: "agent-ended", ...by, turns: 1, seconds: 1 },
      {
        type: "gate-checked",
        ...by,
        ok: false,
        findings: ['scenarios/exists.yaml: step 1: "carl" is not an actor (u)'],
      },
      { type: "agent-ended", ...by, turns: 1, seconds: 1 },
      { type: "steps-played", interface: "f", scenario: "exists", evidence },
      { type: "gate-checked", ...by, ok: true, findings: [] },
      { type: "role-finished", ...by, ok: true },
      ...step("stop"),
      { type: "command-finished", command: "roles-build", ok: true },
    ],
    received: [
      {
        prompt: [
          "The actors: u; null for a call by nobody.",
          "The operations a step may call, by their inputs, and what each answers:",
          "- f: takes nothing. Answers no structure a hole can read: the operation answers no structure.",
          "The operation: f, GET /f/{a}.",
          "Your folder: exspec/roles/f/ — rules.yaml, hints.yaml and trigger.yaml are there; write each scenario as scenarios/<slug>.yaml there.",
        ].join("\n"),
        mayWrite: [true, false, false],
      },
      {
        prompt: [
          "The tool's check of what you wrote failed. Fix what follows, then end with the same short message.",
          "",
          'scenarios/exists.yaml: step 1: "carl" is not an actor (u)',
        ].join("\n"),
        resume: "s1",
        mayWrite: [true, false, false],
      },
    ],
    lines: ["start", "seed", "reset", "stop"],
    written: [{ path: "roles/f/evidence/exists.yaml", evidence }],
  });
});

const scenarioAt = (path: string) => `
rule: exists
situation: an id no item has
reached: yes
steps:
  - {when: call, as: u, request: {method: get, path: ${path}}}
`;

const evidenceAt = (path: string) => `rule: exists
run: {target: t, version: w, at: "2026-11-01T10:00:00.000Z", clock: null}
exchanges:
  - {when: call, as: u, request: {method: get, path: ${path}}, response: {status: 404, body: null}}
noise: []
`;

test("a builder's gate plays a scenario whose evidence is of it as it was, and leaves the other alone", async () => {
  const agent = fakeAgent([{}], {
    "roles/f/scenarios/exists-a.yaml": scenarioAt("/f/x"),
    "roles/f/scenarios/exists-b.yaml": scenarioAt("/f/y"),
    "roles/f/evidence/exists-a.yaml": evidenceAt("/f/x"),
    "roles/f/evidence/exists-b.yaml": evidenceAt("/f/z"),
  });
  const { io, lines } = fakeIo({ "http://h/f/y": [{ status: 404, body: null }] });
  const events = await Array.fromAsync(rolesBuild(agent.rolesRun(io)));
  const evidence: Evidence = {
    rule: "exists",
    run: { target: "t", version: "v", at, clock: null },
    exchanges: [
      {
        when: "call",
        as: "u",
        request: { method: "get", path: "/f/y" },
        response: { status: 404, body: null },
      },
    ],
  };
  expect({
    events,
    lines,
    written: agent.written.map(({ path, text }) => ({
      path,
      evidence: Bun.YAML.parse(text),
    })),
  }).toEqual({
    events: [
      { type: "command-started", command: "roles-build", dir: "/d" },
      { type: "roles-queued", role: "builder", count: 1 },
      ...step("start"),
      ...step("alive"),
      ...step("seed"),
      { type: "role-started", ...by },
      { type: "agent-ended", ...by, turns: 1, seconds: 1 },
      { type: "steps-played", interface: "f", scenario: "exists-b", evidence },
      { type: "gate-checked", ...by, ok: true, findings: [] },
      { type: "role-finished", ...by, ok: true },
      ...step("stop"),
      { type: "command-finished", command: "roles-build", ok: true },
    ],
    lines: ["start", "seed", "reset", "stop"],
    written: [{ path: "roles/f/evidence/exists-b.yaml", evidence }],
  });
});

test("a scenario file no rule of the reading can own is removed, with its evidence", async () => {
  const agent = fakeAgent([{}], {
    "roles/f/scenarios/exists-a.yaml": scenarioAt("/f/x"),
    "roles/f/evidence/exists-a.yaml": evidenceAt("/f/x"),
    "roles/f/scenarios/gone.yaml": scenarioAt("/f/y"),
    "roles/f/evidence/gone.yaml": evidenceAt("/f/y"),
  });
  const { io } = fakeIo({});
  const events = await Array.fromAsync(rolesBuild(agent.rolesRun(io)));
  expect({ events, removed: agent.removed, written: agent.written }).toEqual({
    events: [
      { type: "command-started", command: "roles-build", dir: "/d" },
      { type: "roles-queued", role: "builder", count: 1 },
      ...step("start"),
      ...step("alive"),
      ...step("seed"),
      { type: "role-started", ...by },
      { type: "agent-ended", ...by, turns: 1, seconds: 1 },
      { type: "gate-checked", ...by, ok: true, findings: [] },
      { type: "role-finished", ...by, ok: true },
      ...step("stop"),
      { type: "command-finished", command: "roles-build", ok: true },
    ],
    removed: ["roles/f/scenarios/gone.yaml", "roles/f/evidence/gone.yaml"],
    written: [],
  });
});

test("a builder is told of a scenario it wrote under a name no rule can own", async () => {
  const agent = fakeAgent([
    { "roles/f/scenarios/other.yaml": scenario("u") },
    { "roles/f/scenarios/exists.yaml": scenario("u") },
  ]);
  const { io } = fakeIo({ "http://h/f/x": [{ status: 404, body: null }] });
  const events = await Array.fromAsync(rolesBuild(agent.rolesRun(io)));
  expect({
    gates: events.filter(({ type }) => type === "gate-checked"),
    removed: agent.removed,
    written: agent.written.map(({ path }) => path),
  }).toEqual({
    gates: [
      {
        type: "gate-checked",
        ...by,
        ok: false,
        findings: [
          "scenarios/other.yaml: its name starts with no rule of rules.yaml — removed",
          'no scenario for the rule "exists"',
        ],
      },
      { type: "gate-checked", ...by, ok: true, findings: [] },
    ],
    removed: ["roles/f/scenarios/other.yaml"],
    written: ["roles/f/evidence/exists.yaml"],
  });
});

test("roles build starts no target when every scenario has its evidence as written, and skips each builder", async () => {
  const agent = fakeAgent([], {
    "roles/f/scenarios/exists-a.yaml": scenarioAt("/f/x"),
    "roles/f/evidence/exists-a.yaml": evidenceAt("/f/x"),
  });
  const { io, lines } = fakeIo({});
  const events = await Array.fromAsync(rolesBuild(agent.rolesRun(io)));
  expect({ events, lines, written: agent.written }).toEqual({
    events: [
      { type: "command-started", command: "roles-build", dir: "/d" },
      { type: "roles-queued", role: "builder", count: 1 },
      {
        type: "role-skipped",
        ...by,
        why: "every scenario passes and has its evidence as written",
      },
      { type: "command-finished", command: "roles-build", ok: true },
    ],
    lines: [],
    written: [],
  });
});
