import { expect, test } from "bun:test";
import { join } from "node:path";
import { readExtractionFiles } from "../../src/io/files.ts";
import { parseExtraction } from "../../src/shapes/extraction.ts";

const conduit = join(import.meta.dir, "../fixtures/conduit");

test("the fixture parses with no problem", async () => {
  expect(parseExtraction(await readExtractionFiles(conduit)).problems).toEqual([]);
});

test("an operation is read whole", async () => {
  const { extraction } = parseExtraction(await readExtractionFiles(conduit));
  expect(extraction.operations.find(({ path }) => path === "unfavorite-article")).toEqual(
    {
      path: "unfavorite-article",
      operation: {
        operation: "unfavorite-article",
        takes: { slug: { field: ["Article", "slug"] } },
        requires: [
          {
            rule: "signed-in",
            fact: "the caller is signed in",
            otherwise: "unauthenticated",
          },
          { rule: "exists", fact: "the article exists", otherwise: "not-found" },
        ],
        answers: "Article",
        effects: [
          {
            rule: "leaves-favorites",
            when: "the caller has favorited the article",
            then: {
              fact: { "the caller has favorited the article": false },
              field: [{ of: ["Article", "favoritesCount"], change: ["minus", 1] }],
            },
          },
          {
            rule: "nothing-to-leave",
            when: ["not", "the caller has favorited the article"],
            then: "nothing-changes",
          },
        ],
      },
    },
  );
});

test("a scenario that carries an answer is refused", () => {
  expect(
    parseExtraction([
      {
        path: "scenarios/f/a.yaml",
        text: [
          "scenario: a",
          "says: a",
          "proves: [r]",
          "act:",
          "  call: {operation: f}",
          "  response: {status: 200}",
        ].join("\n"),
      },
    ]),
  ).toEqual({
    extraction: {
      schemas: [],
      interfaces: [],
      structures: [],
      facts: [],
      operations: [],
      projections: [],
      triggers: [],
      scenarios: [],
      references: [],
    },
    problems: [
      { file: "scenarios/f/a.yaml", at: "act", message: 'Unrecognized key: "response"' },
    ],
  });
});

test("a file that is not YAML is a problem", () => {
  expect(parseExtraction([{ path: "facts.yaml", text: "a: [" }]).problems).toEqual([
    { file: "facts.yaml", at: "", message: "YAML Parse error: Unexpected token" },
  ]);
});

test("an unknown file is a problem, the target's own files are skipped", () => {
  expect(
    parseExtraction([
      { path: "a.yaml", text: "a: 1" },
      { path: "target/compose.yaml", text: "a: 1" },
      { path: "runs/r/f/a.yaml", text: "a: 1" },
    ]).problems,
  ).toEqual([
    { file: "a.yaml", at: "", message: "not a file of an extraction" },
    { file: "runs/r/f/a.yaml", at: "", message: "not a file of an extraction" },
  ]);
});

test("a reference is read with its answers and its noise", () => {
  expect(
    parseExtraction([
      {
        path: "references/f/a.yaml",
        text: [
          "scenario: a",
          "says: a",
          "proves: [r]",
          'run: {target: t, version: v, at: "2026-11-13T10:00:00.000Z", clock: null}',
          "arrange:",
          "  - call: {operation: g, caller: u}",
          "    response: {status: 204, body: null}",
          "act:",
          "  call: {operation: f, with: {a: 1}}",
          "  response: {status: 200, body: {a: t1, b: [1]}}",
          "noise:",
          "  - {at: [act, response, body, a], class: 1}",
        ].join("\n"),
      },
    ]).extraction.references,
  ).toEqual([
    {
      path: "f/a",
      reference: {
        scenario: "a",
        says: "a",
        proves: ["r"],
        run: { target: "t", version: "v", at: "2026-11-13T10:00:00.000Z", clock: null },
        arrange: [
          {
            call: { operation: "g", with: {}, caller: "u" },
            response: { status: 204, body: null },
          },
        ],
        act: {
          call: { operation: "f", with: { a: 1 } },
          response: { status: 200, body: { a: "t1", b: [1] } },
        },
        noise: [{ at: ["act", "response", "body", "a"], class: 1 }],
      },
    },
  ]);
});

test("a reference without its answers is refused", () => {
  expect(
    parseExtraction([
      {
        path: "references/f/a.yaml",
        text: [
          "scenario: a",
          "says: a",
          "proves: [r]",
          "run: {target: t, version: v, at: x, clock: null}",
          "act: {call: {operation: f}}",
          "noise: []",
        ].join("\n"),
      },
    ]).problems,
  ).toEqual([
    {
      file: "references/f/a.yaml",
      at: "arrange",
      message: "Invalid input: expected array, received undefined",
    },
    {
      file: "references/f/a.yaml",
      at: "act.response",
      message: "Invalid input: expected object, received undefined",
    },
  ]);
});
