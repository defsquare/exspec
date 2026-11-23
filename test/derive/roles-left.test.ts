import { expect, test } from "bun:test";
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
