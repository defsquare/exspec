import { expect, test } from "bun:test";
import { replay } from "../../src/run/replay.ts";
import type { Reference } from "../../src/shapes/scenario.ts";
import { at, extract, fakeIo, scenarioFile } from "./fake.ts";

const reference = (a: string): Reference => ({
  scenario: "s",
  says: "s",
  proves: ["r"],
  run: { target: "t", version: "w", at, clock: null },
  arrange: [],
  act: {
    call: { operation: "f", with: { a }, caller: "u" },
    response: { status: 200, body: { a: "t1", b: "t1", c: 1 } },
  },
  noise: [
    { at: ["act", "response", "body", "a"], class: 1 },
    { at: ["act", "response", "body", "b"], class: 1 },
  ],
});

test("each scenario with a reference is played once and compared with it", async () => {
  const { io, lines } = fakeIo({
    "http://h/f/x": [{ status: 200, body: { a: "t3", b: "t3", c: 1 } }],
    "http://h/f/y": [{ status: 200, body: { a: "t3", b: "t4", c: 2 } }],
  });
  const events = await Array.fromAsync(
    replay(
      {
        dir: "/d",
        extraction: {
          ...extract({
            "scenarios/f/a.yaml": scenarioFile("x"),
            "scenarios/f/b.yaml": scenarioFile("y"),
            "scenarios/f/c.yaml": scenarioFile("z"),
          }),
          references: [
            { path: "f/a", reference: reference("x") },
            { path: "f/b", reference: reference("y") },
          ],
        },
        paths: [],
      },
      io,
    ),
  );
  expect({
    events: events.filter(
      ({ type }) => type !== "target-step" && type !== "scenario-played",
    ),
    lines,
  }).toEqual({
    events: [
      { type: "command-started", command: "replay", dir: "/d" },
      { type: "scenario-replayed", path: "f/a", differences: [] },
      {
        type: "scenario-replayed",
        path: "f/b",
        differences: [
          { at: ["act", "response", "body", "c"], expected: 1, actual: 2 },
          { at: ["act", "response", "body", "b"], expected: "t3", actual: "t4" },
        ],
      },
      { type: "command-finished", command: "replay", ok: false },
    ],
    lines: ["stop", "start", "seed", "reset", "reset", "stop"],
  });
});

test("with no reference to compare with, nothing is started and the replay fails", async () => {
  const { io, lines } = fakeIo({});
  const events = await Array.fromAsync(
    replay(
      {
        dir: "/d",
        extraction: extract({ "scenarios/f/a.yaml": scenarioFile("x") }),
        paths: [],
      },
      io,
    ),
  );
  expect({ events, lines }).toEqual({
    events: [
      { type: "command-started", command: "replay", dir: "/d" },
      { type: "command-failed", message: "no reference to replay" },
      { type: "command-finished", command: "replay", ok: false },
    ],
    lines: [],
  });
});

test("a reference of the scenario as it was, and a named scenario with none, are refused", async () => {
  const { io } = fakeIo({
    "http://h/f/x": [{ status: 200, body: { a: "t3", b: "t3", c: 1 } }],
  });
  const events = await Array.fromAsync(
    replay(
      {
        dir: "/d",
        extraction: {
          ...extract({
            "scenarios/f/a.yaml": scenarioFile("x"),
            "scenarios/f/b.yaml": scenarioFile("y"),
            "scenarios/f/c.yaml": scenarioFile("z"),
          }),
          references: [
            { path: "f/a", reference: reference("x") },
            { path: "f/b", reference: reference("w") },
          ],
        },
        paths: ["f/a", "f/b", "f/c"],
      },
      io,
    ),
  );
  expect(
    events.filter(({ type }) => type !== "target-step" && type !== "scenario-played"),
  ).toEqual([
    { type: "command-started", command: "replay", dir: "/d" },
    {
      type: "scenario-unplayable",
      path: "f/b",
      message: "its reference is of the scenario as it was: record it again",
    },
    { type: "scenario-unplayable", path: "f/c", message: "it has no reference" },
    { type: "scenario-replayed", path: "f/a", differences: [] },
    { type: "command-finished", command: "replay", ok: false },
  ]);
});
