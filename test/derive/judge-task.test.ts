import { expect, test } from "bun:test";
import { judgeTask } from "../../src/derive/judge-task.ts";
import type { Common, Evidence, Rules } from "../../src/shapes/roles.ts";
import type { Interface } from "../../src/shapes/target.ts";

const bound: Interface = {
  interface: "f",
  method: "delete",
  pattern: "/a/{id}",
  request: {},
  responses: {},
};

const common: Common = {
  target: "t",
  "runs-with": [{ setting: "security is on", source: "c.yaml:1" }],
  rules: [
    {
      rule: "signed-in",
      "applies-to": "every operation",
      fact: "the caller is signed in",
      otherwise: { refusal: "unauthenticated", status: 401, body: "nothing" },
      source: "S.java:1",
    },
  ],
  errors: [],
  contract: [],
  unsure: [],
};

const rules: Rules = {
  operation: "f",
  takes: {},
  common: ["signed-in"],
  requires: [
    {
      rule: "exists",
      fact: "the item exists",
      otherwise: { refusal: "not-found", status: 404, body: "empty" },
      source: "F.java:2",
    },
  ],
  effects: [{ rule: "removed", says: "The item is gone.", source: "F.java:3" }],
  answers: { says: "204", structure: null },
  unsure: [{ rule: "removed", what: "maybe 200" }],
};

const evidence = (rule: string, status: number): Evidence => ({
  rule,
  run: { target: "t", version: "v", at: "2026-11-13T10:00:00.000Z", clock: null },
  exchanges: [
    {
      when: "call",
      as: "ann",
      request: { method: "delete", path: "/a/1" },
      response: { status, body: null },
    },
  ],
});

const recordings = [
  { slug: "removed", evidence: evidence("removed", 204) },
  { slug: "exists", evidence: evidence("exists", 404) },
];

test("the judge's task: the operation, its requirements once, each recording in slug order", () => {
  expect(judgeTask({ bound, common, rules, recordings }).text).toEqual(
    `The operation: f, DELETE /a/{id}

What the system under trial runs with:
- security is on

Every requirement of the operation:
${Bun.YAML.stringify(
  [
    {
      rule: "exists",
      fact: "the item exists",
      otherwise: { refusal: "not-found", status: 404, body: "empty" },
    },
    {
      rule: "signed-in",
      "applies-to": "every operation",
      fact: "the caller is signed in",
      otherwise: { refusal: "unauthenticated", status: 401, body: "nothing" },
    },
  ],
  null,
  2,
).trimEnd()}

2 recordings, in this order:

---
${Bun.YAML.stringify(
  {
    recording: "exists",
    rule: {
      requirement: {
        rule: "exists",
        fact: "the item exists",
        otherwise: { refusal: "not-found", status: 404, body: "empty" },
      },
    },
    exchanges: evidence("exists", 404).exchanges,
  },
  null,
  2,
).trimEnd()}

---
${Bun.YAML.stringify(
  {
    recording: "removed",
    rule: { effect: { rule: "removed", says: "The item is gone." } },
    unsure: ["maybe 200"],
    exchanges: evidence("removed", 204).exchanges,
  },
  null,
  2,
).trimEnd()}`,
  );
});

test("a recording's hash changes with its own part only", () => {
  const before = judgeTask({ bound, common, rules, recordings }).of;
  const after = judgeTask({
    bound,
    common,
    rules,
    recordings: [
      { slug: "removed", evidence: evidence("removed", 204) },
      { slug: "exists", evidence: evidence("exists", 400) },
    ],
  }).of;
  expect({
    removed: after.get("removed") === before.get("removed"),
    exists: after.get("exists") === before.get("exists"),
  }).toEqual({ removed: true, exists: false });
});

test("every recording's hash changes with what all of them are judged with", () => {
  const before = judgeTask({ bound, common, rules, recordings }).of;
  const after = judgeTask({
    bound,
    common: {
      ...common,
      "runs-with": [{ setting: "security is off", source: "c.yaml:1" }],
    },
    rules,
    recordings,
  }).of;
  expect({
    removed: after.get("removed") === before.get("removed"),
    exists: after.get("exists") === before.get("exists"),
  }).toEqual({ removed: false, exists: false });
});

test("the judge is given nothing of the input a requirement is on", () => {
  const on: Rules = {
    ...rules,
    takes: { a: { says: "s" } },
    requires: rules.requires.map((r) => ({ ...r, on: "a" })),
  };
  const a = judgeTask({ bound, common, rules: on, recordings });
  const b = judgeTask({ bound, common, rules, recordings });
  expect(a).toEqual(b);
});

test("a recording's hash does not move with the noise beside its evidence", () => {
  const withNoise = {
    ...evidence("removed", 204),
    noise: [{ at: ["exchanges", 0, "response", "body"], class: 1 }],
  };
  const before = judgeTask({ bound, common, rules, recordings }).of;
  const after = judgeTask({
    bound,
    common,
    rules,
    recordings: [
      { slug: "removed", evidence: withNoise },
      { slug: "exists", evidence: evidence("exists", 404) },
    ],
  }).of;
  expect(after).toEqual(before);
});
