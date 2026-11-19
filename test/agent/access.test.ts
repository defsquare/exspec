import { expect, test } from "bun:test";
import { readsOf, under, writesOf } from "../../src/agent/access.ts";

test("a role reads the checkout, and of exspec/ only what it is allowed", () => {
  const reads = readsOf("/d", {
    checkout: true,
    allowed: (path) => path === "a.yaml" || under("f")(path),
  });
  expect(
    [
      ["src/x.ts"],
      ["/d/exspec/a.yaml"],
      ["exspec/f/s/b.yaml"],
      ["exspec/b.yaml"],
      ["../x"],
      ["src", "**/*.ts"],
      ["exspec/f", "*.yaml"],
      [".", "**/*.ts"],
      ["exspec", "*.yaml"],
      ["src", "../exspec/*"],
    ].map(([path = "", pattern]) => reads(path, pattern)),
  ).toEqual([true, true, true, false, false, true, true, false, false, false]);
});

test("a role without the checkout reads nothing outside exspec/", () => {
  const reads = readsOf("/d", { checkout: false, allowed: (path) => path === "a.yaml" });
  expect(["src/x.ts", "exspec/a.yaml"].map((path) => reads(path))).toEqual([false, true]);
});

test("a role writes only what it is allowed under exspec/", () => {
  const writes = writesOf("/d", (path) => path === "a.yaml");
  expect(
    ["exspec/a.yaml", "/d/exspec/a.yaml", "exspec/b.yaml", "a.yaml", "exspec"].map(
      writes,
    ),
  ).toEqual([true, true, false, false, false]);
});
