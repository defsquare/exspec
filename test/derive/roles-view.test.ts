import { expect, test } from "bun:test";
import { judgeTask } from "../../src/derive/judge-task.ts";
import {
  actorsOf,
  type ReadInterface,
  viewOfRoles,
} from "../../src/derive/roles-view.ts";
import type { CommonTrigger } from "../../src/shapes/bindings.ts";
import { triggerSchema } from "../../src/shapes/bindings.ts";
import { evidenceSchema, rulesSchema } from "../../src/shapes/roles.ts";

const rules = rulesSchema.parse(
  Bun.YAML.parse(`
operation: f
takes: {a: {says: s}}
requires:
  - {rule: r-on, on: a, fact: f1, otherwise: bad, source: "F.java:1"}
  - {rule: r-off, fact: f2, otherwise: gone, source: "F.java:2"}
answers: {says: ok, structure: null}
`),
);

const trigger = triggerSchema.parse(
  Bun.YAML.parse(`
{trigger: f, interface: f, operation: f, answers: {status: 200},
 refuses: {bad: {status: 400, body: b}}}
`),
);

const commonTrigger: CommonTrigger = {
  refuses: { gone: { status: 404, body: "g" } },
  errors: [],
};

test("a requirement on an input says it in its line, one that is not does not", () => {
  const view = viewOfRoles({
    target: undefined,
    structures: [],
    common: undefined,
    commonTrigger: undefined,
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
        trigger,
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
    commonTrigger: undefined,
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
        trigger: undefined,
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

test("a call step says its call and the interface of its operation, played with what it was sent as and answered, written with nothing more", () => {
  const read = (slug: string, played: boolean) =>
    viewOfRoles({
      target: undefined,
      structures: [],
      common: undefined,
      commonTrigger: undefined,
      findings: [],
      interfaces: [
        {
          bound: {
            interface: "i",
            method: "post",
            pattern: "/a/{x}",
            request: {},
            responses: {},
          },
          rules,
          trigger,
          findings: [],
          scenarios: [
            {
              slug,
              scenario: {
                rule: "answers",
                situation: "s",
                reached: "yes",
                steps: [
                  { when: "call", as: "u", call: { operation: "f", with: { x: 1 } } },
                  { when: "after", as: "u", call: { operation: "g", with: {} } },
                ],
              },
            },
          ],
          evidence: played
            ? [
                {
                  slug,
                  evidence: evidenceSchema.parse(
                    Bun.YAML.parse(`
rule: answers
run: {target: t, version: v, at: "2026-11-13T10:00:00.000Z", clock: null}
exchanges:
  - {when: call, as: u, request: {method: post, path: /a/1}, response: {status: 200, body: null}}
  - {when: after, as: u, unplayable: 'no reading declares the operation "g"'}
`),
                  ),
                },
              ]
            : [],
          judgements: [],
        },
      ],
    }).extraction.scenarios[0]?.steps;
  expect({ played: read("a", true), written: read("a", false) }).toEqual({
    played: [
      {
        when: "call",
        as: "u",
        call: { operation: "f", with: { x: 1 } },
        interface: "i",
        method: "post",
        path: "/a/1",
        status: 200,
        answer: null,
      },
      {
        when: "after",
        as: "u",
        call: { operation: "g", with: {} },
        unplayable: 'no reading declares the operation "g"',
      },
    ],
    written: [
      { when: "call", as: "u", call: { operation: "f", with: { x: 1 } }, interface: "i" },
      { when: "after", as: "u", call: { operation: "g", with: {} } },
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

test("a refusal's status is its trigger's, else the shared trigger's", () => {
  const view = viewOfRoles({
    target: undefined,
    structures: [],
    common: undefined,
    commonTrigger,
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
        trigger,
        findings: [],
        scenarios: [],
        evidence: [],
        judgements: [],
      },
    ],
  });
  const operation = view.extraction.operations[0]?.operation;
  expect({
    statuses: operation?.lines.map(({ rule, status }) => [rule, status]),
    rules: view.rules.map(({ rule }) => rule),
    counts: view.counts,
    triggers: view.extraction.triggers,
  }).toEqual({
    statuses: [
      ["r-on", 400],
      ["r-off", 404],
      ["answers", undefined],
    ],
    rules: ["r-on", "r-off", "answers"],
    counts: {
      rules: {
        holds: 0,
        contradicted: 0,
        "refused-unexpectedly": 0,
        "not-shown": 0,
        unjudged: 3,
      },
    },
    triggers: [trigger],
  });
});

// one operation f: an effect e on every call, two on a condition; one recording w,
// accepted with 200; its `met` judgement carrying the hash it was judged with
const branched = (of: (one: Omit<ReadInterface, "met">) => string): ReadInterface => {
  const one: Omit<ReadInterface, "met"> = {
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
  - {rule: e, says: s1, source: "F.java:3"}
  - {rule: w, when: the a is shared, says: s2, source: "F.java:4"}
  - {rule: v, when: the a is not shared, says: s3, source: "F.java:5"}
answers: {says: ok, structure: null}
`),
    ),
    trigger: triggerSchema.parse(
      Bun.YAML.parse(
        "{trigger: f, interface: f, operation: f, answers: {status: [200, 202]}, refuses: {}}",
      ),
    ),
    findings: [],
    scenarios: [],
    evidence: [
      {
        slug: "w",
        evidence: evidenceSchema.parse(
          Bun.YAML.parse(`
rule: w
run: {target: t, version: v, at: "2026-11-13T10:00:00.000Z", clock: null}
exchanges:
  - {when: call, as: u, request: {method: post, path: /a}, response: {status: 200, body: null}}
`),
        ),
      },
    ],
    judgements: [
      {
        scenario: "w",
        rule: "e",
        situation: "yes",
        verdict: "holds",
        confidence: 0.9,
        evidence: "x",
        of: "h",
      },
    ],
  };
  return {
    ...one,
    met: [{ scenario: "w", met: { w: "yes", v: "unsure" }, evidence: "y", of: of(one) }],
  };
};

const judgedToday = ({ bound, rules, trigger, evidence }: Omit<ReadInterface, "met">) =>
  rules === undefined || trigger === undefined
    ? undefined
    : judgeTask({
        bound,
        common: undefined,
        commonTrigger: undefined,
        runsWith: undefined,
        rules,
        trigger,
        recordings: evidence,
        states: [],
      });

const todaysConditionsHash = (one: Omit<ReadInterface, "met">) =>
  judgedToday(one)?.ofConditions.get("w") ?? "";

const todaysRuleHash = (one: Omit<ReadInterface, "met">) =>
  judgedToday(one)?.of.get("w") ?? "";

const viewOf = (one: ReadInterface) =>
  viewOfRoles({
    target: undefined,
    structures: [],
    common: undefined,
    commonTrigger: undefined,
    findings: [],
    interfaces: [one],
  });

test("a scenario's judgement is the one on its rule, and an operation's branches are those its accepted recordings were judged on", () => {
  const view = viewOf(branched(todaysConditionsHash));
  expect({
    judgement: view.extraction.scenarios[0]?.judgement,
    branches: view.extraction.operations[0]?.operation.branches,
  }).toEqual({
    judgement: null,
    branches: {
      outcomes: [{ met: ["w"], unsure: ["v"], status: 200, scenarios: ["w"] }],
      forks: [],
      neverMet: ["v"],
      accepted: [
        { status: 200, seen: true },
        { status: 202, seen: false },
      ],
    },
  });
});

test("a `met` judgement whose conditions changed since is on no outcome, and a gap", () => {
  const view = viewOf(branched(() => "m"));
  expect({
    branches: view.extraction.operations[0]?.operation.branches,
    gaps: view.gaps.filter(({ kind }) => kind === "judgement-stale"),
  }).toEqual({
    branches: {
      outcomes: [],
      forks: [],
      neverMet: ["w", "v"],
      accepted: [
        { status: 200, seen: false },
        { status: 202, seen: false },
      ],
    },
    gaps: [
      {
        kind: "judgement-stale",
        name: "f/w",
        message:
          "the conditions of its operation's effects changed since they were judged",
      },
    ],
  });
});

test("a recording with no `met` whose own rule's judgement is stale is on no outcome, and a gap", () => {
  const view = viewOf({
    ...branched(todaysConditionsHash),
    met: [],
    judgements: [
      {
        scenario: "w",
        rule: "w",
        situation: "yes",
        verdict: "holds",
        confidence: 0.9,
        evidence: "x",
        of: "h",
      },
    ],
  });
  expect({
    branches: view.extraction.operations[0]?.operation.branches,
    gaps: view.gaps.filter(({ kind }) => kind === "judgement-stale"),
  }).toEqual({
    branches: {
      outcomes: [],
      forks: [],
      neverMet: ["w", "v"],
      accepted: [
        { status: 200, seen: false },
        { status: 202, seen: false },
      ],
    },
    gaps: [
      {
        kind: "judgement-stale",
        name: "f/w",
        message: "its rule or its evidence changed since it was judged",
      },
    ],
  });
});

test("a `met` judgement whose recording is no longer an accepted call is on no outcome, and a gap", () => {
  const view = viewOf({
    ...branched(todaysConditionsHash),
    evidence: [
      {
        slug: "w",
        evidence: evidenceSchema.parse(
          Bun.YAML.parse(`
rule: w
run: {target: t, version: v, at: "2026-11-13T10:00:00.000Z", clock: null}
exchanges:
  - {when: call, as: u, request: {method: post, path: /a}, response: {status: 400, body: null}}
`),
        ),
      },
    ],
  });
  expect({
    branches: view.extraction.operations[0]?.operation.branches,
    gaps: view.gaps.filter(({ kind }) => kind === "judgement-stale"),
  }).toEqual({
    branches: {
      outcomes: [],
      forks: [],
      neverMet: ["w", "v"],
      accepted: [
        { status: 200, seen: false },
        { status: 202, seen: false },
      ],
    },
    gaps: [
      {
        kind: "judgement-stale",
        name: "f/w",
        message:
          "its recording is no longer an accepted call of an operation with conditional effects",
      },
    ],
  });
});

test("a recording's own rule judged reached while its `met` says its condition not met stands on the outcome, and a gap", () => {
  const one = branched(todaysConditionsHash);
  const view = viewOf({
    ...one,
    met: (one.met ?? []).map((judged) => ({ ...judged, met: { w: "no", v: "unsure" } })),
    judgements: [
      {
        scenario: "w",
        rule: "w",
        situation: "yes",
        verdict: "holds",
        confidence: 0.9,
        evidence: "x",
        of: todaysRuleHash(one),
      },
    ],
  });
  expect({
    branches: view.extraction.operations[0]?.operation.branches,
    gaps: view.gaps.filter(({ kind }) => kind.startsWith("judgement-")),
  }).toEqual({
    branches: {
      outcomes: [{ met: ["w"], unsure: ["v"], status: 200, scenarios: ["w"] }],
      forks: [],
      neverMet: ["v"],
      accepted: [
        { status: 200, seen: true },
        { status: 202, seen: false },
      ],
    },
    gaps: [
      {
        kind: "judgement-contradicts",
        name: "f/w",
        message: "its rule w was judged reached, its condition judged not met",
      },
    ],
  });
});
