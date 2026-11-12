import { expect, test } from "bun:test";
import { checkExtraction } from "../../src/derive/check.ts";
import { phasesOf, staticFindings } from "../../src/derive/phases.ts";
import { parseExtraction } from "../../src/shapes/extraction.ts";
import { scenarioFile } from "../run/fake.ts";

const target = `
target: t
start: [start]
alive: {method: get, path: /alive, status: 200}
seed: [seed]
reset: [reset]
stop: [stop]
api: {base-url: "http://h"}
`;

const interfaces = `
interfaces:
  - {interface: i, method: get, pattern: "/f/{a}", request: {path: {a: string}}, responses: {200: {body: any}, 404: {body: null}}}
`;

const operation = `
operation: f
takes: {a: {type: string}}
requires: [{rule: q, fact: p, otherwise: missing}]
answers: null
effects: [{rule: r, then: nothing-changes}]
`;

const facts = "- {fact: p, condition: []}";

const bindings = `
triggers:
  - {trigger: t, interface: i, operation: f, sends: {a: [path, a]}, answers: {status: 200}, refuses: {missing: {status: 404}}}
`;

const reference = `
scenario: s
says: s
proves: [r]
run: {target: t, version: v, at: "2026-11-13T10:00:00.000Z", clock: null}
arrange: []
act:
  call: {operation: f, with: {a: x}, caller: u}
  response: {status: 200, body: null}
noise: []
`;

function examine(files: Readonly<Record<string, string>>) {
  const parsed = parseExtraction(
    Object.entries(files).map(([path, text]) => ({ path, text })),
  );
  const checked = checkExtraction(parsed.extraction);
  return {
    extraction: parsed.extraction,
    problems: [...parsed.problems, ...checked.problems],
    gaps: checked.gaps,
  };
}

test("an empty extraction has every phase to do", () => {
  expect(phasesOf(examine({}))).toEqual({
    target: "to-do",
    interfaces: "to-do",
    specification: "to-do",
    scenarios: "to-do",
    record: "to-do",
  });
});

test("a target with a problem is to do, the interfaces too", () => {
  expect(
    phasesOf(
      examine({ "target.yaml": `${target}\nport: 1`, "interfaces.yaml": interfaces }),
    ),
  ).toEqual({
    target: "to-do",
    interfaces: "to-do",
    specification: "to-do",
    scenarios: "to-do",
    record: "to-do",
  });
});

test("an operation with no trigger leaves the specification to do", () => {
  const examined = examine({
    "target.yaml": target,
    "interfaces.yaml": interfaces,
    "facts.yaml": facts,
    "operations/f.yaml": operation,
  });
  expect({
    phases: phasesOf(examined),
    findings: staticFindings("specification", examined),
  }).toEqual({
    phases: {
      target: "done",
      interfaces: "done",
      specification: "to-do",
      scenarios: "to-do",
      record: "to-do",
    },
    findings: ["operation-without-trigger f: no trigger calls it"],
  });
});

test("an operation with no scenario leaves the scenarios to do", () => {
  const examined = examine({
    "target.yaml": target,
    "interfaces.yaml": interfaces,
    "facts.yaml": facts,
    "operations/f.yaml": operation,
    "bindings.yaml": bindings,
  });
  expect({
    phases: phasesOf(examined),
    findings: staticFindings("scenarios", examined),
  }).toEqual({
    phases: {
      target: "done",
      interfaces: "done",
      specification: "done",
      scenarios: "to-do",
      record: "to-do",
    },
    findings: ["f has no scenario"],
  });
});

test("every scenario referenced has every phase done", () => {
  expect(
    phasesOf(
      examine({
        "target.yaml": target,
        "interfaces.yaml": interfaces,
        "facts.yaml": facts,
        "operations/f.yaml": operation,
        "bindings.yaml": bindings,
        "scenarios/f/a.yaml": scenarioFile("x"),
        "references/f/a.yaml": reference,
      }),
    ),
  ).toEqual({
    target: "done",
    interfaces: "done",
    specification: "done",
    scenarios: "done",
    record: "done",
  });
});

test("the target's findings are its problems and a missing declaration", () => {
  expect(
    staticFindings("target", examine({ "interfaces.yaml": "interfaces: []\nx: 1" })),
  ).toEqual(['interfaces.yaml: Unrecognized key: "x"', "no target is declared"]);
});
