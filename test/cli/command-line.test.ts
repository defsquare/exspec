import { expect, test } from "bun:test";
import { askedOf } from "../../src/cli/command-line.ts";

test("a command is read by its family, and the target's commands by two words", () => {
  expect(
    [
      ["check", "d"],
      ["target", "up", "d"],
      ["target", "play", "d", "f/a"],
      ["record", "d", "f/a"],
      ["up", "d"],
      ["target", "record", "d"],
      ["target", "replay", "d"],
      ["target"],
      [],
    ].map((positionals) => askedOf(positionals, false)),
  ).toEqual([
    { type: "command", command: "check", rest: ["d"] },
    { type: "command", command: "up", rest: ["d"] },
    { type: "command", command: "play", rest: ["d", "f/a"] },
    { type: "command", command: "record", rest: ["d", "f/a"] },
    { type: "unknown" },
    { type: "unknown" },
    { type: "unknown" },
    { type: "unknown" },
    { type: "unknown" },
  ]);
});

test("the agent is refused what decides or judges a reference, and itself", () => {
  expect(
    ["status", "check", "verdicts", "record", "replay", "extract", "view"].map(
      (command) => askedOf([command, "d"], true),
    ),
  ).toEqual([
    { type: "command", command: "status", rest: ["d"] },
    { type: "command", command: "check", rest: ["d"] },
    { type: "command", command: "verdicts", rest: ["d"] },
    { type: "refused-to-agent", command: "record" },
    { type: "refused-to-agent", command: "replay" },
    { type: "refused-to-agent", command: "extract" },
    { type: "refused-to-agent", command: "view" },
  ]);
  expect(askedOf(["target", "play", "d"], true)).toEqual({
    type: "command",
    command: "play",
    rest: ["d"],
  });
});

test("the roles are two words, each refused to the agent", () => {
  expect([
    askedOf(["roles", "read", "d"], false),
    askedOf(["roles", "play", "d", "f/a"], false),
    askedOf(["roles", "build", "d"], true),
    askedOf(["roles", "page", "d"], false),
    askedOf(["roles", "record", "d"], false),
    askedOf(["roles", "replay", "d"], false),
    askedOf(["roles", "record", "d"], true),
    askedOf(["roles", "replay", "d"], true),
    askedOf(["roles"], false),
  ]).toEqual([
    { type: "command", command: "roles-read", rest: ["d"] },
    { type: "command", command: "roles-play", rest: ["d", "f/a"] },
    { type: "refused-to-agent", command: "roles-build" },
    { type: "unknown" },
    { type: "command", command: "roles-record", rest: ["d"] },
    { type: "command", command: "roles-replay", rest: ["d"] },
    { type: "refused-to-agent", command: "roles-record" },
    { type: "refused-to-agent", command: "roles-replay" },
    { type: "unknown" },
  ]);
});

test("the providers' roles are two words, each refused to the agent", () => {
  expect([
    askedOf(["providers", "read", "d"], false),
    askedOf(["providers", "write-twin", "d"], false),
    askedOf(["providers", "read", "d"], true),
    askedOf(["providers", "write-twin", "d"], true),
    askedOf(["providers", "build", "d"], false),
  ]).toEqual([
    { type: "command", command: "providers-read", rest: ["d"] },
    { type: "command", command: "providers-write-twin", rest: ["d"] },
    { type: "refused-to-agent", command: "providers-read" },
    { type: "refused-to-agent", command: "providers-write-twin" },
    { type: "unknown" },
  ]);
});

test("a state is renamed in two words, refused to the agent", () => {
  expect([
    askedOf(["states", "rename", "d", "s", "t"], false),
    askedOf(["states", "rename", "d", "s", "t"], true),
    askedOf(["states", "drop", "d", "s"], false),
  ]).toEqual([
    { type: "command", command: "states-rename", rest: ["d", "s", "t"] },
    { type: "refused-to-agent", command: "states-rename" },
    { type: "unknown" },
  ]);
});
