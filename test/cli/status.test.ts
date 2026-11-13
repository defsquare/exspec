import { expect, test } from "bun:test";
import { status } from "../../src/cli/status.ts";
import { verdicts } from "../../src/cli/verdicts.ts";
import type { Event } from "../../src/shapes/event.ts";
import { bindings, facts, interfaces, operation, reference, target } from "../files.ts";

const files = [
  {
    path: "structures.yaml",
    text: "- {structure: S, identity: a, fields: {a: {type: string}}}",
  },
  { path: "facts.yaml", text: "- {fact: p, condition: [{caller: signed-in}]}" },
  { path: "notes.yaml", text: "a: 1" },
];

test("status of a directory with no extraction", async () => {
  expect(
    await Array.fromAsync(
      status({ dir: "/abs/dir", exists: async () => false, readFiles: async () => [] }),
    ),
  ).toEqual([
    { type: "command-started", command: "status", dir: "/abs/dir" },
    { type: "extraction-not-found", dir: "/abs/dir", expected: "/abs/dir/specimen" },
    { type: "command-finished", command: "status", ok: false },
  ]);
});

test("status of a directory with an extraction", async () => {
  expect(
    await Array.fromAsync(
      status({ dir: "/abs/dir", exists: async () => true, readFiles: async () => files }),
    ),
  ).toEqual<Event[]>([
    { type: "command-started", command: "status", dir: "/abs/dir" },
    {
      type: "extraction-counted",
      counts: {
        interfaces: 0,
        structures: 1,
        facts: 1,
        operations: 0,
        rules: 0,
        projections: 0,
        triggers: 0,
        scenarios: 0,
        references: 0,
      },
    },
    {
      type: "extraction-phases",
      phases: {
        target: "to-do",
        interfaces: "to-do",
        specification: "to-do",
        scenarios: "to-do",
        record: "to-do",
      },
    },
    {
      type: "extraction-judged",
      rules: { verified: 0, refuted: 0, "declared-only": 0 },
      bindings: { verified: 0, refuted: 0, "declared-only": 0 },
    },
    { type: "not-observed", what: "side-effects" },
    {
      type: "problem",
      file: "notes.yaml",
      at: "",
      message: "not a file of an extraction",
    },
    {
      type: "gap",
      kind: "structure-not-shown",
      name: "S",
      message: "no projection shows it",
    },
    { type: "command-finished", command: "status", ok: false },
  ]);
});

const judged = [
  { path: "target.yaml", text: target },
  { path: "interfaces.yaml", text: interfaces },
  { path: "facts.yaml", text: facts },
  { path: "operations/f.yaml", text: operation },
  { path: "bindings.yaml", text: bindings },
  { path: "references/f/a.yaml", text: reference },
];

const examined = (run: typeof status) =>
  Array.fromAsync(
    run({ dir: "/abs/dir", exists: async () => true, readFiles: async () => judged }),
  );

const declaredOnly: Event[] = [
  {
    type: "rule-judged",
    operation: "f",
    rule: "q",
    provenance: "declared-only",
    reason: "no scenario proves it",
    by: [],
  },
  {
    type: "rule-judged",
    operation: "f",
    rule: "r",
    provenance: "declared-only",
    by: [
      {
        scenario: "f/a",
        verdict: "unjudged",
        reason: "it was played before readings were taken",
      },
    ],
  },
];

test("status counts the claims by provenance and shows those not verified", async () => {
  expect(
    (await examined(status)).filter(({ type }) =>
      ["extraction-judged", "rule-judged", "binding-judged", "not-observed"].includes(
        type,
      ),
    ),
  ).toEqual<Event[]>([
    {
      type: "extraction-judged",
      rules: { verified: 0, refuted: 0, "declared-only": 2 },
      bindings: { verified: 1, refuted: 0, "declared-only": 0 },
    },
    ...declaredOnly,
    { type: "not-observed", what: "side-effects" },
  ]);
});

test("verdicts shows every claim, verified ones included", async () => {
  expect(await examined(verdicts)).toEqual<Event[]>([
    { type: "command-started", command: "verdicts", dir: "/abs/dir" },
    ...declaredOnly,
    {
      type: "binding-judged",
      trigger: "t",
      provenance: "verified",
      by: [{ scenario: "f/a", verdict: "verified" }],
    },
    { type: "command-finished", command: "verdicts", ok: true },
  ]);
});
