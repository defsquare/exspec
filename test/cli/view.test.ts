import { expect, test } from "bun:test";
import { dataOf } from "../../src/cli/view.ts";
import { judgeTask } from "../../src/derive/judge-task.ts";
import { commonTriggerSchema, triggerSchema } from "../../src/shapes/bindings.ts";
import { parseExtraction } from "../../src/shapes/extraction.ts";
import { commonSchema, evidenceSchema, rulesSchema } from "../../src/shapes/roles.ts";
import { target } from "../files.ts";

const interfaces = `
interfaces:
  - {interface: f, method: delete, pattern: "/a/{id}", request: {path: {id: int}}, responses: {204: {body: null}}}
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
  - {rule: signed-in, applies-to: every operation, fact: the caller is signed in, otherwise: unauthenticated, source: "S.java:1"}
`;

const rules = `
operation: f
takes: {id: {says: the a to remove, field: [A, id]}}
common: [signed-in]
requires:
  - {rule: exists, fact: the a exists, otherwise: not-found, source: "F.java:2"}
answers: {says: no body, structure: null}
unsure:
  - {rule: exists, what: a negative id is not checked}
`;

const commonTrigger = `
refuses: {unauthenticated: {status: 401, body: empty}}
`;

const trigger = `
{trigger: f, interface: f, operation: f, answers: {status: 204}, refuses: {not-found: {status: 404, body: empty}}}
`;

const hints = `
- {rule: exists, situation: an id no a has, how: call with 9, seen-in: none, reachable: yes}
`;

const scenario = `
rule: exists
situation: an id no a has
reached: yes
steps:
  - {when: call, as: u, call: {operation: f, with: {id: "9"}}}
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
        commonTrigger: commonTriggerSchema.parse(Bun.YAML.parse(commonTrigger)),
        runsWith: extraction.target?.["runs-with"],
        rules: rulesSchema.parse(Bun.YAML.parse(rules)),
        trigger: triggerSchema.parse(Bun.YAML.parse(trigger)),
        states: [],
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
      { path: "common.yaml", text: common },
      { path: "common-trigger.yaml", text: commonTrigger },
      { path: "operations/f/rules.yaml", text: rules },
      { path: "operations/f/trigger.yaml", text: trigger },
      { path: "operations/f/hints.yaml", text: hints },
      { path: "operations/f/scenarios/exists.yaml", text: scenario },
      { path: "operations/f/evidence/exists.yaml", text: evidence },
      { path: "operations/f/judgements.yaml", text: judgements },
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
            answers: { says: "no body", structure: null },
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
                says: "no body",
                short: "no body",
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
              call: { operation: "f", with: { id: "9" } },
              interface: "f",
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
      triggers: [triggerSchema.parse(Bun.YAML.parse(trigger))],
      references: [],
    },
    common: commonSchema.parse(Bun.YAML.parse(common)),
    commonTrigger: commonTriggerSchema.parse(Bun.YAML.parse(commonTrigger)),
    problems: [
      { file: "operations/f", at: "", message: 'no scenario for the rule "signed-in"' },
    ],
    gaps: [
      { kind: "interface-not-read", name: "g", message: "no reading of it parses" },
      {
        kind: "evidence-played-once",
        name: "f/exists",
        message: "played once: not a reference yet",
      },
    ],
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
    services: [],
    actors: ["u"],
  });
});

test("view draws a scenario's verdict the same with a state's judgement on it beside", () => {
  const files = (judged: string) => [
    { path: "target.yaml", text: target },
    { path: "interfaces.yaml", text: interfaces },
    { path: "structures.yaml", text: structures },
    { path: "common.yaml", text: common },
    { path: "common-trigger.yaml", text: commonTrigger },
    { path: "operations/f/rules.yaml", text: rules },
    { path: "operations/f/trigger.yaml", text: trigger },
    { path: "operations/f/hints.yaml", text: hints },
    { path: "operations/f/scenarios/exists.yaml", text: scenario },
    { path: "operations/f/evidence/exists.yaml", text: evidence },
    { path: "operations/f/judgements.yaml", text: judged },
  ];
  const withState = judgements.replace(
    "judgements:\n",
    `judgements:\n  - {scenario: exists, state: s, situation: "yes", verdict: contradicted, confidence: 0.5, evidence: e, of: k}\n`,
  );
  expect(dataOf("/d/t", files(withState))).toEqual(dataOf("/d/t", files(judgements)));
});

const service = `
service: s
says: keeps a
conditions:
  - {condition: c, says: forgets every a}
`;

const provider = `
provider: p
renders: s
state: {shape: {kept: [string]}, says: what is kept}
expects:
  - {expect: e, on: i, says: a key is given, source: src/a.ts}
`;

const providerInterfaces = `
interfaces:
  - {interface: i, method: post, pattern: /x, responses: {200: {body: any}}}
`;

test("view draws each service with the provider rendering it, and tells a file that does not parse", () => {
  const data = dataOf("/d/t", [
    { path: "target.yaml", text: target },
    { path: "interfaces.yaml", text: interfaces },
    { path: "structures.yaml", text: structures },
    { path: "common.yaml", text: common },
    { path: "common-trigger.yaml", text: commonTrigger },
    { path: "operations/f/rules.yaml", text: rules },
    { path: "operations/f/trigger.yaml", text: trigger },
    { path: "operations/f/hints.yaml", text: hints },
    { path: "services/s.yaml", text: service },
    { path: "services/u.yaml", text: "service: u" },
    { path: "providers/p/provider.yaml", text: provider },
    { path: "providers/p/interfaces.yaml", text: providerInterfaces },
    { path: "providers/q/provider.yaml", text: "provider: [" },
  ]);
  expect({
    services: "services" in data ? data.services : undefined,
    problems: data.problems,
  }).toEqual({
    services: [
      {
        service: "s",
        says: "keeps a",
        unsure: [],
        in: [],
        conditions: [{ condition: "c", takes: {}, says: "forgets every a", given: [] }],
        rules: [],
        provider: {
          provider: "p",
          calls: 0,
          scenarios: 0,
          interfaces: [{ interface: "i", method: "post", pattern: "/x" }],
          expects: [{ expect: "e", on: "i", says: "a key is given", source: "src/a.ts" }],
          unsure: [],
        },
      },
    ],
    problems: [
      {
        file: "services/u.yaml",
        at: "",
        message: "says: Invalid input: expected string, received undefined",
      },
      {
        file: "services/u.yaml",
        at: "",
        message: "conditions: Invalid input: expected array, received undefined",
      },
      { file: "providers/q/interfaces.yaml", at: "", message: "missing" },
      {
        file: "providers/q/provider.yaml",
        at: "",
        message: "not YAML: YAML Parse error: Unexpected token",
      },
    ],
  });
});

test("view hands the page a scenario with no service step and no side effect as it was before the services", () => {
  const data = dataOf("/d/t", [
    { path: "target.yaml", text: target },
    { path: "interfaces.yaml", text: interfaces },
    { path: "structures.yaml", text: structures },
    { path: "common.yaml", text: common },
    { path: "common-trigger.yaml", text: commonTrigger },
    { path: "operations/f/rules.yaml", text: rules },
    { path: "operations/f/trigger.yaml", text: trigger },
    { path: "operations/f/hints.yaml", text: hints },
    { path: "operations/f/scenarios/exists.yaml", text: scenario },
    { path: "operations/f/evidence/exists.yaml", text: evidence },
  ]);
  expect({
    services: "services" in data ? data.services : undefined,
    scenarios: data.extraction.scenarios,
  }).toEqual({
    services: [],
    scenarios: [
      {
        path: "f/exists",
        judgement: null,
        operation: "f",
        rule: "exists",
        situation: "an id no a has",
        reached: "yes",
        steps: [
          {
            when: "call",
            as: "u",
            call: { operation: "f", with: { id: "9" } },
            interface: "f",
            method: "delete",
            path: "/a/9",
            status: 404,
            answer: null,
          },
        ],
      },
    ],
  });
});

test("view lists what states.yaml says wrong, and each state not judged on its path yet as a gap", () => {
  const data = dataOf("/d/t", [
    { path: "target.yaml", text: target },
    { path: "interfaces.yaml", text: interfaces },
    { path: "structures.yaml", text: structures },
    { path: "common.yaml", text: common },
    { path: "common-trigger.yaml", text: commonTrigger },
    { path: "operations/f/rules.yaml", text: rules },
    { path: "operations/f/trigger.yaml", text: trigger },
    { path: "operations/f/hints.yaml", text: hints },
    { path: "operations/f/scenarios/exists.yaml", text: scenario },
    {
      path: "states.yaml",
      text: `
- {state: s, of: [B], seen: a, path: f/exists}
- {state: t, of: [A], seen: a, path: h/exists}
`,
    },
  ]);
  expect(data.problems).toEqual([
    { file: "states.yaml", at: "", message: 's: "B" is not a structure' },
    {
      file: "states.yaml",
      at: "",
      message: 't: the path h/exists names "h", not an interface',
    },
    { file: "operations/f", at: "", message: 'no scenario for the rule "signed-in"' },
    {
      file: "operations/f",
      at: "",
      message:
        '"exists" is the path of the state "s": it ends with no after step, which shows what is seen in the state',
    },
  ]);
  expect(data.gaps.filter(({ kind }) => kind === "state-not-reached")).toEqual([
    {
      kind: "state-not-reached",
      name: "s",
      message: "it is not judged on its path f/exists yet",
    },
    {
      kind: "state-not-reached",
      name: "t",
      message: "it is not judged on its path h/exists yet",
    },
  ]);
});

const readFolder = [
  { path: "target.yaml", text: target },
  { path: "interfaces.yaml", text: interfaces },
  { path: "structures.yaml", text: structures },
  { path: "common.yaml", text: common },
  { path: "common-trigger.yaml", text: commonTrigger },
  { path: "operations/f/rules.yaml", text: rules },
  { path: "operations/f/trigger.yaml", text: trigger },
  { path: "operations/f/hints.yaml", text: hints },
  { path: "operations/f/scenarios/exists.yaml", text: scenario },
];

test("view hands the page each state, and the state a scenario starts from", () => {
  const data = dataOf("/d/t", [
    ...readFolder,
    {
      path: "operations/f/scenarios/exists-2.yaml",
      text: `
rule: exists
situation: an id no a has
reached: yes
steps:
  - {when: arrange, state: s, name: p}
  - {when: call, as: u, call: {operation: f, with: {id: "9"}}}
`,
    },
    { path: "operations/f/evidence/exists-2.yaml", text: evidence },
    {
      path: "states.yaml",
      text: "- {state: s, of: [A], seen: a, path: f/exists, serves: [f/exists]}",
    },
  ]);
  expect({
    states: "states" in data ? data.states : undefined,
    startsFrom: data.extraction.scenarios.map((e) =>
      "startsFrom" in e ? { path: e.path, startsFrom: e.startsFrom } : { path: e.path },
    ),
  }).toEqual({
    states: [
      {
        state: "s",
        seen: "a",
        of: ["A"],
        path: { operation: "f", scenario: "exists" },
        reached: "not-yet",
        why: "it is not judged on its path f/exists yet",
        serves: [{ operation: "f", rules: ["exists"] }],
        startedFrom: [{ operation: "f", scenarios: ["exists-2"] }],
      },
    ],
    startsFrom: [{ path: "f/exists" }, { path: "f/exists-2", startsFrom: ["s"] }],
  });
});

test("view hands the page no state when states.yaml is missing or empty", () => {
  expect({
    missing: "states" in dataOf("/d/t", readFolder),
    empty:
      "states" in dataOf("/d/t", [...readFolder, { path: "states.yaml", text: "[]" }]),
  }).toEqual({ missing: false, empty: false });
});
