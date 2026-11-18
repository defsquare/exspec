import { expect, test } from "bun:test";
import { declaredIn, phasesOf, staticFindings } from "../../src/derive/phases.ts";
import { type Left, leftOf } from "../../src/derive/roles-left.ts";
import { interfaces, target } from "../files.ts";
import { declared, type Files, filesOf, points } from "../roles-left-fixture.ts";

const sourceOf = (files: Files) =>
  Object.entries(files).map(([path, text]) => ({ path, text }));

const nothingLeft: Left = { structures: false, common: false, interfaces: [] };

function phasesAt(files: ReturnType<typeof filesOf>) {
  const examined = declaredIn(files);
  return phasesOf(
    examined,
    leftOf({ files, interfaces: examined.extraction.interfaces }),
  );
}

test("an empty extraction has every phase to do", () => {
  expect(phasesOf(declaredIn([]), nothingLeft)).toEqual({
    target: "to-do",
    interfaces: "to-do",
    reading: "to-do",
    evidence: "to-do",
    judgement: "to-do",
  });
});

test("a target with a problem is to do, the interfaces too", () => {
  expect(
    phasesOf(
      declaredIn(
        sourceOf({ "target.yaml": `${target}\nport: 1`, "interfaces.yaml": interfaces }),
      ),
      nothingLeft,
    ),
  ).toEqual({
    target: "to-do",
    interfaces: "to-do",
    reading: "to-do",
    evidence: "to-do",
    judgement: "to-do",
  });
});

test("with no interface declared, nothing is read, built or judged", () => {
  expect(phasesOf(declaredIn(sourceOf({ "target.yaml": target })), nothingLeft)).toEqual({
    target: "done",
    interfaces: "to-do",
    reading: "to-do",
    evidence: "to-do",
    judgement: "to-do",
  });
});

test("an interface not read leaves the reading to do", () => {
  expect(phasesAt(sourceOf(declared))).toEqual({
    target: "done",
    interfaces: "done",
    reading: "to-do",
    evidence: "to-do",
    judgement: "to-do",
  });
});

test("every interface read, a rule without its scenario leaves the evidence to do", () => {
  expect(phasesAt(filesOf(points["no scenario"]))).toEqual({
    target: "done",
    interfaces: "done",
    reading: "done",
    evidence: "to-do",
    judgement: "to-do",
  });
});

test("an evidence played once leaves the evidence to do", () => {
  expect(phasesAt(filesOf(points["played once"]))).toEqual({
    target: "done",
    interfaces: "done",
    reading: "done",
    evidence: "to-do",
    judgement: "to-do",
  });
});

test("every scenario a reference, one not judged leaves the judgement to do", () => {
  expect(phasesAt(filesOf(points["a reference"]))).toEqual({
    target: "done",
    interfaces: "done",
    reading: "done",
    evidence: "done",
    judgement: "to-do",
  });
});

test("every reference judged has every phase done", () => {
  expect(phasesAt(filesOf(points.judged))).toEqual({
    target: "done",
    interfaces: "done",
    reading: "done",
    evidence: "done",
    judgement: "done",
  });
});

test("a phase is done only when the one before it is", () => {
  const left: Left = {
    structures: true,
    common: false,
    interfaces: [
      {
        interface: "f",
        reading: "done",
        build: { findings: [], scenarios: [] },
        record: [],
        judge: [],
      },
    ],
  };
  expect(phasesOf(declaredIn(sourceOf(declared)), left)).toEqual({
    target: "done",
    interfaces: "done",
    reading: "to-do",
    evidence: "to-do",
    judgement: "to-do",
  });
});

test("the target's findings are its problems and a missing declaration", () => {
  expect(
    staticFindings(
      "target",
      declaredIn(sourceOf({ "interfaces.yaml": "interfaces: []\nx: 1" })),
    ),
  ).toEqual(['interfaces.yaml: Unrecognized key: "x"', "no target is declared"]);
});
