import { expect, test } from "bun:test";
import { viewOfRoles } from "../../src/derive/roles-view.ts";
import { rulesSchema } from "../../src/shapes/roles.ts";

const rules = rulesSchema.parse(
  Bun.YAML.parse(`
operation: f
takes: {a: {says: s}}
requires:
  - {rule: r-on, on: a, fact: f1, otherwise: {refusal: bad, status: 400, body: b}, source: "F.java:1"}
  - {rule: r-off, fact: f2, otherwise: {refusal: gone, status: 404, body: b}, source: "F.java:2"}
answers: {says: ok, structure: null}
`),
);

test("a requirement on an input says it in its line, one that is not does not", () => {
  const view = viewOfRoles({
    target: undefined,
    structures: [],
    common: undefined,
    findings: [],
    interfaces: [
      {
        bound: {
          interface: "f",
          method: "get",
          pattern: "/a",
          request: {},
          responses: {},
        },
        rules,
        findings: [],
        scenarios: [],
        evidence: [],
        judgements: [],
      },
    ],
  });
  expect(view.extraction.operations[0]?.operation.lines.slice(0, 2)).toEqual([
    {
      kind: "requires",
      rule: "r-on",
      shared: false,
      input: "a",
      fact: "f1",
      otherwise: "bad",
      status: 400,
      body: "b",
      short: "f1",
      source: "F.java:1",
      doubts: [],
    },
    {
      kind: "requires",
      rule: "r-off",
      shared: false,
      fact: "f2",
      otherwise: "gone",
      status: 404,
      body: "b",
      short: "f2",
      source: "F.java:2",
      doubts: [],
    },
  ]);
});
