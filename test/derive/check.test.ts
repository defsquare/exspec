import { expect, test } from "bun:test";
import { join } from "node:path";
import { checkExtraction } from "../../src/derive/check.ts";
import { readExtractionFiles } from "../../src/io/files.ts";
import {
  type Extraction,
  type Gap,
  parseExtraction,
} from "../../src/shapes/extraction.ts";

const base: Readonly<Record<string, string>> = {
  "interfaces.yaml": `
schemas:
  - schema: S
    shape: {a: string, b: [maybe, {c: int}]}
interfaces:
  - interface: i
    method: post
    pattern: /s/{a}
    request:
      path: {a: string}
      query: {q: [optional, int]}
      body: {s: [optional, [schema, S]]}
    responses:
      200: {body: {s: [schema, S], l: [[schema, S]]}}
`,
  "structures.yaml": `
- structure: S
  identity: a
  fields:
    a: {type: string, min-length: 1}
    t: {structure: T}
- structure: T
  identity: b
  fields: {b: {type: string}}
`,
  "facts.yaml": `
- fact: p
  condition: [{structure: S, where: {a: [call, a]}, must-be: [exists]}]
`,
  "operations/f.yaml": `
operation: f
takes:
  a:
    field: [S, a]
    rules:
      - {rule: r, violates: min-length, otherwise: x}
      - {rule: given, violates: required, otherwise: x}
  n: {type: int, optional: true}
requires: [{rule: q, fact: p, otherwise: y}]
answers: S
`,
  "bindings.yaml": `
triggers:
  - trigger: t
    interface: i
    operation: f
    sends: {a: [path, a]}
    answers: {status: 200, shows: [{structure: S, at: [s]}]}
    refuses: {x: {status: 400}}
`,
};

function extract(overrides: Readonly<Record<string, string>>): Extraction {
  const { extraction, problems } = parseExtraction(
    Object.entries({ ...base, ...overrides }).map(([path, text]) => ({ path, text })),
  );
  expect(problems).toEqual([]);
  return extraction;
}

const problemsOf = (overrides: Readonly<Record<string, string>>) =>
  checkExtraction(extract(overrides)).problems;

test("the fixture has no problem, and these gaps", async () => {
  const { extraction } = parseExtraction(
    await readExtractionFiles(join(import.meta.dir, "../fixtures/conduit")),
  );
  const rule = (name: string): Gap => ({
    kind: "rule-without-scenario",
    name,
    message: "no scenario proves it",
  });
  expect(checkExtraction(extraction)).toEqual({
    problems: [],
    gaps: [
      {
        kind: "fact-not-observable",
        name: "the caller is the article's author",
        message: "its condition is empty",
      },
      {
        kind: "fact-not-observable",
        name: "the email is not registered yet",
        message: "its condition is empty",
      },
      {
        kind: "interface-not-bound",
        name: "login",
        message: "no trigger and no projection cites it",
      },
      rule("favorite-article/exists"),
      rule("favorite-article/joins-favorites"),
      rule("favorite-article/signed-in"),
      rule("register/email-free"),
      rule("register/email-given"),
      rule("register/email-shaped"),
      rule("register/password-given"),
      rule("register/username-given"),
      rule("unfavorite-article/nothing-to-leave"),
      rule("unfavorite-article/signed-in"),
      rule("update-article/author"),
      rule("update-article/body"),
      rule("update-article/description"),
      rule("update-article/exists"),
      rule("update-article/signed-in"),
      rule("update-article/title"),
      { kind: "structure-not-shown", name: "Tag", message: "no projection shows it" },
    ],
  });
});

test("the small extraction has no problem", () => {
  expect(problemsOf({})).toEqual([]);
});

test("a binding naming an interface, an operation or a structure that does not exist", () => {
  expect(
    problemsOf({
      "bindings.yaml": `
projections:
  - {projection: v, interface: j, shows: [{structure: U, at: [s]}]}
triggers:
  - {trigger: t, interface: j, operation: g, answers: {status: 200, shows: [{structure: U, at: [s]}]}}
`,
    }),
  ).toEqual([
    {
      file: "bindings.yaml",
      at: "projections.0.interface",
      message: 'unknown interface "j"',
    },
    {
      file: "bindings.yaml",
      at: "projections.0.shows.0.structure",
      message: 'unknown structure "U"',
    },
    {
      file: "bindings.yaml",
      at: "triggers.0.answers.shows.0.structure",
      message: 'unknown structure "U"',
    },
    {
      file: "bindings.yaml",
      at: "triggers.0.interface",
      message: 'unknown interface "j"',
    },
    {
      file: "bindings.yaml",
      at: "triggers.0.operation",
      message: 'unknown operation "g"',
    },
  ]);
});

test("a trigger sending what the operation does not take, or where the request has no place", () => {
  expect(
    problemsOf({
      "bindings.yaml": `
triggers:
  - trigger: t
    interface: i
    operation: f
    sends: {a: [path, b], n: [query, q], m: [body, s, b, c], k: [body, s, z]}
    answers: {status: 200}
    refuses: {x: {status: 400}, w: {status: 409}}
`,
    }),
  ).toEqual([
    {
      file: "bindings.yaml",
      at: "triggers.0.refuses.w",
      message: '"w" is not a refusal of "f"',
    },
    {
      file: "bindings.yaml",
      at: "triggers.0.sends.a",
      message: 'the request of "i" has no path.b',
    },
    {
      file: "bindings.yaml",
      at: "triggers.0.sends.k",
      message: '"k" is not an input of "f"',
    },
    {
      file: "bindings.yaml",
      at: "triggers.0.sends.k",
      message: 'the request of "i" has no body.s.z',
    },
    {
      file: "bindings.yaml",
      at: "triggers.0.sends.m",
      message: '"m" is not an input of "f"',
    },
  ]);
});

test("a shown path the response does not have", () => {
  expect(
    problemsOf({
      "bindings.yaml": `
projections:
  - {projection: v, interface: i, shows: [{structure: S, at: [l, each, a]}, {structure: S, at: [s, each]}]}
triggers:
  - {trigger: t, interface: i, operation: f, answers: {status: 201, shows: [{structure: S, at: [s]}]}}
`,
    }),
  ).toEqual([
    {
      file: "bindings.yaml",
      at: "projections.0.shows.1.at",
      message: 'the response 200 of "i" has no s.each',
    },
    {
      file: "bindings.yaml",
      at: "triggers.0.answers.shows.0.at",
      message: '"i" has no response 201',
    },
  ]);
});

test("an operation naming a field, a fact or an input that does not exist", () => {
  expect(
    problemsOf({
      "operations/f.yaml": `
operation: f
takes:
  a: {field: [S, a], rules: [{rule: r, violates: format, otherwise: x}]}
  b: {field: [S, z]}
  c: {field: [S, t], rules: [{rule: r3, violates: max, otherwise: x}]}
requires: [{rule: r, fact: u, otherwise: y}]
answers: S
effects:
  - {rule: e1, when: u, then: {fact: {u: true}, field: [{of: [U, a], change: [plus, 1]}]}}
  - {rule: e2, when: [not, u], then: nothing-changes}
  - {rule: e3, when: [given, z], then: {says: s}}
`,
      "operations/h.yaml": "operation: k\ntakes: {}\nanswers: null\n",
    }),
  ).toEqual([
    {
      file: "operations/f.yaml",
      at: "effects.0.then.fact.u",
      message: 'unknown fact "u"',
    },
    {
      file: "operations/f.yaml",
      at: "effects.0.then.field.0.of",
      message: "unknown field U.a",
    },
    { file: "operations/f.yaml", at: "effects.0.when", message: 'unknown fact "u"' },
    { file: "operations/f.yaml", at: "effects.1.when", message: 'unknown fact "u"' },
    { file: "operations/f.yaml", at: "effects.2.when", message: '"z" is not an input' },
    { file: "operations/f.yaml", at: "requires.0.fact", message: 'unknown fact "u"' },
    {
      file: "operations/f.yaml",
      at: "requires.0.rule",
      message: 'rule "r" is declared twice',
    },
    {
      file: "operations/f.yaml",
      at: "takes.a.rules.0.violates",
      message: "S.a carries no format",
    },
    { file: "operations/f.yaml", at: "takes.b.field", message: "unknown field S.z" },
    {
      file: "operations/f.yaml",
      at: "takes.c.rules.0.violates",
      message: "S.t carries no max",
    },
    {
      file: "operations/h.yaml",
      at: "operation",
      message: 'the file is named "h", the operation "k"',
    },
  ]);
});

test("a fact naming a structure or a field that does not exist", () => {
  expect(
    problemsOf({
      "facts.yaml": `
- fact: p
  condition:
    - {structure: U, where: {a: [call, a]}, must-be: [exists]}
    - {structure: S, where: {z: [call, a]}, field: [t, b], must-be: [exists]}
    - {structure: S, where: {a: [call, a]}, field: [t, z], must-be: [eq, 1]}
`,
    }),
  ).toEqual([
    {
      file: "facts.yaml",
      at: "0.condition.0.structure",
      message: 'unknown structure "U"',
    },
    {
      file: "facts.yaml",
      at: "0.condition.1.where.z",
      message: '"z" is not a field of S',
    },
    { file: "facts.yaml", at: "0.condition.2.field", message: "S has no field t.z" },
  ]);
});

test("a scenario calling what does not exist, or not as the operation takes it", () => {
  expect(
    problemsOf({
      "scenarios/f/a.yaml": `
scenario: a
says: a
proves: [r, z]
arrange:
  - call: {operation: g}
act:
  call: {operation: f, with: {n: 1, m: 2}}
`,
      "scenarios/f/b.yaml": `
scenario: b
says: b
proves: [given]
act:
  call: {operation: f, with: {n: 1}}
`,
      "scenarios/g/c.yaml": `
scenario: c
says: c
proves: []
act:
  call: {operation: f, with: {a: s}}
`,
    }),
  ).toEqual([
    {
      file: "scenarios/f/a.yaml",
      at: "act.call.with",
      message: 'the required input "a" is missing',
    },
    {
      file: "scenarios/f/a.yaml",
      at: "act.call.with.m",
      message: '"m" is not an input of "f"',
    },
    {
      file: "scenarios/f/a.yaml",
      at: "arrange.0.call.operation",
      message: 'unknown operation "g"',
    },
    { file: "scenarios/f/a.yaml", at: "proves.1", message: '"z" is not a rule of "f"' },
    {
      file: "scenarios/g/c.yaml",
      at: "act.call.operation",
      message: 'the scenario is under "g", its act calls "f"',
    },
  ]);
});

test("a scenario calling an operation with no trigger, or with several", () => {
  expect(
    problemsOf({
      "operations/k.yaml": "operation: k\ntakes: {}\nanswers: null\n",
      "bindings.yaml": `
triggers:
  - {trigger: t, interface: i, operation: f, answers: {status: 200}}
  - {trigger: u, interface: i, operation: f, answers: {status: 200}}
`,
      "scenarios/f/a.yaml": `
scenario: a
says: a
proves: []
arrange:
  - call: {operation: k}
act:
  call: {operation: f, with: {a: s}}
`,
    }),
  ).toEqual([
    {
      file: "scenarios/f/a.yaml",
      at: "act.call.operation",
      message: '2 triggers call "f"',
    },
    {
      file: "scenarios/f/a.yaml",
      at: "arrange.0.call.operation",
      message: 'no trigger calls "k"',
    },
  ]);
});

test("the gaps of a small extraction", () => {
  expect(
    checkExtraction(
      extract({
        "structures.yaml": `
- structure: S
  identity: a
  fields:
    a: {type: string, min-length: 1}
    t: {structure: T}
    u: {structure: U, by: identity}
- structure: T
  identity: b
  fields: {b: {type: string}}
- structure: U
  identity: c
  fields: {c: {type: string}}
`,
        "facts.yaml": `
- fact: p
  condition: [{structure: S, where: {a: [call, a]}, must-be: [exists]}]
- fact: o
  condition: []
`,
        "operations/k.yaml": "operation: k\ntakes: {}\nanswers: null\n",
        "bindings.yaml": `
projections:
  - {projection: v, interface: i, shows: [{structure: S, at: [s]}]}
triggers:
  - {trigger: t, interface: i, operation: f, answers: {status: 200}}
`,
      }),
    ).gaps,
  ).toEqual([
    { kind: "fact-not-observable", name: "o", message: "its condition is empty" },
    { kind: "operation-without-trigger", name: "k", message: "no trigger calls it" },
    { kind: "rule-without-scenario", name: "f/given", message: "no scenario proves it" },
    { kind: "rule-without-scenario", name: "f/q", message: "no scenario proves it" },
    { kind: "rule-without-scenario", name: "f/r", message: "no scenario proves it" },
    { kind: "structure-not-shown", name: "U", message: "no projection shows it" },
  ]);
});
