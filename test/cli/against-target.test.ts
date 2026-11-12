import { expect, test } from "bun:test";
import { againstTarget } from "../../src/cli/against-target.ts";
import type { Event } from "../../src/shapes/event.ts";

test("a command against the target does not start from an extraction with a problem", async () => {
  expect(
    await Array.fromAsync(
      againstTarget(
        "play",
        {
          dir: "/abs/dir",
          exists: async () => true,
          readFiles: async () => [{ path: "notes.yaml", text: "a: 1" }],
        },
        async function* () {
          yield { type: "command-failed", message: "started" };
        },
      ),
    ),
  ).toEqual<Event[]>([
    { type: "command-started", command: "play", dir: "/abs/dir" },
    {
      type: "problem",
      file: "notes.yaml",
      at: "",
      message: "not a file of an extraction",
    },
    { type: "command-finished", command: "play", ok: false },
  ]);
});
