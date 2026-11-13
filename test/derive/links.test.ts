import { expect, test } from "bun:test";
import { linksOf, type Named } from "../../src/derive/links.ts";
import { parseExtraction } from "../../src/shapes/extraction.ts";

test("every reference between two concepts is a link, each once", () => {
  const { extraction, problems } = parseExtraction([
    {
      path: "structures.yaml",
      text: `
- structure: A
  identity: id
  fields: { id: { type: string }, b: { structure: B } }
- structure: B
  identity: id
  fields: { id: { type: string } }
`,
    },
    {
      path: "facts.yaml",
      text: `
- fact: a-exists
  condition: [{ structure: A, where: { id: [call, id] }, must-be: [exists] }]
`,
    },
    {
      path: "operations/f.yaml",
      text: `
operation: f
takes: { id: { field: [A, id] } }
requires: [{ rule: r, fact: a-exists, otherwise: not-found }]
answers: A
effects:
  - { rule: e, when: [not, a-exists], then: { fact: { a-exists: true } } }
  - { rule: g, when: [given, id], then: nothing-changes }
`,
    },
    {
      path: "bindings.yaml",
      text: `
projections:
  - { projection: p, interface: get-a, shows: [{ structure: A, at: [a] }] }
triggers:
  - { trigger: t, interface: post-a, operation: f, answers: { status: 200 } }
`,
    },
    {
      path: "scenarios/f/accepted.yaml",
      text: `
scenario: s
says: s
proves: [e]
assert: [{ fact: a-exists }]
arrange: [{ call: { operation: f } }, { call: { operation: f } }]
act: { call: { operation: f } }
`,
    },
  ]);
  const operation: Named = { concept: "operation", name: "f" };
  const scenario: Named = { concept: "scenario", name: "f/accepted" };
  const a: Named = { concept: "structure", name: "A" };
  const fact: Named = { concept: "fact", name: "a-exists" };
  expect(problems).toEqual([]);
  expect(linksOf(extraction)).toEqual([
    { from: operation, to: a, as: "takes" },
    { from: operation, to: fact, as: "requires" },
    { from: operation, to: a, as: "answers" },
    { from: operation, to: fact, as: "when" },
    { from: operation, to: fact, as: "changes" },
    { from: fact, to: a, as: "reads" },
    { from: a, to: { concept: "structure", name: "B" }, as: "refers to" },
    {
      from: { concept: "projection", name: "p" },
      to: { concept: "interface", name: "get-a" },
      as: "reads through",
    },
    { from: { concept: "projection", name: "p" }, to: a, as: "shows" },
    {
      from: { concept: "trigger", name: "t" },
      to: { concept: "interface", name: "post-a" },
      as: "calls",
    },
    { from: { concept: "trigger", name: "t" }, to: operation, as: "triggers" },
    { from: scenario, to: operation, as: "acts" },
    { from: scenario, to: operation, as: "arranges" },
    { from: scenario, to: fact, as: "looks at" },
  ]);
});
