import { expect, test } from "bun:test";
import {
  compareEvidence,
  evidenceAnswers,
  isAsWritten,
  noiseBetween,
} from "../../src/derive/evidence.ts";
import type { Evidence, Exchange, RoleScenario, Step } from "../../src/shapes/roles.ts";
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

const written = scenarioOf([step("/a"), step("/b")]);
const given = evidenceOf([
  exchange({ status: 200, body: null }, "/a"),
  exchange({ status: 200, body: null }, "/b"),
]);

test("the evidence a scenario gives is of it as written", () => {
  expect(isAsWritten(written, given)).toEqual(true);
});

test("another rule is not of it as written", () => {
  expect(isAsWritten({ ...written, rule: "q" }, given)).toEqual(false);
});

test("a step's request changed is not of it as written", () => {
  expect(isAsWritten(scenarioOf([step("/a"), step("/c")]), given)).toEqual(false);
});

test("a step added is not of it as written", () => {
  expect(isAsWritten(scenarioOf([step("/a"), step("/b"), step("/c")]), given)).toEqual(
    false,
  );
});

test("another actor is not of it as written", () => {
  expect(isAsWritten(scenarioOf([step("/a"), step("/b", { as: "z" })]), given)).toEqual(
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
  expect(isAsWritten(withHole, answered(7, "/items/7"))).toEqual(true);
});

test("a hole not filled from the earlier answer of the evidence is not of it as written", () => {
  expect(isAsWritten(withHole, answered(8, "/items/7"))).toEqual(false);
});

test("an evidence ending on an unplayable exchange is not of it as written", () => {
  expect(
    isAsWritten(
      written,
      evidenceOf([exchange({ status: 200, body: null }, "/a"), unplayable]),
    ),
  ).toEqual(false);
});
