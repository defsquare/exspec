import { expect, test } from "bun:test";
import { renderJson } from "../../src/cli/render-json.ts";
import type { Event } from "../../src/shapes/event.ts";

const events: readonly Event[] = [
  { type: "command-started", command: "status", dir: "/abs/dir" },
  { type: "extraction-not-found", dir: "/abs/dir", expected: "/abs/dir/specimen" },
  { type: "command-finished", command: "status", ok: false },
];

test("one JSON object per line", async () => {
  const lines: string[] = [];
  await renderJson(
    (async function* () {
      yield* events;
    })(),
    (line) => lines.push(line),
  );
  expect(lines).toEqual([
    '{"type":"command-started","command":"status","dir":"/abs/dir"}',
    '{"type":"extraction-not-found","dir":"/abs/dir","expected":"/abs/dir/specimen"}',
    '{"type":"command-finished","command":"status","ok":false}',
  ]);
});
