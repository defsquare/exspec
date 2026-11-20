import { expect, test } from "bun:test";
import {
  checkCommon,
  checkRulesAndHints,
  checkStructuresFile,
} from "../../src/derive/check-reader.ts";
import { commonText, hintsText, rulesText, structuresText } from "../roles-fixture.ts";

const { common } = checkCommon(commonText);
const { structures } = checkStructuresFile(structuresText);

test("a reading as readers wrote it passes the check", () => {
  expect({
    common: checkCommon(commonText).findings,
    structures: checkStructuresFile(structuresText).findings,
    reading: checkRulesAndHints({
      operation: "delete-pet",
      common,
      structures,
      rules: rulesText,
      hints: hintsText,
    }).findings,
  }).toEqual({ common: [], structures: [], reading: [] });
});

test("a broken reading gives a finding for each thing to fix", () => {
  const rules = rulesText
    .replace("operation: delete-pet", "operation: remove-pet")
    .replace("common: [signed-in, owner-admin-role]", "common: [signed-in, nobody-role]")
    .replace("rule: other-pets-untouched", "rule: pet-removed")
    .replace("  - rule: pet-type-kept\n    what:", "  - rule: nowhere\n    what:")
    .replace("field: [Pet, id]", "field: [Pet, number]")
    .replace("structure: null}", "structure: Visit}");
  const hints = hintsText.replace("- rule: pet-exists", "- rule: visits-removed");
  expect(
    checkRulesAndHints({ operation: "delete-pet", common, structures, rules, hints }),
  ).toEqual({
    findings: [
      'rules.yaml: operation is "remove-pet", the operation is "delete-pet"',
      'rules.yaml: the rule "pet-removed" is declared twice',
      'rules.yaml: common names "nobody-role", which is not a rule of common.yaml',
      "rules.yaml: takes.petId names the field Pet.number, which structures.yaml does not declare",
      "rules.yaml: answers names the structure Visit, which structures.yaml does not declare",
      'rules.yaml: unsure names "nowhere", which is not a rule of the file',
      'hints.yaml: no hint for the rule "pet-exists"',
      'hints.yaml: two hints for the rule "visits-removed"',
      'hints.yaml: a hint for "other-pets-untouched", which is not a rule',
    ],
  });
});

test("a file that is not YAML, breaks its schema or is missing is said so", () => {
  expect([
    checkRulesAndHints({
      operation: "delete-pet",
      common,
      structures,
      rules: rulesText.replace("otherwise: not-found", "otherwise: {refusal: not-found}"),
      hints: "- [",
    }),
    checkRulesAndHints({
      operation: "delete-pet",
      common,
      structures,
      rules: undefined,
      hints: hintsText,
    }),
    checkCommon(commonText.replace("target: petclinic\n", "")),
  ]).toEqual([
    {
      findings: [
        "rules.yaml: requires.0.otherwise: Invalid input: expected string, received object",
        "hints.yaml: not YAML: YAML Parse error: Unexpected token",
      ],
    },
    { findings: ["rules.yaml: missing"] },
    {
      findings: [
        "common.yaml: target: Invalid input: expected string, received undefined",
      ],
    },
  ]);
});

test("structures with a bound, an identity no field holds, or none at all give a finding each", () => {
  expect([
    checkStructuresFile(
      structuresText
        .replace(
          "name: {type: string}",
          "name: {type: string, max-length: 30, min-length: 1}",
        )
        .replace(
          "  identity: id\n  fields:\n    id: {type: int}\n    lastName",
          "  identity: key\n  fields:\n    id: {type: int}\n    lastName",
        ),
    ).findings,
    checkStructuresFile("[]"),
    checkStructuresFile(undefined),
  ]).toEqual([
    [
      'structures.yaml: 0.identity: "key" is not a field of Owner',
      "structures.yaml: Pet.name: a bound (min-length, max-length) is a rule of an operation, not of a field",
    ],
    { structures: [], findings: ["structures.yaml: no structure is declared"] },
    { findings: ["structures.yaml: missing"] },
  ]);
});

test("a requirement on an input its operation does not take gives a finding", () => {
  const requirement = (on: string) =>
    `  - {rule: r-${on}, on: ${on}, fact: f, otherwise: bad, source: "F.java:1"}`;
  expect(
    checkRulesAndHints({
      operation: "f",
      common: undefined,
      structures: undefined,
      rules: `operation: f
takes: {a: {says: s}}
requires:
${requirement("a")}
${requirement("x")}
answers: {says: ok, structure: null}
`,
      hints: `- {rule: r-a, situation: s, how: h, seen-in: none, reachable: yes}
- {rule: r-x, situation: s, how: h, seen-in: none, reachable: yes}
`,
    }).findings,
  ).toEqual(['rules.yaml: the rule "r-x" is on "x", which takes does not declare']);
});

test("a rule that rests on a service no file declares gives a finding", () => {
  expect(
    checkRulesAndHints({
      operation: "f",
      common: undefined,
      structures: undefined,
      services: ["s"],
      rules: `operation: f
effects:
  - {rule: e-s, says: a, service: s, source: "F.java:1"}
  - {rule: e-t, says: a, service: t, source: "F.java:2"}
answers: {says: ok, structure: null}
`,
      hints: `- {rule: e-s, situation: s, how: h, seen-in: none, reachable: yes}
- {rule: e-t, situation: s, how: h, seen-in: none, reachable: yes}
`,
    }).findings,
  ).toEqual(['rules.yaml: the rule "e-t" rests on "t", which is not a service (s)']);
});
