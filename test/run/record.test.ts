import { expect, test } from "bun:test";
import { record } from "../../src/run/record.ts";
import type { PlayedScenario, TargetResponse } from "../../src/shapes/scenario.ts";
import { at, extract, fakeIo, scenarioFile, step } from "./fake.ts";

const playedWith = (a: string, response: TargetResponse): PlayedScenario => ({
  scenario: "s",
  says: "s",
  proves: ["r"],
  assert: [],
  run: { target: "t", version: "v", at, clock: null },
  arrange: [],
  act: {
    call: { operation: "f", with: { a }, caller: "u" },
    response,
  },
  readings: [],
});

test("two executions that agree but for their noise give a reference", async () => {
  const first = { status: 200, body: { a: "t1", b: "t1", c: 1 } };
  const second = { status: 200, body: { a: "t2", b: "t2", c: 1 } };
  const { io, lines, written } = fakeIo({ "http://h/f/x": [first, second] });
  const events = await Array.fromAsync(
    record(
      {
        dir: "/d",
        extraction: extract({ "scenarios/f/a.yaml": scenarioFile("x") }),
        paths: [],
        force: false,
      },
      io,
    ),
  );
  expect({ events, lines, written }).toEqual({
    events: [
      { type: "command-started", command: "record", dir: "/d" },
      ...step("stop"),
      ...step("start"),
      ...step("alive"),
      ...step("seed"),
      ...step("reset"),
      { type: "scenario-played", path: "f/a", played: playedWith("x", first) },
      ...step("stop"),
      ...step("start"),
      ...step("alive"),
      ...step("seed"),
      ...step("reset"),
      { type: "scenario-played", path: "f/a", played: playedWith("x", second) },
      ...step("stop"),
      { type: "reference-written", path: "f/a", noise: 2 },
      { type: "command-finished", command: "record", ok: true },
    ],
    lines: ["stop", "start", "seed", "reset", "stop", "start", "seed", "reset", "stop"],
    written: [
      {
        path: "f/a",
        reference: {
          ...playedWith("x", first),
          noise: [
            { at: ["act", "response", "body", "a"], class: 1 },
            { at: ["act", "response", "body", "b"], class: 1 },
          ],
        },
      },
    ],
  });
});

test("an unstable scenario, a reference kept, an unplayable call", async () => {
  const { io, written } = fakeIo({
    "http://h/f/x": [
      { status: 200, body: null },
      { status: 500, body: null },
    ],
    "http://h/f/y": [
      { status: 200, body: null },
      { status: 200, body: null },
    ],
  });
  const kept = { ...playedWith("y", { status: 200, body: null }), noise: [] };
  const events = await Array.fromAsync(
    record(
      {
        dir: "/d",
        extraction: {
          ...extract({
            "scenarios/f/a.yaml": scenarioFile("x"),
            "scenarios/f/b.yaml": scenarioFile("y"),
            "scenarios/f/c.yaml": scenarioFile("z", "w"),
          }),
          references: [{ path: "f/b", reference: kept }],
        },
        paths: [],
        force: false,
      },
      io,
    ),
  );
  expect({
    events: events.filter(
      ({ type }) => type !== "target-step" && type !== "scenario-played",
    ),
    written,
  }).toEqual({
    events: [
      { type: "command-started", command: "record", dir: "/d" },
      { type: "scenario-unplayable", path: "f/c", message: 'no credentials for "w"' },
      {
        type: "scenario-unstable",
        path: "f/a",
        differences: [{ at: ["act", "response", "status"], first: 200, second: 500 }],
      },
      { type: "reference-kept", path: "f/b" },
      { type: "command-finished", command: "record", ok: false },
    ],
    written: [],
  });
});

test("a lifecycle command that fails ends the record after a stop", async () => {
  const { io, lines } = fakeIo({}, { failing: "seed" });
  const events = await Array.fromAsync(
    record(
      {
        dir: "/d",
        extraction: extract({ "scenarios/f/a.yaml": scenarioFile("x") }),
        paths: ["f/a"],
        force: true,
      },
      io,
    ),
  );
  expect({ events, lines }).toEqual({
    events: [
      { type: "command-started", command: "record", dir: "/d" },
      ...step("stop"),
      ...step("start"),
      ...step("alive"),
      { type: "target-step", step: "seed", state: "started" },
      { type: "command-failed", message: "seed failed" },
      ...step("stop"),
      { type: "command-finished", command: "record", ok: false },
    ],
    lines: ["stop", "start", "seed", "stop"],
  });
});

test("a path that names no scenario refuses the command", async () => {
  const { io, lines } = fakeIo({});
  expect({
    events: await Array.fromAsync(
      record({ dir: "/d", extraction: extract({}), paths: ["f/z"], force: false }, io),
    ),
    lines,
  }).toEqual({
    events: [
      { type: "command-started", command: "record", dir: "/d" },
      { type: "command-failed", message: "no scenario at f/z" },
      { type: "command-finished", command: "record", ok: false },
    ],
    lines: [],
  });
});

test("a reference of the scenario as it was is replaced", async () => {
  const answer = { status: 200, body: null };
  const { io, written } = fakeIo({ "http://h/f/x": [answer, answer] });
  const events = await Array.fromAsync(
    record(
      {
        dir: "/d",
        extraction: {
          ...extract({ "scenarios/f/a.yaml": scenarioFile("x") }),
          references: [
            { path: "f/a", reference: { ...playedWith("w", answer), noise: [] } },
          ],
        },
        paths: [],
        force: false,
      },
      io,
    ),
  );
  expect({
    events: events.filter(
      ({ type }) => type !== "target-step" && type !== "scenario-played",
    ),
    written,
  }).toEqual({
    events: [
      { type: "command-started", command: "record", dir: "/d" },
      { type: "reference-written", path: "f/a", noise: 0 },
      { type: "command-finished", command: "record", ok: true },
    ],
    written: [{ path: "f/a", reference: { ...playedWith("x", answer), noise: [] } }],
  });
});
