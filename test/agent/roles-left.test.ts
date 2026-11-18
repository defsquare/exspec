import { expect, test } from "bun:test";
import type { Drive } from "../../src/agent/drive.ts";
import type { RolesRun } from "../../src/agent/roles.ts";
import { rolesBuild } from "../../src/agent/roles-build.ts";
import { rolesJudge } from "../../src/agent/roles-judge.ts";
import { rolesRead } from "../../src/agent/roles-read.ts";
import { rolesRecord } from "../../src/agent/roles-record.ts";
import type { Event, Role } from "../../src/shapes/event.ts";
import { type Files, filesOf, points } from "../roles-left-fixture.ts";
import { fakeIo } from "../run/fake.ts";

const drive: Drive = async function* () {
  yield* [];
  throw new Error("no agent");
};

function rolesRunOf(more: Files): RolesRun {
  const files = new Map(filesOf(more).map(({ path, text }) => [path, text]));
  const { io } = fakeIo({
    "http://h/f/x": [
      { status: 404, body: null },
      { status: 404, body: null },
    ],
    "http://h/f/y": [
      { status: 404, body: null },
      { status: 404, body: null },
    ],
  });
  return {
    dir: "/d",
    jobs: 1,
    model: "m",
    drive,
    io,
    readFiles: async () => [...files].map(([path, text]) => ({ path, text })),
    writeFile: async (_dir, path, text) => {
      files.set(path, text);
    },
    removeFile: async (_dir, path) => {
      files.delete(path);
    },
  };
}

const whetherRan = (events: readonly Event[], role: Role) =>
  events.flatMap((event) =>
    (event.type === "role-skipped" || event.type === "role-started") &&
    event.role === role
      ? [event.type === "role-skipped" ? "skipped" : "ran"]
      : [],
  );

async function rolesAt(more: Files) {
  const record = await Array.fromAsync(rolesRecord(rolesRunOf(more), false));
  return {
    reader: whetherRan(await Array.fromAsync(rolesRead(rolesRunOf(more))), "reader"),
    builder: whetherRan(await Array.fromAsync(rolesBuild(rolesRunOf(more))), "builder"),
    judge: whetherRan(await Array.fromAsync(rolesJudge(rolesRunOf(more))), "judge"),
    record: record.flatMap(({ type }) =>
      ["target-step", "command-started", "command-finished"].includes(type) ? [] : [type],
    ),
  };
}

test("the role the files leave something to is the one that runs", async () => {
  const at = (point: keyof typeof points) => rolesAt(points[point]);
  expect({
    "no scenario": await at("no scenario"),
    "played once": await at("played once"),
    "a reference": await at("a reference"),
    "a stale judgement": await at("a stale judgement"),
    judged: await at("judged"),
    "edited after its evidence": await at("edited after its evidence"),
    "as an unknown actor": await at("as an unknown actor"),
  }).toEqual({
    "no scenario": {
      reader: ["skipped"],
      builder: ["ran"],
      judge: ["skipped"],
      record: ["gate-checked"],
    },
    "played once": {
      reader: ["skipped"],
      builder: ["skipped"],
      judge: ["skipped"],
      record: ["steps-played", "reference-written"],
    },
    "a reference": {
      reader: ["skipped"],
      builder: ["skipped"],
      judge: ["ran"],
      record: ["reference-kept"],
    },
    "a stale judgement": {
      reader: ["skipped"],
      builder: ["skipped"],
      judge: ["ran"],
      record: ["reference-kept"],
    },
    judged: {
      reader: ["skipped"],
      builder: ["skipped"],
      judge: ["skipped"],
      record: ["reference-kept"],
    },
    "edited after its evidence": {
      reader: ["skipped"],
      builder: ["ran"],
      judge: ["skipped"],
      record: ["steps-played", "steps-played", "reference-written"],
    },
    "as an unknown actor": {
      reader: ["skipped"],
      builder: ["ran"],
      judge: ["skipped"],
      record: ["gate-checked"],
    },
  });
});

test("a judge skipped while an evidence was played once says what waits", async () => {
  const events = await Array.fromAsync(rolesJudge(rolesRunOf(points["played once"])));
  expect(events).toEqual([
    { type: "command-started", command: "roles-judge", dir: "/d" },
    {
      type: "role-skipped",
      role: "judge",
      interface: "f",
      why: "no reference waits for its judgement; 1 scenarios wait for roles build or roles record",
    },
    {
      type: "roles-counted",
      verdicts: { holds: 0, contradicted: 0, "refused-unexpectedly": 0, "not-shown": 0 },
    },
    { type: "command-finished", command: "roles-judge", ok: true },
  ]);
});
