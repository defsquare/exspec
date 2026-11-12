import { expect, test } from "bun:test";
import { renderJson } from "../../src/cli/render-json.ts";
import type { Event } from "../../src/shapes/event.ts";

const events: readonly Event[] = [
  { type: "command-started", command: "check", dir: "/abs/dir" },
  { type: "problem", file: "f.yaml", at: "a.0", message: "m" },
  { type: "gap", kind: "fact-without-condition", name: "p", message: "m" },
  { type: "command-finished", command: "check", ok: false },
];

test("one JSON object per line, and the last event returned", async () => {
  const lines: string[] = [];
  const last = await renderJson(
    (async function* () {
      yield* events;
    })(),
    (line) => lines.push(line),
  );
  expect({ lines, last }).toEqual({
    lines: [
      '{"type":"command-started","command":"check","dir":"/abs/dir"}',
      '{"type":"problem","file":"f.yaml","at":"a.0","message":"m"}',
      '{"type":"gap","kind":"fact-without-condition","name":"p","message":"m"}',
      '{"type":"command-finished","command":"check","ok":false}',
    ],
    last: { type: "command-finished", command: "check", ok: false },
  });
});
