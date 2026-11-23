import { expect, test } from "bun:test";
import { builderPrompt } from "../../src/agent/roles-build.ts";

test("the builder is told each service that passes its check by its file, and nothing of the providers", () => {
  expect(
    builderPrompt({
      bound: {
        interface: "a",
        method: "post",
        pattern: "/a",
        request: {},
        responses: { "200": { body: "any" } },
      },
      actors: ["u", "v"],
      files: [
        {
          path: "services/s.yaml",
          text: "{service: s, says: keeps documents, conditions: []}",
        },
        { path: "services/t.yaml", text: "service: [" },
        { path: "providers/p/provider.yaml", text: "" },
      ],
    }),
  ).toEqual(
    [
      "The actors: u, v; null for a call by nobody.",
      "A service: s — keeps documents. Its conditions: exspec/services/s.yaml.",
      "The operation: a, POST /a.",
      "Your folder: exspec/operations/a/ — rules.yaml, hints.yaml and trigger.yaml are there; write each scenario as scenarios/<slug>.yaml there.",
    ].join("\n"),
  );
});

test("the builder is told each operation a step may call, by its inputs, and what it answers", () => {
  expect(
    builderPrompt({
      bound: {
        interface: "a",
        method: "post",
        pattern: "/a",
        request: {},
        responses: { "200": { body: "any" } },
      },
      actors: ["u"],
      files: [
        {
          path: "interfaces.yaml",
          text: `interfaces:
  - {interface: a, method: post, pattern: /a, request: {body: {n: int}}, responses: {"200": {body: [schema, S]}}}`,
        },
        {
          path: "structures.yaml",
          text: "[{structure: S, identity: id, fields: {id: {type: string}}}]",
        },
        {
          path: "operations/a/rules.yaml",
          text: "{operation: a, takes: {n: {says: a number}}, answers: {says: the s, structure: S}}",
        },
        {
          path: "operations/a/trigger.yaml",
          text: "{trigger: a, interface: a, operation: a, answers: {status: 200}}",
        },
      ],
    }),
  ).toEqual(
    [
      "The actors: u; null for a call by nobody.",
      "The operations a step may call, by their inputs, and what each answers:",
      "- a: takes n (a number). Answers S: id.",
      "The operation: a, POST /a.",
      "Your folder: exspec/operations/a/ — rules.yaml, hints.yaml and trigger.yaml are there; write each scenario as scenarios/<slug>.yaml there.",
    ].join("\n"),
  );
});
