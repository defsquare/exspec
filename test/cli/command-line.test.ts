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
  ]);
});

test("the agent is refused what decides or judges a reference, and itself", () => {
  expect(
    ["status", "check", "verdicts", "record", "replay", "extract"].map((command) =>
      askedOf([command, "d"], true),
    ),
  ).toEqual([
    { type: "command", command: "status", rest: ["d"] },
    { type: "command", command: "check", rest: ["d"] },
    { type: "command", command: "verdicts", rest: ["d"] },
    { type: "refused-to-agent", command: "record" },
    { type: "refused-to-agent", command: "replay" },
    { type: "refused-to-agent", command: "extract" },
  ]);
  expect(askedOf(["target", "play", "d"], true)).toEqual({
    type: "command",
    command: "play",
    rest: ["d"],
  });
});
