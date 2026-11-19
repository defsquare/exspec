import { expect, test } from "bun:test";
import { structuresReads } from "../../src/agent/roles-read.ts";

test("the reader of the structures reads the code and its own file, not the interfaces", () => {
  expect(
    [
      "exspec/interfaces.yaml",
      "exspec/structures.yaml",
      "exspec/roles/common.yaml",
      "src/a.ts",
    ].filter((path) => structuresReads("/d")(path)),
  ).toEqual(["exspec/structures.yaml", "src/a.ts"]);
});
