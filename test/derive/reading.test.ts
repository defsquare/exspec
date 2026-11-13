import { expect, test } from "bun:test";
import { readingsToTake, requestsOfReading } from "../../src/derive/reading.ts";
import { truthOf } from "../../src/derive/truth.ts";
import { type Extraction, parseExtraction } from "../../src/shapes/extraction.ts";
import { scenarioSchema } from "../../src/shapes/scenario.ts";
import { interfaces, target } from "../files.ts";

const files: Readonly<Record<string, string>> = {
  "target.yaml": target,
  "interfaces.yaml": interfaces,
  "structures.yaml": `
- structure: S
  identity: a
  fields: {a: {type: string}, b: {type: boolean}, c: {type: int}}
`,
  "facts.yaml": `
- {fact: p, condition: [{caller: signed-in}]}
- {fact: q, condition: [{structure: S, where: {a: [call, a]}, must-be: [exists]}]}
- {fact: r, condition: [{structure: S, where: {a: [call, a]}, field: [b], must-be: [eq, true]}]}
- {fact: w, condition: [{structure: S, where: {a: [call, z]}, must-be: [exists]}]}
- {fact: pq, condition: [{caller: signed-in}, {structure: S, where: {a: [call, a]}, must-be: [exists]}]}
- {fact: o, condition: []}
`,
  "operations/f.yaml": `
operation: f
takes: {a: {field: [S, a]}}
requires:
  - {rule: signed-in, fact: p, otherwise: unauthenticated}
  - {rule: exists, fact: q, otherwise: missing}
answers: S
effects:
  - {rule: e1, when: r, then: {fact: {r: false}, field: [{of: [S, c], change: [minus, 1]}]}}
  - {rule: e2, when: [not, r], then: nothing-changes}
  - {rule: e3, when: [given, a], then: {says: "a"}}
`,
  "bindings.yaml": `
projections:
  - {projection: l, interface: i, shows: [{structure: S, at: [l, each]}], locates: {a: [path, a]}}
  - {projection: v, interface: i, shows: [{structure: S, at: [s]}], locates: {a: [path, a]}, absent: 404}
triggers:
  - {trigger: t, interface: i, operation: f, sends: {a: [path, a]}, answers: {status: 200}, refuses: {missing: {status: 404}, unauthenticated: {status: 401}}}
`,
};

const extraction: Extraction = parseExtraction(
  Object.entries(files).map(([path, text]) => ({ path, text })),
).extraction;

const scenario = scenarioSchema.parse(
  Bun.YAML.parse(`
scenario: s
says: s
proves: [e1]
assert:
  - {fact: r, as: v}
  - {shows: {structure: S, where: {a: [call, a]}, field: [c]}}
  - {fact: q}
  - {fact: q, as: null}
act: {call: {operation: f, with: {a: x}, caller: u}}
`),
);

const credentials = { u: { Authorization: "k" } };

test("the facts the operation cites, the fields its effects change, then what the scenario asks for", () => {
  expect(readingsToTake({ scenario, extraction })).toEqual([
    { of: { fact: "p" }, as: "u" },
    { of: { fact: "q" }, as: "u" },
    { of: { fact: "r" }, as: "u" },
    {
      of: { shows: { structure: "S", where: { a: ["call", "a"] }, field: ["c"] } },
      as: "u",
    },
    { of: { fact: "r" }, as: "v" },
    { of: { fact: "q" }, as: null },
  ]);
});

test("a reading is one request per term that reads, as its actor, or why none can be made", () => {
  const call = scenario.act.call;
  const read = (of: Parameters<typeof requestsOfReading>[0]["of"], as: string | null) =>
    requestsOfReading({ of, as, call, extraction, credentials });
  expect([
    read({ fact: "p" }, "u"),
    read({ fact: "q" }, "u"),
    read({ shows: { structure: "S", where: { a: 4 }, field: ["c"] } }, null),
    read({ fact: "q" }, "z"),
    read({ shows: { structure: "S", where: { b: true }, field: ["c"] } }, "u"),
    read({ fact: "w" }, "u"),
  ]).toEqual([
    [],
    [{ method: "get", url: "http://h/f/x", headers: { Authorization: "k" } }],
    [{ method: "get", url: "http://h/f/4", headers: {} }],
    [{ unreadable: 'no credentials for "z"' }],
    [{ unreadable: "no projection locates S by b" }],
    [{ unreadable: 'the input "z" is not in the call' }],
  ]);
});

test("a fact is true, false or unknown from what its terms read", () => {
  const { facts, projections } = extraction;
  const truth = (
    name: string,
    entries: Parameters<typeof truthOf>[0]["entries"],
    as: string | null = "u",
  ) =>
    truthOf({ fact: facts.find(({ fact }) => fact === name), entries, as, projections });
  expect([
    truth("p", []),
    truth("p", [], null),
    truth("q", [{ status: 200, body: { s: { a: "x" } } }]),
    truth("q", [{ status: 404, body: null }]),
    truth("q", [{ status: 401, body: null }]),
    truth("q", [{ unreadable: "u" }]),
    truth("r", [{ status: 200, body: { s: { a: "x", b: true } } }]),
    truth("r", [{ status: 200, body: { s: { a: "x", b: false } } }]),
    truth("r", [{ status: 404, body: null }]),
    truth("pq", [{ status: 401, body: null }], null),
    truth("pq", [{ status: 401, body: null }]),
    truth("o", []),
  ]).toEqual([
    true,
    false,
    true,
    false,
    "unknown",
    "unknown",
    true,
    false,
    false,
    false,
    "unknown",
    "unknown",
  ]);
});
