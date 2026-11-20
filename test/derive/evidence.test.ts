import { expect, test } from "bun:test";
import type { Callable } from "../../src/derive/callables.ts";
import {
  compareEvidence,
  evidenceAnswers,
  isAsWritten,
  noiseBetween,
} from "../../src/derive/evidence.ts";
import type {
  Evidence,
  Exchange,
  RoleScenario,
  SideEffect,
  Step,
} from "../../src/shapes/roles.ts";
import type { Noise, TargetResponse } from "../../src/shapes/scenario.ts";
import { run } from "../played.ts";

const sent = (path: string) => ({ method: "get" as const, path });

const exchange = (response: TargetResponse, path = "/a"): Exchange => ({
  when: "call",
  as: "a",
  request: sent(path),
  response,
});

const unplayable: Exchange = { when: "call", as: "a", unplayable: "why" };

const evidenceOf = (
  exchanges: readonly Exchange[],
  noise?: readonly Noise[],
): Evidence => ({
  rule: "r",
  run,
  exchanges,
  ...(noise === undefined ? {} : { noise }),
});

const arranged = exchange({ status: 201, body: null });
const body = (a: string, b: string, c: number) =>
  exchange({ status: 200, body: { a, b, c } });
const noise: readonly Noise[] = [
  { at: ["exchanges", 1, "response", "body", "a"], class: 1 },
  { at: ["exchanges", 1, "response", "body", "b"], class: 1 },
];
const reference = { ...evidenceOf([arranged, body("t1", "t1", 1)]), noise };
const at = ["exchanges", 1, "response", "body"] as const;

test("an unplayable exchange answered nothing", () => {
  expect(
    evidenceAnswers(evidenceOf([arranged, unplayable, body("t1", "t1", 1)])),
  ).toEqual([
    { at: ["exchanges", 0, "response"], response: { status: 201, body: null } },
    {
      at: ["exchanges", 2, "response"],
      response: { status: 200, body: { a: "t1", b: "t1", c: 1 } },
    },
  ]);
});

test("the noise between two copies is where their bodies differ, in classes", () => {
  expect(
    noiseBetween(
      evidenceOf([arranged, body("t1", "t1", 1)]),
      evidenceOf([arranged, body("t2", "t2", 1)]),
    ),
  ).toEqual({
    stable: true,
    noise: [
      { at: [...at, "a"], class: 1 },
      { at: [...at, "b"], class: 1 },
    ],
  });
});

test("a status that differs makes two copies unstable", () => {
  expect(
    noiseBetween(
      evidenceOf([arranged, body("t1", "t1", 1)]),
      evidenceOf([arranged, exchange({ status: 500, body: null })]),
    ),
  ).toEqual({
    stable: false,
    differences: [
      { at: ["exchanges", 1, "response", "status"], first: 200, second: 500 },
    ],
  });
});

test("another number of exchanges makes two copies unstable", () => {
  expect(
    noiseBetween(evidenceOf([arranged, body("t1", "t1", 1)]), evidenceOf([arranged])),
  ).toEqual({
    stable: false,
    differences: [{ at: ["exchanges"], first: 2, second: 1 }],
  });
});

test("two copies with another number of exchanges differ by that number, an unplayable one counted", () => {
  expect(
    noiseBetween(
      evidenceOf([arranged, unplayable, body("t1", "t1", 1)]),
      evidenceOf([arranged, body("t1", "t1", 1)]),
    ),
  ).toEqual({
    stable: false,
    differences: [{ at: ["exchanges"], first: 3, second: 2 }],
  });
});

test("an unplayable exchange makes two copies unstable", () => {
  expect(
    noiseBetween(
      evidenceOf([arranged, body("t1", "t1", 1)]),
      evidenceOf([arranged, unplayable]),
    ),
  ).toEqual({
    stable: false,
    differences: [{ at: ["exchanges"], first: 2, second: 1 }],
  });
});

test("a copy that answers as the reference does, apart from its noise, differs nowhere", () => {
  expect(compareEvidence(reference, evidenceOf([arranged, body("t3", "t3", 1)]))).toEqual(
    [],
  );
});

test("one class answers one value", () => {
  expect(compareEvidence(reference, evidenceOf([arranged, body("t3", "t4", 1)]))).toEqual(
    [{ at: [...at, "b"], expected: "t3", actual: "t4" }],
  );
});

test("a value outside the noise differs", () => {
  expect(compareEvidence(reference, evidenceOf([arranged, body("t3", "t3", 2)]))).toEqual(
    [{ at: [...at, "c"], expected: 1, actual: 2 }],
  );
});

test("a status differs", () => {
  expect(
    compareEvidence(
      reference,
      evidenceOf([arranged, exchange({ status: 404, body: { a: "t3", b: "t3", c: 1 } })]),
    ),
  ).toEqual([{ at: ["exchanges", 1, "response", "status"], expected: 200, actual: 404 }]);
});

test("another number of exchanges differs", () => {
  expect(compareEvidence(reference, evidenceOf([arranged]))).toEqual([
    { at: ["exchanges"], expected: 2, actual: 1 },
  ]);
});

test("an unplayable exchange differs", () => {
  expect(compareEvidence(reference, evidenceOf([arranged, unplayable]))).toEqual([
    { at: ["exchanges"], expected: 2, actual: 1 },
  ]);
});

const effect = (extra: Partial<SideEffect> = {}): SideEffect => ({
  observable: "s",
  request: { method: "post", path: "/b", body: { to: "x" } },
  response: { status: 200, body: { id: "e1" } },
  ...extra,
});

const effecting = (
  effects: readonly SideEffect[],
  response: TargetResponse = { status: 200, body: null },
): Exchange => ({ ...exchange(response), "side-effects": effects });

const once = (...exchanges: readonly Exchange[]) => ({
  ...evidenceOf(exchanges),
  noise: [],
});

test("a request sent to a provider that differs on a replay differs", () => {
  expect(
    compareEvidence(
      once(effecting([effect()])),
      evidenceOf([
        effecting([
          effect({ request: { method: "post", path: "/b", body: { to: "y" } } }),
        ]),
      ]),
    ),
  ).toEqual([
    {
      at: ["exchanges", 0, "side-effects", 0, "request", "body", "to"],
      expected: "x",
      actual: "y",
    },
  ]);
});

test("a provider's response alone that differs on a replay differs nowhere", () => {
  expect(
    compareEvidence(
      once(effecting([effect()])),
      evidenceOf([
        effecting([effect({ response: { status: 500, body: { id: "e2" } } })]),
      ]),
    ),
  ).toEqual([]);
});

test("another number of side effects on a replay differs", () => {
  expect(
    compareEvidence(
      once(effecting([effect(), effect()])),
      evidenceOf([effecting([effect()])]),
    ),
  ).toEqual([{ at: ["exchanges", 0, "side-effects"], expected: 2, actual: 1 }]);
});

test("side effects not observed in the reference and observed none on a replay differ", () => {
  expect(
    compareEvidence(
      once(exchange({ status: 200, body: null })),
      evidenceOf([effecting([])]),
    ),
  ).toEqual([{ at: ["exchanges", 0, "side-effects"], expected: null, actual: 0 }]);
});

const served = (id: string) =>
  effecting([effect({ response: { status: 200, body: { id } } })]);
const repeated = (id: string) => exchange({ status: 200, body: { id } });
const across: readonly Noise[] = [
  { at: ["exchanges", 0, "side-effects", 0, "response", "body", "id"], class: 1 },
  { at: ["exchanges", 1, "response", "body", "id"], class: 1 },
];

test("an id a provider gave and the target repeats is one class of noise", () => {
  expect(
    noiseBetween(
      evidenceOf([served("e1"), repeated("e1")]),
      evidenceOf([served("e2"), repeated("e2")]),
    ),
  ).toEqual({ stable: true, noise: across });
});

test("a request sent with another method makes two copies unstable", () => {
  expect(
    noiseBetween(
      evidenceOf([effecting([effect()])]),
      evidenceOf([
        effecting([
          effect({ request: { method: "put", path: "/b", body: { to: "x" } } }),
        ]),
      ]),
    ),
  ).toEqual({
    stable: false,
    differences: [
      {
        at: ["exchanges", 0, "side-effects", 0, "request", "method"],
        first: "post",
        second: "put",
      },
    ],
  });
});

test("another number of side effects makes two copies unstable", () => {
  expect(
    noiseBetween(
      evidenceOf([effecting([effect()])]),
      evidenceOf([effecting([effect(), effect()])]),
    ),
  ).toEqual({
    stable: false,
    differences: [{ at: ["exchanges", 0, "side-effects"], first: 1, second: 2 }],
  });
});

test("a class of noise holds across a provider's response on a replay", () => {
  expect(
    compareEvidence(
      { ...evidenceOf([served("e1"), repeated("e1")]), noise: across },
      evidenceOf([served("e3"), repeated("e4")]),
    ),
  ).toEqual([
    { at: ["exchanges", 1, "response", "body", "id"], expected: "e3", actual: "e4" },
  ]);
});

const step = (path: string, extra: Partial<Step> = {}): Step => ({
  when: "call",
  as: "a",
  request: { method: "get", path },
  ...extra,
});

const scenarioOf = (steps: readonly Step[]): RoleScenario => ({
  rule: "r",
  situation: "s",
  reached: "yes",
  steps,
});

const callables: readonly Callable[] = [
  {
    operation: "f",
    bound: {
      interface: "f",
      method: "post",
      pattern: "/s/{x}",
      request: { path: { x: "string" }, body: { n: "int" } },
      responses: { "201": { body: { data: ["schema", "S"] } } },
    },
    takes: { x: { says: "the s" }, n: { says: "a number" } },
    places: { x: ["path", "x"], n: ["body", "n"] },
    unplaced: [],
    structure: "S",
    fields: ["id"],
    answer: { at: ["data"] },
  },
];

const asWritten = (scenario: RoleScenario, evidence: Evidence) =>
  isAsWritten(scenario, evidence, callables);

const calls = scenarioOf([
  {
    when: "arrange",
    as: "a",
    name: "c",
    call: { operation: "f", with: { x: "p", n: 1 } },
  },
  { when: "call", as: "a", call: { operation: "f", with: { x: "{{c.id}}", n: 2 } } },
]);
const sentAs = (id: number, path: string) =>
  evidenceOf([
    {
      when: "arrange",
      as: "a",
      request: { method: "post", path: "/s/p", body: { n: 1 } },
      response: { status: 201, body: { data: { id } } },
    },
    {
      when: "call",
      as: "a",
      request: { method: "post", path, body: { n: 2 } },
      response: { status: 201, body: { data: { id: 8 } } },
    },
  ]);

test("a call step is of it as written when its exchange sent the request its trigger gives, a hole read in the structure answered", () => {
  expect([
    asWritten(calls, sentAs(7, "/s/7")),
    asWritten(calls, sentAs(7, "/s/8")),
    isAsWritten(calls, sentAs(7, "/s/7"), []),
  ]).toEqual([true, false, false]);
});

const written = scenarioOf([step("/a"), step("/b")]);
const given = evidenceOf([
  exchange({ status: 200, body: null }, "/a"),
  exchange({ status: 200, body: null }, "/b"),
]);

test("the evidence a scenario gives is of it as written", () => {
  expect(asWritten(written, given)).toEqual(true);
});

test("another rule is not of it as written", () => {
  expect(asWritten({ ...written, rule: "q" }, given)).toEqual(false);
});

test("a step's request changed is not of it as written", () => {
  expect(asWritten(scenarioOf([step("/a"), step("/c")]), given)).toEqual(false);
});

test("a step added is not of it as written", () => {
  expect(asWritten(scenarioOf([step("/a"), step("/b"), step("/c")]), given)).toEqual(
    false,
  );
});

test("another actor is not of it as written", () => {
  expect(asWritten(scenarioOf([step("/a"), step("/b", { as: "z" })]), given)).toEqual(
    false,
  );
});

const withHole = scenarioOf([step("/a", { name: "m" }), step("/items/{{m.body.id}}")]);
const answered = (id: number, path: string) =>
  evidenceOf([
    exchange({ status: 201, body: { id } }, "/a"),
    exchange({ status: 200, body: null }, path),
  ]);

test("a hole filled from an earlier answer of the evidence is of it as written", () => {
  expect(asWritten(withHole, answered(7, "/items/7"))).toEqual(true);
});

test("a hole not filled from the earlier answer of the evidence is not of it as written", () => {
  expect(asWritten(withHole, answered(8, "/items/7"))).toEqual(false);
});

const givenS = scenarioOf([
  step("/a", { name: "m" }),
  { when: "arrange", service: "s", is: "refuses", with: { address: "{{m.body.to}}" } },
]);
const gave = (is: string, address: string) =>
  evidenceOf([
    exchange({ status: 200, body: { to: "u@x" } }, "/a"),
    { when: "arrange", service: "s", is, with: { address } },
  ]);

test("a service step is of it as written when its exchange gave the condition with its holes filled", () => {
  expect(asWritten(givenS, gave("refuses", "u@x"))).toEqual(true);
});

test("a service step is not of it as written when its exchange gave another condition or another value", () => {
  expect([
    asWritten(givenS, gave("forgets-everything", "u@x")),
    asWritten(givenS, gave("refuses", "v@x")),
  ]).toEqual([false, false]);
});

const withGiven = (to: string) =>
  evidenceOf([
    exchange({ status: 200, body: { to } }, "/a"),
    { when: "arrange", service: "s", is: "refuses", with: { address: to } },
  ]);

test("what a service step gave is in the classes of noise, and never a difference of its own", () => {
  const marked = noiseBetween(withGiven("u1"), withGiven("u2"));
  expect({
    marked,
    replayed:
      "noise" in marked
        ? compareEvidence({ ...withGiven("u1"), noise: marked.noise }, withGiven("u3"))
        : undefined,
  }).toEqual({
    marked: {
      stable: true,
      noise: [
        { at: ["exchanges", 0, "response", "body", "to"], class: 1 },
        { at: ["exchanges", 1, "with", "address"], class: 1 },
      ],
    },
    replayed: [],
  });
});

test("an evidence ending on an unplayable exchange is not of it as written", () => {
  expect(
    asWritten(
      written,
      evidenceOf([exchange({ status: 200, body: null }, "/a"), unplayable]),
    ),
  ).toEqual(false);
});

const formStep = (to: string): Step =>
  step("/a", { request: { method: "post", path: "/a", form: { to } } });
const formEvidence = (to: string) =>
  evidenceOf([
    {
      when: "call",
      as: "a",
      request: { method: "post", path: "/a", form: { to } },
      response: { status: 200, body: null },
    },
  ]);

test("an exchange that sent the step's form is of it as written, another value is not", () => {
  expect([
    asWritten(scenarioOf([formStep("x")]), formEvidence("x")),
    asWritten(scenarioOf([formStep("x")]), formEvidence("y")),
  ]).toEqual([true, false]);
});
