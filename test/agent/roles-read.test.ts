import { expect, test } from "bun:test";
import { structuresReads } from "../../src/agent/roles-read.ts";

test("the reader of the structures reads the code and its own file, not the interfaces", () => {
  expect(
    [
      "specimen/interfaces.yaml",
      "specimen/structures.yaml",
      "specimen/roles/common.yaml",
      "src/a.ts",
    ].filter((path) => structuresReads("/d")(path)),
  ).toEqual(["specimen/structures.yaml", "src/a.ts"]);
});
