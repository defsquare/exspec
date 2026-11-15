import { expect, test } from "bun:test";
import { checkCommon, checkReading } from "../../src/derive/check-reading.ts";
import { commonText, hintsText, rulesText } from "../roles-fixture.ts";

const { common } = checkCommon(commonText);

test("a reading as readers wrote it passes the check", () => {
  expect({
    common: checkCommon(commonText).findings,
    reading: checkReading({
      operation: "delete-pet",
      common,
      rules: rulesText,
      hints: hintsText,
    }).findings,
  }).toEqual({ common: [], reading: [] });
});

test("a broken reading gives a finding for each thing to fix", () => {
  const rules = rulesText
    .replace("operation: delete-pet", "operation: remove-pet")
    .replace("common: [signed-in, owner-admin-role]", "common: [signed-in, nobody-role]")
    .replace("rule: other-pets-untouched", "rule: pet-removed")
    .replace("  - rule: pet-type-kept\n    what:", "  - rule: nowhere\n    what:");
  const hints = hintsText.replace("- rule: pet-exists", "- rule: visits-removed");
  expect(checkReading({ operation: "delete-pet", common, rules, hints })).toEqual({
    findings: [
      'rules.yaml: operation is "remove-pet", the operation is "delete-pet"',
      'rules.yaml: the rule "pet-removed" is declared twice',
      'rules.yaml: common names "nobody-role", which is not a rule of common.yaml',
      'rules.yaml: unsure names "nowhere", which is not a rule of the file',
      'hints.yaml: no hint for the rule "pet-exists"',
      'hints.yaml: two hints for the rule "visits-removed"',
      'hints.yaml: a hint for "other-pets-untouched", which is not a rule',
    ],
  });
});

test("a file that is not YAML, breaks its schema or is missing is said so", () => {
  expect([
    checkReading({
      operation: "delete-pet",
      common,
      rules: rulesText.replace("status: 404", 'status: "404"'),
      hints: "- [",
    }),
    checkReading({ operation: "delete-pet", common, rules: undefined, hints: hintsText }),
    checkCommon(commonText.replace("target: petclinic\n", "")),
  ]).toEqual([
    {
      findings: [
        "rules.yaml: requires.0.otherwise.status: Invalid input: expected number, received string",
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
