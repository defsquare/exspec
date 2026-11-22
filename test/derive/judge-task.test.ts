import { expect, test } from "bun:test";
import { judgeTask } from "../../src/derive/judge-task.ts";
import type { Trigger } from "../../src/shapes/bindings.ts";
import type { Common, Evidence, Protocol, Rules } from "../../src/shapes/roles.ts";
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
  rules: [
    {
      rule: "signed-in",
      "applies-to": "every operation",
      fact: "the caller is signed in",
      otherwise: "unauthenticated",
      source: "S.java:1",
    },
  ],
  unsure: [],
};

const protocol: Protocol = {
  target: "t",
  "runs-with": [{ setting: "security is on", source: "c.yaml:1" }],
  rules: [
    {
      rule: "no-store",
      "applies-to": "every answer",
      fact: "the answer is not to be cached",
      source: "P.java:1",
    },
    {
      rule: "json-body",
      "applies-to": "every write",
      fact: "the body is a JSON object",
      otherwise: { refusal: "malformed", status: 400, body: "an error" },
      source: "P.java:2",
    },
  ],
  refuses: { unauthenticated: { status: 401, body: "nothing" } },
  errors: [],
  contract: [],
  unsure: [],
};

const trigger: Trigger = {
  trigger: "f",
  interface: "f",
  operation: "f",
  sends: {},
  answers: { status: 204, shows: [] },
  refuses: { "not-found": { status: 404, body: "empty" } },
  protocol: ["no-store"],
};

const rules: Rules = {
  operation: "f",
  takes: {},
  common: ["signed-in"],
  requires: [
    {
      rule: "exists",
      fact: "the item exists",
      otherwise: "not-found",
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
  expect(
    judgeTask({ bound, common, protocol, rules, trigger, recordings, states: [] }).text,
  ).toEqual(
    `The operation: f, DELETE /a/{id}

What the system under trial runs with:
- security is on

Every requirement of the operation:
${Bun.YAML.stringify(
  [
    {
      rule: "exists",
      fact: "the item exists",
      otherwise: "not-found",
    },
    {
      rule: "signed-in",
      "applies-to": "every operation",
      fact: "the caller is signed in",
      otherwise: "unauthenticated",
    },
  ],
  null,
  2,
).trimEnd()}

How this target answers the operation:
${Bun.YAML.stringify(
  {
    accepted: [204],
    refuses: {
      unauthenticated: { status: 401, body: "nothing" },
      "not-found": { status: 404, body: "empty" },
    },
  },
  null,
  2,
).trimEnd()}

The target's rules about its wire on this operation:
${Bun.YAML.stringify(
  [
    {
      rule: "no-store",
      "applies-to": "every answer",
      fact: "the answer is not to be cached",
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
        otherwise: "not-found",
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
  const before = judgeTask({
    bound,
    common,
    protocol,
    rules,
    trigger,
    recordings,
    states: [],
  }).of;
  const after = judgeTask({
    bound,
    common,
    protocol,
    rules,
    trigger,
    states: [],
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
  const before = judgeTask({
    bound,
    common,
    protocol,
    rules,
    trigger,
    recordings,
    states: [],
  }).of;
  const after = judgeTask({
    bound,
    common,
    protocol: {
      ...protocol,
      "runs-with": [{ setting: "security is off", source: "c.yaml:1" }],
    },
    rules,
    trigger,
    states: [],
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
  const a = judgeTask({
    bound,
    common,
    protocol,
    rules: on,
    trigger,
    recordings,
    states: [],
  });
  const b = judgeTask({
    bound,
    common,
    protocol,
    rules,
    trigger,
    recordings,
    states: [],
  });
  expect(a).toEqual(b);
});

test("a recording's hash does not move with the noise beside its evidence", () => {
  const withNoise = {
    ...evidence("removed", 204),
    noise: [{ at: ["exchanges", 0, "response", "body"], class: 1 }],
  };
  const before = judgeTask({
    bound,
    common,
    protocol,
    rules,
    trigger,
    recordings,
    states: [],
  }).of;
  const after = judgeTask({
    bound,
    common,
    protocol,
    rules,
    trigger,
    states: [],
    recordings: [
      { slug: "removed", evidence: withNoise },
      { slug: "exists", evidence: evidence("exists", 404) },
    ],
  }).of;
  expect(after).toEqual(before);
});

test("a recording of a rule of the target's wire is given that rule", () => {
  const { text } = judgeTask({
    bound,
    common,
    protocol,
    rules,
    trigger,
    states: [],
    recordings: [{ slug: "no-store", evidence: evidence("no-store", 204) }],
  });
  expect(text.split("---\n")[1]).toEqual(
    Bun.YAML.stringify(
      {
        recording: "no-store",
        rule: {
          protocol: {
            rule: "no-store",
            "applies-to": "every answer",
            fact: "the answer is not to be cached",
          },
        },
        exchanges: evidence("no-store", 204).exchanges,
      },
      null,
      2,
    ).trimEnd(),
  );
});

const yaml = (value: unknown) => Bun.YAML.stringify(value, null, 2).trimEnd();

const onState = (state: string, seen: string) =>
  judgeTask({
    bound,
    common,
    protocol,
    rules,
    trigger,
    recordings: [{ slug: "removed", evidence: evidence("removed", 204) }],
    states: [{ state, seen, slug: "removed" }],
  });

test("a state whose path is a recording is judged on it again, after its own part, with its sentence in place of the rule", () => {
  const [head = "", ...parts] = onState("s", "reading the a shows it").text.split(
    "\n\n---\n",
  );
  expect({ count: head.split("\n").at(-1), parts }).toEqual({
    count: "2 recordings, in this order:",
    parts: [
      yaml({
        recording: "removed",
        rule: { effect: { rule: "removed", says: "The item is gone." } },
        unsure: ["maybe 200"],
        exchanges: evidence("removed", 204).exchanges,
      }),
      yaml({
        recording: "state:s",
        state: "reading the a shows it",
        exchanges: evidence("removed", 204).exchanges,
      }),
    ],
  });
});

test("a state's hash changes with its sentence, not with its name, and moves no recording's", () => {
  const before = onState("s", "reading the a shows it");
  const renamed = onState("t", "reading the a shows it");
  const reworded = onState("s", "reading the a shows it gone");
  expect({
    renamed: renamed.ofStates.get("t") === before.ofStates.get("s"),
    reworded: reworded.ofStates.get("s") === before.ofStates.get("s"),
    recording: reworded.of.get("removed") === before.of.get("removed"),
  }).toEqual({ renamed: true, reworded: false, recording: true });
});
