import { expect, test } from "bun:test";
import { instructionsFor } from "../../src/agent/instructions.ts";
import { parseExtraction } from "../../src/shapes/extraction.ts";

const { system, phases } = instructionsFor("specimen");

const examples = [
  ...system.matchAll(/^### `([^`]+)`\n[\s\S]*?^```yaml\n([\s\S]*?)^```$/gm),
].map(([, file = "", text = ""]) => ({
  path: file.replace("<operation>", "rename-item").replace("<slug>", "a"),
  text,
}));

test("every example of a file in the instructions parses as that file", () => {
  expect({
    paths: examples.map(({ path }) => path),
    problems: parseExtraction(examples).problems,
  }).toEqual({
    paths: [
      "target.yaml",
      "interfaces.yaml",
      "structures.yaml",
      "facts.yaml",
      "operations/rename-item.yaml",
      "bindings.yaml",
      "scenarios/rename-item/a.yaml",
    ],
    problems: [],
  });
});

test("the command line replaces every placeholder", () => {
  expect(
    [system, ...Object.values(phases)].filter((text) => text.includes("{{")),
  ).toEqual([]);
});
