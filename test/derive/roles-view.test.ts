import { expect, test } from "bun:test";
import { actorsOf, viewOfRoles } from "../../src/derive/roles-view.ts";
import { evidenceSchema, rulesSchema } from "../../src/shapes/roles.ts";

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

test("a rule names the service it rests on, a step played keeps what the target sent to its providers", () => {
  const view = viewOfRoles({
    target: undefined,
    structures: [],
    common: undefined,
    findings: [],
    interfaces: [
      {
        bound: {
          interface: "f",
          method: "post",
          pattern: "/a",
          request: {},
          responses: {},
        },
        rules: rulesSchema.parse(
          Bun.YAML.parse(`
operation: f
effects:
  - {rule: e, says: s1, service: s, source: "F.java:3"}
answers: {says: ok, structure: null}
`),
        ),
        findings: [],
        scenarios: [],
        evidence: [
          {
            slug: "e",
            evidence: evidenceSchema.parse(
              Bun.YAML.parse(`
rule: e
run: {target: t, version: v, at: "2026-11-13T10:00:00.000Z", clock: null}
exchanges:
  - {when: arrange, service: s, is: c, with: {a: x}}
  - when: call
    as: u
    request: {method: post, path: /a}
    response: {status: 200, body: null}
    side-effects:
      - {observable: p, request: {method: post, path: /b, body: {to: x}}, response: {status: 403, body: {e: no}}}
`),
            ),
          },
        ],
        judgements: [],
      },
    ],
  });
  expect({
    line: view.extraction.operations[0]?.operation.lines[0],
    steps: view.extraction.scenarios[0]?.steps,
  }).toEqual({
    line: {
      kind: "effect",
      rule: "e",
      shared: false,
      service: "s",
      says: "s1",
      short: "s1",
      source: "F.java:3",
      doubts: [],
    },
    steps: [
      { when: "arrange", as: null, service: "s", is: "c", body: { a: "x" } },
      {
        when: "call",
        as: "u",
        method: "post",
        path: "/a",
        status: 200,
        answer: null,
        sideEffects: [
          {
            observable: "p",
            request: { method: "post", path: "/b", body: { to: "x" } },
            response: { status: 403, body: { e: "no" } },
          },
        ],
      },
    ],
  });
});

test("the actors are the names the scenarios' steps call as, each once, a step called as nobody left out", () => {
  expect(
    actorsOf([
      { steps: [{ as: "b" }, { as: null }, { as: "a" }] },
      { steps: [{ as: null }, { as: "b" }] },
    ]),
  ).toEqual(["a", "b"]);
});
