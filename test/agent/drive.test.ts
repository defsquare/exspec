import { expect, test } from "bun:test";
import { allowed } from "../../src/agent/drive.ts";

test("a tool call is held to the session's reads and writes, whatever folder it is in", () => {
  const session = {
    mayRead: (path: string, pattern?: string) => path === "a" && pattern !== "**",
    mayWrite: (path: string) => path === "w",
  };
  expect(
    [
      { name: "Read", input: { file_path: "a" } },
      { name: "Read", input: { file_path: "b" } },
      { name: "Read", input: {} },
      { name: "Glob", input: { path: "a", pattern: "*" } },
      { name: "Glob", input: { path: "a", pattern: "**" } },
      { name: "Glob", input: { pattern: "*" } },
      { name: "Grep", input: { path: "a", pattern: "x", glob: "**" } },
      { name: "Write", input: { file_path: "w" } },
      { name: "Edit", input: { file_path: "a" } },
      { name: "play", input: { steps: [] } },
      { name: "Read", input: "a" },
    ].map(({ name, input }) => allowed(name, input, session)),
  ).toEqual([true, false, false, true, false, false, false, true, false, true, false]);
});
