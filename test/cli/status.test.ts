import { expect, test } from "bun:test";
import { status } from "../../src/cli/status.ts";
import type { Event } from "../../src/shapes/event.ts";

async function collect(events: AsyncIterable<Event>): Promise<Event[]> {
  const out: Event[] = [];
  for await (const e of events) out.push(e);
  return out;
}

test("status of a directory with no extraction", async () => {
  expect(await collect(status({ dir: "/abs/dir", exists: async () => false }))).toEqual([
    { type: "command-started", command: "status", dir: "/abs/dir" },
    { type: "extraction-not-found", dir: "/abs/dir", expected: "/abs/dir/specimen" },
    { type: "command-finished", command: "status", ok: false },
  ]);
});

test("status of a directory with an extraction", async () => {
  expect(await collect(status({ dir: "/abs/dir", exists: async () => true }))).toEqual([
    { type: "command-started", command: "status", dir: "/abs/dir" },
    { type: "command-finished", command: "status", ok: true },
  ]);
});
