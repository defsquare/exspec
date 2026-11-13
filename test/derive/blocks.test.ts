import { expect, test } from "bun:test";
import { factBlocks } from "../../src/derive/blocks.ts";
import { parseExtraction } from "../../src/shapes/extraction.ts";
import { bindings, interfaces, target } from "../files.ts";

const reference = (proves: string, readings: string) => `
scenario: s
says: s
proves: [${proves}]
run: {target: t, version: v, at: "2026-11-13T10:00:00.000Z", clock: null}
arrange: []
act:
  call: {operation: f, with: {a: x}}
  response: {status: 404, body: null}
readings: ${readings}
noise: []
`;

const unread = (fact: string) =>
  `[{of: {fact: ${fact}}, as: null, before: [{unreadable: "no projection locates S by a"}], after: []}]`;

test("each fact unknown before the call, with the rules it blocks, most first", () => {
  expect(
    factBlocks(
      parseExtraction(
        Object.entries({
          "target.yaml": target,
          "interfaces.yaml": interfaces,
          "structures.yaml": "- {structure: S, identity: a, fields: {a: {type: string}}}",
          "facts.yaml": `
- {fact: p, condition: []}
- {fact: w, condition: [{caller: signed-in}]}
- {fact: o, condition: [{structure: S, where: {a: [call, a]}, must-be: [exists]}]}
`,
          "operations/f.yaml": `
operation: f
takes: {a: {type: string}}
requires:
  - {rule: q, fact: p, otherwise: missing}
  - {rule: s, fact: w, otherwise: missing}
  - {rule: t, fact: o, otherwise: missing}
answers: null
`,
          "bindings.yaml": bindings,
          "references/f/a.yaml": reference("q", "[]"),
          "references/f/b.yaml": reference("s", unread("o")),
          "references/f/c.yaml": reference("t", unread("o")),
        }).map(([path, text]) => ({ path, text })),
      ).extraction,
    ),
  ).toEqual([
    {
      type: "fact-blocks",
      fact: "o",
      why: "no projection locates S by a",
      rules: ["f/s", "f/t"],
    },
    { type: "fact-blocks", fact: "p", why: "it has no condition", rules: ["f/q", "f/s"] },
  ]);
});
