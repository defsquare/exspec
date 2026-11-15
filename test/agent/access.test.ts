import { expect, test } from "bun:test";
import { readsOf, under, writesOf } from "../../src/agent/access.ts";

test("a role reads the checkout, and of specimen/ only what it is allowed", () => {
  const reads = readsOf("/d", {
    checkout: true,
    allowed: (path) => path === "a.yaml" || under("f")(path),
  });
  expect(
    [
      ["src/x.ts"],
      ["/d/specimen/a.yaml"],
      ["specimen/f/s/b.yaml"],
      ["specimen/b.yaml"],
      ["../x"],
      ["src", "**/*.ts"],
      ["specimen/f", "*.yaml"],
      [".", "**/*.ts"],
      ["specimen", "*.yaml"],
      ["src", "../specimen/*"],
    ].map(([path = "", pattern]) => reads(path, pattern)),
  ).toEqual([true, true, true, false, false, true, true, false, false, false]);
});

test("a role without the checkout reads nothing outside specimen/", () => {
  const reads = readsOf("/d", { checkout: false, allowed: (path) => path === "a.yaml" });
  expect(["src/x.ts", "specimen/a.yaml"].map((path) => reads(path))).toEqual([
    false,
    true,
  ]);
});

test("a role writes only what it is allowed under specimen/", () => {
  const writes = writesOf("/d", (path) => path === "a.yaml");
  expect(
    [
      "specimen/a.yaml",
      "/d/specimen/a.yaml",
      "specimen/b.yaml",
      "a.yaml",
      "specimen",
    ].map(writes),
  ).toEqual([true, true, false, false, false]);
});
