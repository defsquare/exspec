import { expect, test } from "bun:test";
import { status } from "../../src/cli/status.ts";
import type { Event } from "../../src/shapes/event.ts";

const files = [
  {
    path: "structures.yaml",
    text: "- {structure: S, identity: a, fields: {a: {type: string}}}",
  },
  { path: "facts.yaml", text: "- {fact: p, condition: [{caller: signed-in}]}" },
  { path: "notes.yaml", text: "a: 1" },
];

test("status of a directory with no extraction", async () => {
  expect(
    await Array.fromAsync(
      status({ dir: "/abs/dir", exists: async () => false, readFiles: async () => [] }),
    ),
  ).toEqual([
    { type: "command-started", command: "status", dir: "/abs/dir" },
    { type: "extraction-not-found", dir: "/abs/dir", expected: "/abs/dir/specimen" },
    { type: "command-finished", command: "status", ok: false },
  ]);
});

test("status of a directory with an extraction", async () => {
  expect(
    await Array.fromAsync(
      status({ dir: "/abs/dir", exists: async () => true, readFiles: async () => files }),
    ),
  ).toEqual<Event[]>([
    { type: "command-started", command: "status", dir: "/abs/dir" },
    {
      type: "extraction-counted",
      counts: {
        interfaces: 0,
        structures: 1,
        facts: 1,
        operations: 0,
        rules: 0,
        projections: 0,
        triggers: 0,
        scenarios: 0,
        references: 0,
      },
    },
    {
      type: "problem",
      file: "notes.yaml",
      at: "",
      message: "not a file of an extraction",
    },
    {
      type: "gap",
      kind: "structure-not-shown",
      name: "S",
      message: "no projection shows it",
    },
    { type: "command-finished", command: "status", ok: false },
  ]);
});
