import { expect, test } from "bun:test";
import { z } from "zod";
import { instructionsFor, roleInstructions } from "../../src/agent/instructions.ts";
import { parseExtraction } from "../../src/shapes/extraction.ts";
import {
  commonSchema,
  hintsSchema,
  judgedSchema,
  readYaml,
  roleScenarioSchema,
  rulesSchema,
} from "../../src/shapes/roles.ts";
import { structureSchema } from "../../src/shapes/specification.ts";

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

test("every example of a file in a role's instructions parses as that file", () => {
  const blocks = (text: string, language: string) =>
    [...text.matchAll(new RegExp(`^\`\`\`${language}\\n([\\s\\S]*?)^\`\`\`$`, "gm"))].map(
      ([, block = ""]) => block,
    );
  const [rules = "", hints = ""] = blocks(roleInstructions.reader, "yaml");
  const read = (file: string, text: string, schema: Parameters<typeof readYaml>[2]) => {
    const parsed = readYaml(file, text, schema);
    return "value" in parsed ? [] : parsed.findings;
  };
  expect([
    ...blocks(roleInstructions["structures-reader"], "yaml").map((text) =>
      read("structures.yaml", text, z.array(structureSchema)),
    ),
    ...blocks(roleInstructions["common-reader"], "yaml").map((text) =>
      read("common.yaml", text, commonSchema),
    ),
    read("rules.yaml", rules, rulesSchema),
    read("hints.yaml", hints, hintsSchema),
    ...blocks(roleInstructions.builder, "yaml").map((text) =>
      read("scenario.yaml", text, roleScenarioSchema),
    ),
    ...blocks(roleInstructions.judge, "json").map((text) =>
      read("answer.json", text, z.array(judgedSchema)),
    ),
  ]).toEqual([[], [], [], [], [], []]);
});
