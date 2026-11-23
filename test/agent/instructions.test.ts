import { expect, test } from "bun:test";
import { z } from "zod";
import { instructionsFor, roleInstructions } from "../../src/agent/instructions.ts";
import { checkProvider } from "../../src/derive/check-provider.ts";
import { commonTriggerSchema, triggerSchema } from "../../src/shapes/bindings.ts";
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

const { system, sessions } = instructionsFor("exspec");

const examples = [
  ...system.matchAll(/^### `([^`]+)`\n[\s\S]*?^```yaml\n([\s\S]*?)^```$/gm),
].map(([, file = "", text = ""]) => ({
  path: file,
  text,
}));

test("every example of a file in the instructions parses as that file", () => {
  expect({
    paths: examples.map(({ path }) => path),
    problems: parseExtraction(examples).problems,
  }).toEqual({
    paths: ["target.yaml", "interfaces.yaml"],
    problems: [],
  });
});

test("the command line replaces every placeholder", () => {
  expect(
    [system, ...Object.values(sessions)].filter((text) => text.includes("{{")),
  ).toEqual([]);
});

test("every example of a file in a role's instructions parses as that file", () => {
  const blocks = (text: string, language: string) =>
    [...text.matchAll(new RegExp(`^\`\`\`${language}\\n([\\s\\S]*?)^\`\`\`$`, "gm"))].map(
      ([, block = ""]) => block,
    );
  const [rules = "", trigger = "", hints = ""] = blocks(roleInstructions.reader, "yaml");
  const [common = "", commonTrigger = ""] = blocks(
    roleInstructions["common-reader"],
    "yaml",
  );
  const read = (file: string, text: string, schema: Parameters<typeof readYaml>[2]) => {
    const parsed = readYaml(file, text, schema);
    return "value" in parsed ? [] : parsed.findings;
  };
  expect([
    ...blocks(roleInstructions["structures-reader"], "yaml").map((text) =>
      read("structures.yaml", text, z.array(structureSchema)),
    ),
    read("common.yaml", common, commonSchema),
    read("common-trigger.yaml", commonTrigger, commonTriggerSchema),
    read("rules.yaml", rules, rulesSchema),
    read("trigger.yaml", trigger, triggerSchema),
    read("hints.yaml", hints, hintsSchema),
    ...blocks(roleInstructions.builder, "yaml").map((text) =>
      read("scenario.yaml", text, roleScenarioSchema),
    ),
    ...blocks(roleInstructions.judge, "json").map((text) =>
      read("answer.json", text, z.array(judgedSchema)),
    ),
  ]).toEqual([[], [], [], [], [], [], [], []]);
});

test("the builder's example scenario calls operations by their inputs, a hole reading a field of what a call answered", () => {
  const [example = ""] = [
    ...roleInstructions.builder.matchAll(/^```yaml\n([\s\S]*?)^```$/gm),
  ].map(([, block = ""]) => block);
  const read = readYaml("scenario.yaml", example, roleScenarioSchema);
  expect("value" in read ? read.value.steps : read.findings).toEqual([
    {
      when: "arrange",
      as: "ann",
      name: "made",
      call: { operation: "add-item", with: { name: "a" } },
    },
    {
      when: "before",
      as: "ann",
      call: { operation: "get-item", with: { id: "{{made.id}}" } },
    },
    {
      when: "call",
      as: "bob",
      call: { operation: "rename-item", with: { id: "{{made.id}}", name: "b" } },
    },
    {
      when: "after",
      as: "ann",
      call: { operation: "get-item", with: { id: "{{made.id}}" } },
    },
  ]);
});

test("the provider reader's examples are a service and a provider's two files, which pass their check", () => {
  const [service = "", interfaces = "", provider = ""] = [
    ...roleInstructions["provider-reader"].matchAll(/^```yaml\n([\s\S]*?)^```$/gm),
  ].map(([, block = ""]) => block);
  expect(
    checkProvider(
      [
        { path: "services/documents.yaml", text: service },
        { path: "providers/p/interfaces.yaml", text: interfaces },
        { path: "providers/p/provider.yaml", text: provider },
      ],
      "p",
    ),
  ).toEqual({ renders: "documents", findings: [] });
});
