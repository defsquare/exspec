import { expect, test } from "bun:test";
import { readingsToTake } from "../../src/derive/reading.ts";
import { judgeScenario } from "../../src/derive/verdict.ts";
import { type Extraction, parseExtraction } from "../../src/shapes/extraction.ts";
import type {
  Look,
  Noise,
  PlayedScenario,
  Reading,
  ReadingEntry,
  TargetResponse,
} from "../../src/shapes/scenario.ts";
import { scenarioSchema } from "../../src/shapes/scenario.ts";
import { target } from "../files.ts";
import { run } from "../played.ts";

const files: Readonly<Record<string, string>> = {
  "target.yaml": target,
  "interfaces.yaml": `
interfaces:
  - {interface: i, method: post, pattern: "/f/{a}", request: {path: {a: string}, query: {z: [optional, string]}}, responses: {200: {body: any}}}
  - {interface: j, method: get, pattern: "/s/{a}", request: {path: {a: string}}, responses: {200: {body: any}}}
  - {interface: k, method: post, pattern: "/g", request: {body: {e: string, p: string, h: string}}, responses: {200: {body: any}}}
`,
  "structures.yaml": `
- structure: S
  identity: a
  fields: {a: {type: string}, b: {type: boolean}, c: {type: int}, d: {type: instant}}
- structure: U
  identity: e
  fields: {e: {type: string, format: email}, p: {type: string, min-length: 3}, h: {type: string, format: uri}}
`,
  "facts.yaml": `
- {fact: p, condition: [{caller: signed-in}]}
- {fact: q, condition: [{structure: S, where: {a: [call, a]}, must-be: [exists]}]}
- {fact: r, condition: [{structure: S, where: {a: [call, a]}, field: [b], must-be: [eq, true]}]}
- {fact: o, condition: []}
`,
  "operations/f.yaml": `
operation: f
takes: {a: {field: [S, a]}, z: {type: string, optional: true}}
requires:
  - {rule: signed-in, fact: p, otherwise: x}
  - {rule: exists, fact: q, otherwise: y}
answers: S
effects:
  - {rule: e1, when: r, then: {fact: {r: false}, field: [{of: [S, c], change: [minus, 1]}]}}
  - {rule: e2, when: [not, r], then: nothing-changes}
  - {rule: e3, then: {says: "s"}}
  - {rule: e4, when: [given, z], then: {field: [{of: [S, c], change: [set, 0]}]}}
`,
  "operations/g.yaml": `
operation: g
takes:
  e:
    field: [U, e]
    rules:
      - {rule: e-given, violates: required, otherwise: incomplete}
      - {rule: e-shaped, violates: format, otherwise: malformed}
  p:
    field: [U, p]
    rules: [{rule: p-length, violates: min-length, otherwise: short}]
  h:
    field: [U, h]
    optional: true
    rules: [{rule: h-shaped, violates: format, otherwise: malformed}]
requires: [{rule: free, fact: o, otherwise: taken}]
answers: U
effects: [{rule: creates, then: {says: "s"}}]
`,
  "bindings.yaml": `
projections:
  - {projection: v, interface: j, shows: [{structure: S, at: [s]}], locates: {a: [path, a]}, absent: 404}
triggers:
  - {trigger: t, interface: i, operation: f, sends: {a: [path, a], z: [query, z]}, answers: {status: 200, shows: [{structure: S, at: [s]}]}, refuses: {x: {status: 401}, y: {status: 401}}}
  - {trigger: u, interface: k, operation: g, sends: {e: [body, e], p: [body, p], h: [body, h]}, answers: {status: 200}, refuses: {incomplete: {status: 400}, malformed: {status: 400}, short: {status: 400}, taken: {status: 400}}}
`,
};

function extract(overrides: Readonly<Record<string, string>> = {}): Extraction {
  return parseExtraction(
    Object.entries({ ...files, ...overrides }).map(([path, text]) => ({ path, text })),
  ).extraction;
}

const bindings = (refuses: string) =>
  files["bindings.yaml"]?.replace("{x: {status: 401}, y: {status: 401}}", refuses) ?? "";

const instance = (b: boolean, c: number): TargetResponse => ({
  status: 200,
  body: { s: { a: "x", b, c } },
});
const absent: TargetResponse = { status: 404, body: null };

const looks: readonly Look[] = [
  { fact: "q" },
  { fact: "r" },
  { shows: { structure: "S", where: { a: ["call", "a"] }, field: ["c"] } },
];

const readings = (
  before: ReadingEntry,
  after: ReadingEntry,
  as: string | null = "u",
): readonly Reading[] => [
  { of: { fact: "p" }, as, before: [], after: [] },
  ...looks.map((of) => ({ of, as, before: [before], after: [after] })),
];

function copy({
  proves,
  status,
  body = { s: {} },
  read,
  operation = "f",
  given = { a: "x" },
  caller = "u",
}: {
  proves: readonly string[];
  status: number;
  body?: TargetResponse["body"];
  read?: readonly Reading[] | undefined;
  operation?: string;
  given?: Readonly<Record<string, string>>;
  caller?: string | null;
}): PlayedScenario {
  return {
    scenario: "s",
    says: "s",
    proves,
    run,
    arrange: [],
    act: {
      call: { operation, with: given, ...(caller === null ? {} : { caller }) },
      response: { status, body },
    },
    ...(read === undefined ? {} : { readings: read }),
  };
}

const judged = (
  played: PlayedScenario,
  extraction = extract(),
  noise: readonly Noise[] = [],
) => judgeScenario({ played, noise, extraction });

const rulesOf = (played: PlayedScenario, extraction = extract()) =>
  judged(played, extraction)?.rules;

test("an unknown instance, nobody signed in: the other refusal answering the same status makes it ambiguous", () => {
  const played = copy({
    proves: ["exists"],
    status: 401,
    caller: null,
    read: readings(absent, absent, null),
  });
  expect([
    rulesOf(played),
    rulesOf(
      played,
      extract({ "bindings.yaml": bindings("{x: {status: 403}, y: {status: 401}}") }),
    ),
  ]).toEqual([
    [{ rule: "exists", verdict: "ambiguous", reason: "signed-in: the fact was false" }],
    [{ rule: "exists", verdict: "verified" }],
  ]);
});

test("a requirement: verified, refuted, not exercised, not judged", () => {
  expect([
    rulesOf(copy({ proves: ["exists"], status: 401, read: readings(absent, absent) })),
    rulesOf(copy({ proves: ["exists"], status: 200, read: readings(absent, absent) })),
    rulesOf(
      copy({
        proves: ["exists"],
        status: 200,
        read: readings(instance(true, 1), instance(true, 1)),
      }),
    ),
    rulesOf(
      copy({
        proves: ["exists"],
        status: 401,
        read: readings({ status: 401, body: null }, absent),
      }),
    ),
    rulesOf(copy({ proves: ["exists"], status: 401 })),
    rulesOf(copy({ proves: ["exists"], status: 500, read: readings(absent, absent) })),
    rulesOf(copy({ proves: ["signed-in"], status: 401, caller: null })),
  ]).toEqual([
    [{ rule: "exists", verdict: "verified" }],
    [{ rule: "exists", verdict: "refuted", reason: "accepted where the fact was false" }],
    [{ rule: "exists", verdict: "not-exercised", reason: "the fact held before" }],
    [{ rule: "exists", verdict: "unjudged", reason: "the reading answered 401" }],
    [
      {
        rule: "exists",
        verdict: "unjudged",
        reason: "it was played before readings were taken",
      },
    ],
    [{ rule: "exists", verdict: "unjudged", reason: "answered 500" }],
    [
      {
        rule: "signed-in",
        verdict: "ambiguous",
        reason: "exists: the fact is unknown",
      },
    ],
  ]);
});

test("an operation like register: what is read, then its input rule is ambiguous", () => {
  const scenario = scenarioSchema.parse({
    scenario: "s",
    says: "s",
    proves: ["p-length"],
    act: { call: { operation: "g", with: { e: "e@x.test", p: "ab" } } },
  });
  const extraction = extract();
  const read = readingsToTake({ scenario, extraction });
  expect({
    read,
    rules: rulesOf(
      copy({
        proves: ["p-length"],
        status: 400,
        operation: "g",
        given: { e: "e@x.test", p: "ab" },
        caller: null,
        read: read.map(({ of, as }) => ({ of, as, before: [], after: [] })),
      }),
      extraction,
    ),
  }).toEqual({
    read: [{ of: { fact: "o" }, as: null }],
    rules: [
      { rule: "p-length", verdict: "ambiguous", reason: "free: the fact is unknown" },
    ],
  });
});

test("an input rule: verified, refuted, not exercised, ambiguous, not judged", () => {
  const extraction = extract({
    "bindings.yaml":
      files["bindings.yaml"]?.replace("taken: {status: 400}", "taken: {status: 409}") ??
      "",
  });
  const g = (proves: string, status: number, given: Record<string, string>) =>
    rulesOf(
      copy({
        proves: [proves],
        status,
        operation: "g",
        given,
        caller: null,
        read: [{ of: { fact: "o" }, as: null, before: [], after: [] }],
      }),
      extraction,
    );
  expect([
    g("p-length", 400, { e: "e@x.test", p: "ab" }),
    g("p-length", 200, { e: "e@x.test", p: "ab" }),
    g("p-length", 400, { e: "e@x.test", p: "abc" }),
    g("p-length", 400, { e: "nope", p: "ab" }),
    g("e-given", 400, { p: "abc" }),
    g("h-shaped", 400, { e: "e@x.test", p: "abc", h: "h" }),
  ]).toEqual([
    [{ rule: "p-length", verdict: "verified" }],
    [
      {
        rule: "p-length",
        verdict: "refuted",
        reason: "accepted with its input violated",
      },
    ],
    [{ rule: "p-length", verdict: "not-exercised", reason: "its input is not violated" }],
    [
      {
        rule: "p-length",
        verdict: "ambiguous",
        reason: "e-shaped: its input is violated",
      },
    ],
    [{ rule: "e-given", verdict: "verified" }],
    [{ rule: "h-shaped", verdict: "unjudged", reason: "format is not computed" }],
  ]);
});

test("an effect: verified, refuted, not exercised, not judged", () => {
  const effect = (
    proves: string,
    status: number,
    read?: readonly Reading[],
    given: Record<string, string> = { a: "x" },
  ) => rulesOf(copy({ proves: [proves], status, read, given }));
  expect([
    effect("e1", 200, readings(instance(true, 2), instance(false, 1))),
    effect("e1", 200, readings(instance(true, 2), instance(false, 2))),
    effect("e1", 200, readings(instance(true, 2), instance(true, 1))),
    effect("e1", 401, readings(instance(true, 2), instance(true, 2))),
    effect("e1", 200, readings(instance(false, 2), instance(false, 2))),
    effect("e1", 200, readings({ status: 401, body: null }, instance(false, 1))),
    effect("e1", 200),
    effect("e2", 200, readings(instance(false, 2), instance(false, 2))),
    effect("e2", 200, readings(instance(false, 2), instance(false, 3))),
    effect("e3", 200, readings(instance(false, 2), instance(false, 2))),
    effect("e4", 200, readings(instance(false, 2), instance(false, 0))),
    effect("e4", 200, readings(instance(false, 2), instance(false, 0)), {
      a: "x",
      z: "z",
    }),
  ]).toEqual([
    [{ rule: "e1", verdict: "verified" }],
    [{ rule: "e1", verdict: "refuted", reason: "S.c went from 2 to 2" }],
    [{ rule: "e1", verdict: "refuted", reason: '"r" is true after' }],
    [{ rule: "e1", verdict: "not-exercised", reason: "refused" }],
    [
      {
        rule: "e1",
        verdict: "not-exercised",
        reason: "its condition did not hold before",
      },
    ],
    [{ rule: "e1", verdict: "unjudged", reason: "the reading answered 401" }],
    [
      {
        rule: "e1",
        verdict: "unjudged",
        reason: "it was played before readings were taken",
      },
    ],
    [{ rule: "e2", verdict: "verified" }],
    [{ rule: "e2", verdict: "refuted", reason: "something read changed" }],
    [{ rule: "e3", verdict: "unjudged", reason: "declared in a sentence" }],
    [{ rule: "e4", verdict: "not-exercised", reason: '"z" is not given' }],
    [{ rule: "e4", verdict: "verified" }],
  ]);
});

test("nothing changes on a reference whose readings hold a date noisy in one class before and after", () => {
  const dated = (d: string): TargetResponse => ({
    status: 200,
    body: { s: { a: "x", b: false, c: 1, d } },
  });
  const played = copy({
    proves: ["e2"],
    status: 200,
    read: readings(dated("t1"), dated("t1")),
  });
  const noiseOf = (after: number): readonly Noise[] =>
    [1, 2, 3].flatMap((i) => [
      { at: ["readings", i, "before", 0, "body", "s", "d"], class: 1 },
      { at: ["readings", i, "after", 0, "body", "s", "d"], class: after },
    ]);
  expect([
    judged(played, extract(), noiseOf(1))?.rules,
    judged(played, extract(), noiseOf(2))?.rules,
  ]).toEqual([
    [{ rule: "e2", verdict: "verified" }],
    [{ rule: "e2", verdict: "refuted", reason: "something read changed" }],
  ]);
});

test("the binding: what an accepted call shows, the status of the refusal proved", () => {
  const binding = (played: PlayedScenario, extraction = extract()) =>
    judged(played, extraction)?.binding;
  const split = extract({
    "bindings.yaml": bindings("{x: {status: 401}, y: {status: 404}}"),
  });
  expect([
    binding(copy({ proves: ["e3"], status: 200 })),
    binding(copy({ proves: ["e3"], status: 200, body: { t: {} } })),
    binding(copy({ proves: ["exists"], status: 401 }), split),
    binding(copy({ proves: ["exists"], status: 404 }), split),
    binding(copy({ proves: ["e3"], status: 401 })),
    binding(copy({ proves: ["e3"], status: 500 })),
  ]).toEqual([
    { verdict: "verified" },
    { verdict: "refuted", expected: "S shown at s", observed: 200 },
    { verdict: "refuted", expected: "y declared 404", observed: 401 },
    { verdict: "verified" },
    { verdict: "not-exercised" },
    { verdict: "refuted", observed: 500 },
  ]);
});

const withH = extract({
  "facts.yaml": `${files["facts.yaml"]}- {fact: k, condition: [{structure: S, where: {a: [call, a]}, field: [b], must-be: [exists]}]}\n`,
  "operations/h.yaml": `
operation: h
takes: {a: {field: [S, a]}}
requires:
  - {rule: signed-in, fact: p, otherwise: x}
  - {rule: r-held, fact: r, otherwise: y}
  - {rule: k-held, fact: k, otherwise: y}
answers: null
effects: [{rule: n, then: nothing-changes}]
`,
  "bindings.yaml": `${files["bindings.yaml"]}  - {trigger: th, interface: i, operation: h, sends: {a: [path, a]}, answers: {status: 200}, refuses: {x: {status: 403}, y: {status: 401}}}\n`,
});

const onH = (proves: string, status: number, read: readonly Reading[]) =>
  rulesOf(copy({ proves: [proves], status, operation: "h", read }), withH);

test("nothing changes is not judged when nothing readable was read", () => {
  const signedIn: Reading = { of: { fact: "p" }, as: "u", before: [], after: [] };
  const forbidden: TargetResponse = { status: 401, body: null };
  expect([
    onH("n", 200, [signedIn]),
    onH("n", 200, [
      signedIn,
      { of: { fact: "r" }, as: "u", before: [forbidden], after: [forbidden] },
    ]),
  ]).toEqual([
    [{ rule: "n", verdict: "unjudged", reason: "nothing readable was read" }],
    [{ rule: "n", verdict: "unjudged", reason: 'not readable: "r"' }],
  ]);
});

test("a requirement whose value is not in a successful answer is not judged", () => {
  const without: TargetResponse = { status: 200, body: { s: { a: "x" } } };
  const read = (fact: string): readonly Reading[] => [
    { of: { fact: "p" }, as: "u", before: [], after: [] },
    { of: { fact }, as: "u", before: [without], after: [without] },
  ];
  expect([onH("r-held", 401, read("r")), onH("k-held", 401, read("k"))]).toEqual([
    [{ rule: "r-held", verdict: "unjudged", reason: "the value is not in the answer" }],
    [{ rule: "k-held", verdict: "unjudged", reason: "the value is not in the answer" }],
  ]);
});

test("set on a value missing after is not judged", () => {
  expect(
    rulesOf(
      copy({
        proves: ["e4"],
        status: 200,
        given: { a: "x", z: "z" },
        read: readings(instance(false, 2), {
          status: 200,
          body: { s: { a: "x", b: false } },
        }),
      }),
    ),
  ).toEqual([
    { rule: "e4", verdict: "unjudged", reason: "the value is not in the answer" },
  ]);
});

test("the binding of a refusal is judged on the proved rules that refused", () => {
  expect(
    judged(
      copy({
        proves: ["signed-in", "exists"],
        status: 404,
        read: readings(absent, absent),
      }),
      extract({ "bindings.yaml": bindings("{x: {status: 401}, y: {status: 404}}") }),
    ),
  ).toEqual({
    rules: [
      { rule: "signed-in", verdict: "not-exercised", reason: "the fact held before" },
      { rule: "exists", verdict: "verified" },
    ],
    binding: { verdict: "verified" },
  });
});

test("a noisy place above the value read: arithmetic is not judged, nothing-changes compares classes", () => {
  const above = (after: number): readonly Noise[] =>
    [1, 2, 3].flatMap((i) => [
      { at: ["readings", i, "before", 0, "body", "s"], class: 1 },
      { at: ["readings", i, "after", 0, "body", "s"], class: after },
    ]);
  const e1 = copy({
    proves: ["e1"],
    status: 200,
    read: readings(instance(true, 2), instance(false, 1)),
  });
  const e2 = copy({
    proves: ["e2"],
    status: 200,
    read: readings(instance(false, 2), instance(false, 3)),
  });
  expect([
    judged(e1, extract(), above(1))?.rules,
    judged(e2, extract(), above(1))?.rules,
    judged(e2, extract(), above(2))?.rules,
  ]).toEqual([
    [{ rule: "e1", verdict: "unjudged", reason: "S.c is noise" }],
    [{ rule: "e2", verdict: "verified" }],
    [{ rule: "e2", verdict: "refuted", reason: "something read changed" }],
  ]);
});
