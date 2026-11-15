import { expect, test } from "bun:test";
import { dataOf } from "../../src/cli/view.ts";
import { judgeTask } from "../../src/derive/judge-task.ts";
import { parseExtraction } from "../../src/shapes/extraction.ts";
import { commonSchema, evidenceSchema, rulesSchema } from "../../src/shapes/roles.ts";
import { target } from "../files.ts";

const interfaces = `
interfaces:
  - {interface: f, method: delete, pattern: "/a/{id}", responses: {204: {body: null}}}
  - {interface: g, method: get, pattern: "/a", responses: {200: {body: any}}}
`;

const structures = `
- structure: A
  identity: id
  fields: {id: {type: int}, name: {type: string}}
`;

const common = `
target: t
rules:
  - {rule: signed-in, applies-to: every operation, fact: the caller is signed in, otherwise: {refusal: unauthenticated, status: 401, body: empty}, source: "S.java:1"}
`;

const rules = `
operation: f
takes: {id: {says: the a to remove, field: [A, id]}}
common: [signed-in]
requires:
  - {rule: exists, fact: the a exists, otherwise: {refusal: not-found, status: 404, body: empty}, source: "F.java:2"}
answers: {says: 204 with no body, structure: null}
unsure:
  - {rule: exists, what: a negative id is not checked}
`;

const hints = `
- {rule: exists, situation: an id no a has, how: call with 9, seen-in: none, reachable: yes}
`;

const scenario = `
rule: exists
situation: an id no a has
reached: yes
steps:
  - {when: call, as: u, request: {method: delete, path: /a/9}}
`;

const evidence = `
rule: exists
run: {target: t, version: v, at: "2026-11-13T10:00:00.000Z", clock: null}
exchanges:
  - {when: call, as: u, request: {method: delete, path: /a/9}, response: {status: 404, body: null}}
`;

const { extraction } = parseExtraction([
  { path: "target.yaml", text: target },
  { path: "interfaces.yaml", text: interfaces },
]);
const [bound] = extraction.interfaces;
const of =
  bound === undefined
    ? undefined
    : judgeTask({
        bound,
        common: commonSchema.parse(Bun.YAML.parse(common)),
        rules: rulesSchema.parse(Bun.YAML.parse(rules)),
        recordings: [
          { slug: "exists", evidence: evidenceSchema.parse(Bun.YAML.parse(evidence)) },
        ],
      }).of.get("exists");

const judgements = `
model: m
at: "2026-11-13T11:00:00.000Z"
judgements:
  - {scenario: exists, rule: exists, situation: "yes", verdict: holds, confidence: 0.9, evidence: the call answered 404, of: "${of}"}
`;

test("view draws the roles' reading, judged by the judge's word, when there is one", () => {
  expect(
    dataOf("/d/t", [
      { path: "target.yaml", text: target },
      { path: "interfaces.yaml", text: interfaces },
      { path: "structures.yaml", text: structures },
      { path: "roles/common.yaml", text: common },
      { path: "roles/f/rules.yaml", text: rules },
      { path: "roles/f/hints.yaml", text: hints },
      { path: "roles/f/scenarios/exists.yaml", text: scenario },
      { path: "roles/f/evidence/exists.yaml", text: evidence },
      { path: "roles/f/judgements.yaml", text: judgements },
    ]),
  ).toEqual({
    dir: "/d/t",
    name: "t",
    mode: "roles",
    extraction: {
      target: extraction.target,
      structures: [
        {
          structure: "A",
          identity: "id",
          fields: { id: { type: "int" }, name: { type: "string" } },
        },
      ],
      interfaces: [...extraction.interfaces],
      operations: [
        {
          path: "f",
          operation: {
            operation: "f",
            interface: { method: "delete", pattern: "/a/{id}" },
            takes: { id: { says: "the a to remove", field: ["A", "id"] } },
            answers: { says: "204 with no body", structure: null },
            lines: [
              {
                kind: "requires",
                rule: "signed-in",
                shared: true,
                fact: "the caller is signed in",
                otherwise: "unauthenticated",
                status: 401,
                body: "empty",
                short: "the caller is signed in",
                source: "S.java:1",
                doubts: [],
              },
              {
                kind: "requires",
                rule: "exists",
                shared: false,
                fact: "the a exists",
                otherwise: "not-found",
                status: 404,
                body: "empty",
                short: "the a exists",
                source: "F.java:2",
                doubts: ["a negative id is not checked"],
              },
              {
                kind: "answers",
                rule: "answers",
                shared: false,
                says: "204 with no body",
                short: "204 with no body",
                doubts: [],
              },
            ],
          },
        },
      ],
      scenarios: [
        {
          path: "f/exists",
          operation: "f",
          rule: "exists",
          situation: "an id no a has",
          reached: "yes",
          steps: [
            {
              when: "call",
              as: "u",
              method: "delete",
              path: "/a/9",
              status: 404,
              answer: null,
            },
          ],
          judgement: {
            verdict: "holds",
            confidence: 0.9,
            says: "the call answered 404",
            stale: false,
          },
        },
      ],
      facts: [],
      projections: [],
      triggers: [],
      references: [],
    },
    common: commonSchema.parse(Bun.YAML.parse(common)),
    problems: [
      { file: "roles/f", at: "", message: 'no scenario for the rule "signed-in"' },
    ],
    gaps: [{ kind: "interface-not-read", name: "g", message: "no reading of it parses" }],
    rules: [
      {
        operation: "f",
        rule: "signed-in",
        provenance: "unjudged",
        reason: "no scenario exercises it",
        by: [],
      },
      {
        operation: "f",
        rule: "exists",
        provenance: "holds",
        by: [
          {
            scenario: "f/exists",
            verdict: "holds",
            confidence: 0.9,
            says: "the call answered 404",
            stale: false,
          },
        ],
      },
      {
        operation: "f",
        rule: "answers",
        provenance: "unjudged",
        reason: "no scenario exercises it",
        by: [],
      },
    ],
    bindings: [],
    counts: {
      rules: {
        holds: 1,
        contradicted: 0,
        "refused-unexpectedly": 0,
        "not-shown": 0,
        unjudged: 2,
      },
    },
    placed: [
      {
        operation: "f",
        home: "A",
        touches: [{ structure: "A", as: [{ verb: "takes", what: ["id"] }] }],
      },
    ],
  });
});
