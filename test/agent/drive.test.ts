import { expect, test } from "bun:test";
import { allowed, mayWrite } from "../../src/agent/drive.ts";

test("the agent writes under specimen/ only, never under its references", () => {
  expect(
    [
      "specimen/target.yaml",
      "/d/specimen/scenarios/f/a.yaml",
      "specimen/target/seed.sh",
      "specimen/references-notes.yaml",
      "specimen",
      "specimen/references/f/a.yaml",
      "specimen/References/f/a.yaml",
      "/d/specimen/references",
      "specimen/../src/a.ts",
      "src/a.ts",
      "/elsewhere/specimen/a.yaml",
      "/d/specimen-b/a.yaml",
    ].map((path) => ({ path, may: mayWrite("/d", path) })),
  ).toEqual([
    { path: "specimen/target.yaml", may: true },
    { path: "/d/specimen/scenarios/f/a.yaml", may: true },
    { path: "specimen/target/seed.sh", may: true },
    { path: "specimen/references-notes.yaml", may: true },
    { path: "specimen", may: false },
    { path: "specimen/references/f/a.yaml", may: false },
    { path: "specimen/References/f/a.yaml", may: false },
    { path: "/d/specimen/references", may: false },
    { path: "specimen/../src/a.ts", may: false },
    { path: "src/a.ts", may: false },
    { path: "/elsewhere/specimen/a.yaml", may: false },
    { path: "/d/specimen-b/a.yaml", may: false },
  ]);
});

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
