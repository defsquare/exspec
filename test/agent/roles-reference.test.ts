import { expect, test } from "bun:test";
import type { Drive } from "../../src/agent/drive.ts";
import type { RolesRun } from "../../src/agent/roles.ts";
import { rolesRecord } from "../../src/agent/roles-record.ts";
import { rolesReplay } from "../../src/agent/roles-replay.ts";
import type { Event } from "../../src/shapes/event.ts";
import type { Evidence } from "../../src/shapes/roles.ts";
import type { Difference, TargetResponse } from "../../src/shapes/scenario.ts";
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
  "roles/f/rules.yaml": `
operation: f
requires:
  - {rule: exists, fact: the item exists, otherwise: {refusal: not-found, status: 404, body: empty}, source: "F.java:1"}
answers: {says: "200", structure: null}
`,
  "roles/f/hints.yaml":
    "- {rule: exists, situation: s, how: h, seen-in: none, reachable: yes}",
  "roles/f/scenarios/exists-a.yaml": `
rule: exists
situation: an id no item has
reached: yes
steps:
  - {when: call, as: u, request: {method: get, path: /f/x}}
`,
};

const drive: Drive = async function* () {
  yield* [];
  throw new Error("no agent");
};

function rolesRunOf(more: Files, io: RolesRun["io"], only?: string) {
  const files = new Map(Object.entries({ ...reading, ...more }));
  const written: { path: string; evidence: unknown }[] = [];
  const rolesRun: RolesRun = {
    dir: "/d",
    ...(only === undefined ? {} : { only }),
    jobs: 1,
    model: "m",
    drive,
    io,
    readFiles: async () => [...files].map(([path, text]) => ({ path, text })),
    writeFile: async (_dir, path, text) => {
      written.push({ path, evidence: Bun.YAML.parse(text) });
    },
    removeFile: async () => {},
  };
  return { rolesRun, written };
}

const response = (stamp: string, a = 1, status = 404): TargetResponse => ({
  status,
  body: { at: stamp, a },
});

const evidenceOf = (
  { version, stamp }: { readonly version: string; readonly stamp: string },
  more: Partial<Evidence> = {},
): Evidence => ({
  rule: "exists",
  run: { target: "t", version, at: "2026-11-01T10:00:00.000Z", clock: null },
  exchanges: [
    {
      when: "call",
      as: "u",
      request: { method: "get", path: "/f/x" },
      response: response(stamp),
    },
  ],
  ...more,
});

const played = (stamp: string, a = 1, status = 404): Evidence => ({
  rule: "exists",
  run: { target: "t", version: "v", at, clock: null },
  exchanges: [
    {
      when: "call",
      as: "u",
      request: { method: "get", path: "/f/x" },
      response: response(stamp, a, status),
    },
  ],
});

const noise = [{ at: ["exchanges", 0, "response", "body", "at"], class: 1 }];

const stepsPlayed = (evidence: Evidence): Event => ({
  type: "steps-played",
  interface: "f",
  scenario: "exists-a",
  evidence,
});

const evidenceFile = (evidence: Evidence) => ({
  "roles/f/evidence/exists-a.yaml": Bun.YAML.stringify(evidence, null, 2),
});

async function recordWith(
  more: Files,
  answers: readonly TargetResponse[],
  force = false,
) {
  const { io, lines } = fakeIo({ "http://h/f/x": answers });
  const { rolesRun, written } = rolesRunOf(more, io);
  const events = await Array.fromAsync(rolesRecord(rolesRun, force));
  return { events, lines, written };
}

type Played = Awaited<ReturnType<typeof recordWith>>;

const twoStacks: Played = {
  events: [
    { type: "command-started", command: "roles-record", dir: "/d" },
    ...step("stop"),
    ...step("start"),
    ...step("alive"),
    ...step("seed"),
    stepsPlayed(played("t1")),
    ...step("stop"),
    ...step("start"),
    ...step("alive"),
    ...step("seed"),
    stepsPlayed(played("t2")),
    { type: "reference-written", path: "f/exists-a", noise: 1 },
    ...step("stop"),
    { type: "command-finished", command: "roles-record", ok: true },
  ],
  lines: ["stop", "start", "seed", "reset", "stop", "start", "seed", "reset", "stop"],
  written: [
    { path: "roles/f/evidence/exists-a.yaml", evidence: { ...played("t1"), noise } },
  ],
};

test("roles record plays an evidence as written once more on one stack, and writes it with its noise", async () => {
  const evidence = evidenceOf({ version: "v", stamp: "t1" });
  expect(await recordWith(evidenceFile(evidence), [response("t2")])).toEqual({
    events: [
      { type: "command-started", command: "roles-record", dir: "/d" },
      ...step("stop"),
      ...step("start"),
      ...step("alive"),
      ...step("seed"),
      stepsPlayed(played("t2")),
      { type: "reference-written", path: "f/exists-a", noise: 1 },
      ...step("stop"),
      { type: "command-finished", command: "roles-record", ok: true },
    ],
    lines: ["stop", "start", "seed", "reset", "stop"],
    written: [
      { path: "roles/f/evidence/exists-a.yaml", evidence: { ...evidence, noise } },
    ],
  });
});

test("roles record plays a scenario with no evidence on two stacks and writes the first copy", async () => {
  expect(await recordWith({}, [response("t1"), response("t2")])).toEqual(twoStacks);
});

test("roles record treats an evidence played once on another version as none", async () => {
  const evidence = evidenceOf({ version: "w", stamp: "t0" });
  expect(
    await recordWith(evidenceFile(evidence), [response("t1"), response("t2")]),
  ).toEqual(twoStacks);
});

test("roles record keeps a reference as written taken on another version, with no target started", async () => {
  const evidence = evidenceOf({ version: "w", stamp: "t0" }, { noise });
  expect(await recordWith(evidenceFile(evidence), [])).toEqual({
    events: [
      { type: "command-started", command: "roles-record", dir: "/d" },
      { type: "reference-kept", path: "f/exists-a" },
      { type: "command-finished", command: "roles-record", ok: true },
    ],
    lines: [],
    written: [],
  });
});

test("roles record keeps a reference as written with no target started, unless forced", async () => {
  const evidence = evidenceOf({ version: "v", stamp: "t0" }, { noise });
  expect({
    kept: await recordWith(evidenceFile(evidence), []),
    forced: await recordWith(
      evidenceFile(evidence),
      [response("t1"), response("t2")],
      true,
    ),
  }).toEqual({
    kept: {
      events: [
        { type: "command-started", command: "roles-record", dir: "/d" },
        { type: "reference-kept", path: "f/exists-a" },
        { type: "command-finished", command: "roles-record", ok: true },
      ],
      lines: [],
      written: [],
    },
    forced: twoStacks,
  });
});

test("roles record writes nothing for a scenario whose second play answers another status", async () => {
  expect(await recordWith({}, [response("t1"), response("t1", 1, 500)])).toEqual({
    events: [
      { type: "command-started", command: "roles-record", dir: "/d" },
      ...step("stop"),
      ...step("start"),
      ...step("alive"),
      ...step("seed"),
      stepsPlayed(played("t1")),
      ...step("stop"),
      ...step("start"),
      ...step("alive"),
      ...step("seed"),
      stepsPlayed(played("t1", 1, 500)),
      {
        type: "scenario-unstable",
        path: "f/exists-a",
        differences: [
          { at: ["exchanges", 0, "response", "status"], first: 404, second: 500 },
        ],
      },
      ...step("stop"),
      { type: "command-finished", command: "roles-record", ok: false },
    ],
    lines: ["stop", "start", "seed", "reset", "stop", "start", "seed", "reset", "stop"],
    written: [],
  });
});

async function replayWith(more: Files, answers: readonly TargetResponse[]) {
  const { io, lines } = fakeIo({ "http://h/f/x": answers });
  const { rolesRun, written } = rolesRunOf(more, io);
  const events = await Array.fromAsync(rolesReplay(rolesRun));
  return { events, lines, written };
}

const replayed = (
  copy: Evidence,
  differences: readonly Difference[],
  ok: boolean,
): Played => ({
  events: [
    { type: "command-started", command: "roles-replay", dir: "/d" },
    ...step("stop"),
    ...step("start"),
    ...step("alive"),
    ...step("seed"),
    stepsPlayed(copy),
    { type: "scenario-replayed", path: "f/exists-a", differences },
    ...step("stop"),
    { type: "command-finished", command: "roles-replay", ok },
  ],
  lines: ["stop", "start", "seed", "reset", "stop"],
  written: [],
});

test("roles replay compares a copy with its reference outside the noise", async () => {
  const reference = evidenceFile(evidenceOf({ version: "w", stamp: "t0" }, { noise }));
  expect({
    equal: await replayWith(reference, [response("t3")]),
    changed: await replayWith(reference, [response("t3", 2)]),
    none: await replayWith({}, []),
  }).toEqual({
    equal: replayed(played("t3"), [], true),
    changed: replayed(
      played("t3", 2),
      [{ at: ["exchanges", 0, "response", "body", "a"], expected: 1, actual: 2 }],
      false,
    ),
    none: {
      events: [
        { type: "command-started", command: "roles-replay", dir: "/d" },
        { type: "command-failed", message: "no reference to replay" },
        { type: "command-finished", command: "roles-replay", ok: false },
      ],
      lines: [],
      written: [],
    },
  });
});

test("roles record tells an interface whose scenarios fail their check, and plays nothing of it", async () => {
  const scenario = reading["roles/f/scenarios/exists-a.yaml"] ?? "";
  expect(
    await recordWith(
      { "roles/f/scenarios/exists-a.yaml": scenario.replace("as: u", "as: c") },
      [],
    ),
  ).toEqual({
    events: [
      { type: "command-started", command: "roles-record", dir: "/d" },
      ...step("stop"),
      ...step("start"),
      ...step("alive"),
      ...step("seed"),
      {
        type: "gate-checked",
        role: "builder",
        interface: "f",
        ok: false,
        findings: ['scenarios/exists-a.yaml: step 1: "c" is not an actor (u)'],
      },
      ...step("stop"),
      { type: "command-finished", command: "roles-record", ok: false },
    ],
    lines: ["stop", "start", "seed", "stop"],
    written: [],
  });
});

test("roles replay refuses a reference with a step that could not be played", async () => {
  const reference = evidenceOf(
    { version: "v", stamp: "t0" },
    { noise, exchanges: [{ when: "call", as: "u", unplayable: "x" }] },
  );
  expect(await replayWith(evidenceFile(reference), [])).toEqual({
    events: [
      { type: "command-started", command: "roles-replay", dir: "/d" },
      {
        type: "scenario-unplayable",
        path: "f/exists-a",
        message: "its evidence has a step that could not be played: record it again",
      },
      { type: "command-failed", message: "no reference to replay" },
      { type: "command-finished", command: "roles-replay", ok: false },
    ],
    lines: [],
    written: [],
  });
});
