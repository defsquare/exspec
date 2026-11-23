import { expect, test } from "bun:test";
import { declaredIn, phasesOf, staticFindings } from "../../src/derive/phases.ts";
import { type Left, leftOf } from "../../src/derive/roles-left.ts";
import { interfaces, target } from "../files.ts";
import { declared, type Files, filesOf, points } from "../roles-left-fixture.ts";

const sourceOf = (files: Files) =>
  Object.entries(files).map(([path, text]) => ({ path, text }));

const nothingLeft: Left = {
  structures: false,
  common: false,
  commonTrigger: false,
  states: false,
  interfaces: [],
};

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
    specification: "to-do",
    proof: "to-do",
  });
});

test("a target with a problem leaves every phase to do", () => {
  expect(
    phasesOf(
      declaredIn(
        sourceOf({ "target.yaml": `${target}\nport: 1`, "interfaces.yaml": interfaces }),
      ),
      nothingLeft,
    ),
  ).toEqual({
    target: "to-do",
    specification: "to-do",
    proof: "to-do",
  });
});

test("with no interface declared, the target and the two after it are to do", () => {
  expect(phasesOf(declaredIn(sourceOf({ "target.yaml": target })), nothingLeft)).toEqual({
    target: "to-do",
    specification: "to-do",
    proof: "to-do",
  });
});

test("an interface not read leaves the specification and the proof to do", () => {
  expect(phasesAt(sourceOf(declared))).toEqual({
    target: "done",
    specification: "to-do",
    proof: "to-do",
  });
});

test("every interface read, the specification is to do while states.yaml is missing", () => {
  const files = filesOf(points.judged).filter(({ path }) => path !== "states.yaml");
  expect({
    missing: phasesAt(files),
    empty: phasesAt([...files, { path: "states.yaml", text: "[]" }]),
  }).toEqual({
    missing: {
      target: "done",
      specification: "to-do",
      proof: "to-do",
    },
    empty: {
      target: "done",
      specification: "done",
      proof: "done",
    },
  });
});

test("every interface read, a rule without its scenario leaves the proof to do", () => {
  expect(phasesAt(filesOf(points["no scenario"]))).toEqual({
    target: "done",
    specification: "done",
    proof: "to-do",
  });
});

test("an evidence played once leaves the proof to do", () => {
  expect(phasesAt(filesOf(points["played once"]))).toEqual({
    target: "done",
    specification: "done",
    proof: "to-do",
  });
});

test("every scenario a reference, one not judged leaves the proof to do", () => {
  expect(phasesAt(filesOf(points["a reference"]))).toEqual({
    target: "done",
    specification: "done",
    proof: "to-do",
  });
});

test("every reference judged has the three phases done", () => {
  expect(phasesAt(filesOf(points.judged))).toEqual({
    target: "done",
    specification: "done",
    proof: "done",
  });
});

test("a phase is done only when the one before it is", () => {
  const left: Left = {
    structures: true,
    common: false,
    commonTrigger: false,
    states: false,
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
    specification: "to-do",
    proof: "to-do",
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
