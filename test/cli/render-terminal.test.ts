import { expect, test } from "bun:test";
import { describeEvent } from "../../src/cli/render-terminal.tsx";
import type { Event } from "../../src/shapes/event.ts";

test("describeEvent words each event", () => {
  const events: readonly Event[] = [
    { type: "command-started", command: "status", dir: "/abs/dir" },
    { type: "extraction-not-found", dir: "/abs/dir", expected: "/abs/dir/specimen" },
    { type: "command-finished", command: "status", ok: false },
  ];
  expect(events.map(describeEvent)).toEqual([
    "status /abs/dir",
    "no extraction in /abs/dir: /abs/dir/specimen is missing",
    "status failed",
  ]);
});
