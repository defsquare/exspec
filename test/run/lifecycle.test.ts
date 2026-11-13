import { expect, test } from "bun:test";
import { down, play, up } from "../../src/run/target-commands.ts";
import { at, extract, fakeIo, scenarioFile, step } from "./fake.ts";

const asked = { dir: "/d", extraction: extract({}), paths: [] };

test("up starts, waits until the target answers, seeds", async () => {
  const { io, lines, sleeps } = fakeIo({}, { unreachable: 2 });
  expect({ events: await Array.fromAsync(up(asked, io)), lines, sleeps }).toEqual({
    events: [
      { type: "command-started", command: "up", dir: "/d" },
      ...step("start"),
      ...step("alive"),
      ...step("seed"),
      { type: "command-finished", command: "up", ok: true },
    ],
    lines: ["start", "seed"],
    sleeps: [2000, 2000],
  });
});

test("a target that never answers is not alive after 300 s, and is stopped", async () => {
  const { io, lines, sleeps } = fakeIo({}, { unreachable: 1000 });
  expect({
    events: await Array.fromAsync(up(asked, io)),
    lines,
    waited: sleeps.reduce((sum, s) => sum + s, 0),
  }).toEqual({
    events: [
      { type: "command-started", command: "up", dir: "/d" },
      ...step("start"),
      { type: "target-step", step: "alive", state: "started" },
      {
        type: "command-failed",
        message: "get http://h/alive did not answer 200 within 300 s",
      },
      ...step("stop"),
      { type: "command-finished", command: "up", ok: false },
    ],
    lines: ["start", "stop"],
    waited: 298_000,
  });
});

test("down stops", async () => {
  const { io, lines } = fakeIo({});
  expect({ events: await Array.fromAsync(down(asked, io)), lines }).toEqual({
    events: [
      { type: "command-started", command: "down", dir: "/d" },
      ...step("stop"),
      { type: "command-finished", command: "down", ok: true },
    ],
    lines: ["stop"],
  });
});

test("play resets and plays once on the target as it is", async () => {
  const { io, lines } = fakeIo({ "http://h/f/x": [{ status: 400, body: "e" }] });
  expect({
    events: await Array.fromAsync(
      play(
        {
          dir: "/d",
          extraction: extract({ "scenarios/f/a.yaml": scenarioFile("x") }),
          paths: ["f/a"],
        },
        io,
      ),
    ),
    lines,
  }).toEqual({
    events: [
      { type: "command-started", command: "play", dir: "/d" },
      ...step("reset"),
      {
        type: "scenario-played",
        path: "f/a",
        played: {
          scenario: "s",
          says: "s",
          proves: ["r"],
          assert: [],
          run: { target: "t", version: "v", at, clock: null },
          arrange: [],
          act: {
            call: { operation: "f", with: { a: "x" }, caller: "u" },
            response: { status: 400, body: "e" },
          },
          readings: [],
        },
      },
      { type: "command-finished", command: "play", ok: true },
    ],
    lines: ["reset"],
  });
});
