import { expect, test } from "bun:test";
import { check } from "../../src/cli/check.ts";
import type { Event } from "../../src/shapes/event.ts";

test("check of an extraction with gaps only", async () => {
  expect(
    await Array.fromAsync(
      check({
        dir: "/abs/dir",
        exists: async () => true,
        readFiles: async () => [
          { path: "facts.yaml", text: "- {fact: p, condition: []}" },
        ],
      }),
    ),
  ).toEqual<Event[]>([
    { type: "command-started", command: "check", dir: "/abs/dir" },
    {
      type: "gap",
      kind: "fact-without-condition",
      name: "p",
      message: "its condition is not written",
    },
    { type: "command-finished", command: "check", ok: true },
  ]);
});

test("check of an extraction with a problem", async () => {
  expect(
    await Array.fromAsync(
      check({
        dir: "/abs/dir",
        exists: async () => true,
        readFiles: async () => [{ path: "facts.yaml", text: "a: [" }],
      }),
    ),
  ).toEqual<Event[]>([
    { type: "command-started", command: "check", dir: "/abs/dir" },
    {
      type: "problem",
      file: "facts.yaml",
      at: "",
      message: "YAML Parse error: Unexpected token",
    },
    { type: "command-finished", command: "check", ok: false },
  ]);
});

test("check of a directory with no extraction", async () => {
  expect(
    await Array.fromAsync(
      check({ dir: "/abs/dir", exists: async () => false, readFiles: async () => [] }),
    ),
  ).toEqual<Event[]>([
    { type: "command-started", command: "check", dir: "/abs/dir" },
    { type: "extraction-not-found", dir: "/abs/dir", expected: "/abs/dir/exspec" },
    { type: "command-finished", command: "check", ok: false },
  ]);
});
