import { expect, test } from "bun:test";
import { allowed, globSearch } from "../../src/agent/drive.ts";

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

test("the folders a glob names before its first wildcard are the folder it runs in", () => {
  expect(
    [
      { path: ".", pattern: "a/b/**/*.ts" },
      { path: "a", pattern: "*.ts" },
      { path: ".", pattern: "a/b.ts" },
      { path: ".", pattern: "a/../c/*" },
      { path: ".", pattern: "/a/*" },
    ].map(({ path, pattern }) => globSearch(path, pattern)),
  ).toEqual([
    { path: "a/b", pattern: "**/*.ts" },
    { path: "a", pattern: "*.ts" },
    { path: "a", pattern: "b.ts" },
    { path: "c", pattern: "*" },
    { path: ".", pattern: "/a/*" },
  ]);
});

test("a glob from the root that names a folder is a search of that folder", () => {
  const session = {
    mayRead: (path: string) => path === "a/b",
    mayWrite: () => false,
  };
  expect(
    [{ pattern: "a/b/**/*.ts" }, { pattern: "**/*.ts" }, { pattern: "c/*.ts" }].map(
      (input) => allowed("Glob", input, session),
    ),
  ).toEqual([true, false, false]);
});
