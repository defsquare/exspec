import { expect, test } from "bun:test";
import { evidenceAt, judgeTaskOf } from "../../src/derive/roles-files.ts";
import { type Left, leftOf } from "../../src/derive/roles-left.ts";
import {
  bound,
  declared,
  type Files,
  filesOf,
  hash,
  judgedAs,
  points,
  stateHashIn,
} from "../roles-left-fixture.ts";

const done = (
  left: Partial<{
    findings: readonly string[];
    scenarios: readonly string[];
    record: readonly string[];
    judge: readonly string[];
  }>,
): Left => ({
  structures: false,
  common: false,
  commonTrigger: false,
  states: false,
  interfaces: [
    {
      interface: "f",
      reading: "done",
      build: { findings: left.findings ?? [], scenarios: left.scenarios ?? [] },
      record: left.record ?? [],
      judge: left.judge ?? [],
    },
  ],
  providers: [],
});

const leftAt = (point: keyof typeof points) =>
  leftOf({ files: filesOf(points[point]), interfaces: [bound] });

test("with only the target and its interfaces declared, everything is left to read", () => {
  const files = Object.entries(declared).map(([path, text]) => ({ path, text }));
  expect(leftOf({ files, interfaces: [bound] })).toEqual({
    structures: true,
    common: true,
    commonTrigger: true,
    states: true,
    interfaces: [{ interface: "f", reading: "to-do" }],
    providers: [],
  });
});

test("a reading that passes with no scenario leaves the builder its check, nothing else", () => {
  expect(leftAt("no scenario")).toEqual(
    done({ findings: ['no scenario for the rule "exists"'] }),
  );
});

test("an evidence as written is left to record, then its reference to judge, then nothing", () => {
  expect({
    once: leftAt("played once"),
    reference: leftAt("a reference"),
    stale: leftAt("a stale judgement"),
    judged: leftAt("judged"),
  }).toEqual({
    once: done({ record: ["exists-a"] }),
    reference: done({ judge: ["exists-a"] }),
    stale: done({ judge: ["exists-a"] }),
    judged: done({}),
  });
});

test("a scenario edited after its evidence is left to build, not to record or judge", () => {
  expect(leftAt("edited after its evidence")).toEqual(done({ scenarios: ["exists-a"] }));
});

test("a scenario as an actor no credentials hold, played unplayable, is left to build", () => {
  expect(leftAt("as an unknown actor")).toEqual(done({ scenarios: ["exists-a"] }));
});

test("a reference judged on its rule is left to judge while the state it is the path of is not judged on it", () => {
  const written = {
    ...points.judged,
    "states.yaml": "- {state: s, of: [S], seen: x, path: f/exists-a}",
  };
  const at = (more: Files) =>
    leftOf({ files: filesOf({ ...written, ...more }), interfaces: [bound] });
  const findings = [
    '"exists-a" is the path of the state "s": it ends with no after step, which shows what is seen in the state',
  ];
  expect({
    ruleOnly: at({}),
    stale: at(judgedAs(hash, "holds", { of: "k", verdict: "holds" })),
    both: at(judgedAs(hash, "holds", { of: stateHashIn(written), verdict: "not-shown" })),
  }).toEqual({
    ruleOnly: done({ findings, judge: ["exists-a"] }),
    stale: done({ findings, judge: ["exists-a"] }),
    both: done({ findings }),
  });
});

test("an accepted reference judged on its rule is left to judge while the conditions met on it are not judged, or stale", () => {
  const written: Files = {
    ...points["a reference"],
    "operations/f/trigger.yaml":
      "{trigger: f, interface: f, operation: f, answers: {status: [200, 404]}, refuses: {not-found: {status: 404, body: empty}}}",
    "operations/f/rules.yaml": `
operation: f
requires:
  - {rule: exists, fact: the item exists, otherwise: not-found, source: "F.java:1"}
effects:
  - {rule: shared, when: the item is shared, says: it is listed, source: "F.java:2"}
answers: {says: "the item", structure: null}
`,
    "operations/f/hints.yaml": `
- {rule: exists, situation: s, how: h, seen-in: none, reachable: yes}
- {rule: shared, situation: s, how: h, seen-in: none, reachable: yes}
`,
  };
  const files = filesOf(written);
  const evidence = evidenceAt(files, "f", "exists-a");
  const task =
    evidence === undefined
      ? undefined
      : judgeTaskOf(files, bound, [{ slug: "exists-a", evidence }]);
  const judged = (met: readonly { readonly of: string }[]): Files => ({
    "operations/f/judgements.yaml": Bun.YAML.stringify({
      model: "m",
      at: "2026-11-01T10:00:00.000Z",
      judgements: [
        {
          scenario: "exists-a",
          rule: "exists",
          situation: "yes",
          verdict: "holds",
          confidence: 1,
          evidence: "e",
          of: task?.of.get("exists-a") ?? "",
        },
        ...met.map(({ of }) => ({
          scenario: "exists-a",
          met: { shared: "no" },
          evidence: "e",
          of,
        })),
      ],
    }),
  });
  const at = (more: Files) =>
    leftOf({ files: filesOf({ ...written, ...more }), interfaces: [bound] });
  const findings = ['no scenario for the rule "shared"'];
  expect({
    ruleOnly: at(judged([])),
    stale: at(judged([{ of: "m" }])),
    both: at(judged([{ of: task?.ofConditions.get("exists-a") ?? "" }])),
  }).toEqual({
    ruleOnly: done({ findings, judge: ["exists-a"] }),
    stale: done({ findings, judge: ["exists-a"] }),
    both: done({ findings }),
  });
});
