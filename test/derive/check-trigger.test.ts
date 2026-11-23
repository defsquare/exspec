import { expect, test } from "bun:test";
import {
  checkCommon,
  checkProtocol,
  checkRulesAndHints,
  checkStructuresFile,
} from "../../src/derive/check-reader.ts";
import { checkTrigger } from "../../src/derive/check-trigger.ts";
import { readerFilesOf } from "../../src/derive/roles-files.ts";
import type { Protocol } from "../../src/shapes/roles.ts";
import {
  commonText,
  hintsText,
  protocolText,
  rulesText,
  structuresText,
  triggerText,
} from "../roles-fixture.ts";
import { filesOf } from "../roles-left-fixture.ts";

const { common } = checkCommon(commonText);
const { structures } = checkStructuresFile(structuresText);
const { protocol } = checkProtocol(protocolText);

const readRules = (rules: string) =>
  checkRulesAndHints({
    operation: "delete-pet",
    common,
    structures,
    rules,
    hints: hintsText,
  });

const rules = readRules(rulesText).rules;

const triggerFindings = (
  text: string | undefined,
  wire: Protocol | undefined = protocol,
) =>
  rules === undefined
    ? undefined
    : checkTrigger({
        name: "delete-pet",
        interfaces: ["delete-pet"],
        rules,
        common,
        protocol: wire,
        text,
      }).findings;

test("a trigger as a reader wrote it, beside its rules and the target's protocol, passes", () => {
  expect({
    protocol: checkProtocol(protocolText).findings,
    trigger: triggerFindings(triggerText),
  }).toEqual({ protocol: [], trigger: [] });
});

test("a trigger that says no accepted status, misses a refusal, names one no rule names, or a rule the protocol lacks gives a finding each", () => {
  expect(
    triggerFindings(`
trigger: delete-pet
interface: remove-pet
operation: remove-pet
answers: {status: []}
refuses:
  gone: {status: 404}
  forbidden: {status: 403}
protocol: [no-store]
`),
  ).toEqual([
    'trigger.yaml: interface is "remove-pet", the folder is "delete-pet"',
    'trigger.yaml: interface "remove-pet" is not an interface of the target',
    `trigger.yaml: operation is "remove-pet", rules.yaml's is "delete-pet"`,
    "trigger.yaml: the trigger says no accepted status: answers.status lists each status an accepted call is answered with",
    'trigger.yaml: refuses says nothing of "not-found", the refusal of "pet-exists", nor does protocol.yaml',
    'trigger.yaml: refuses names "gone", which no rule of this operation names',
    'trigger.yaml: protocol names "no-store", which is not a rule of protocol.yaml',
  ]);
});

test("a refusal of a common rule is said by the trigger or by the protocol", () => {
  expect([
    triggerFindings(triggerText, protocol && { ...protocol, refuses: {} }),
    triggerFindings(
      `${triggerText}  unauthenticated: {status: 401}\n  forbidden: {status: 403}\n`,
      protocol && { ...protocol, refuses: {} },
    ),
  ]).toEqual([
    [
      'trigger.yaml: refuses says nothing of "unauthenticated", the refusal of "signed-in", nor does protocol.yaml',
      'trigger.yaml: refuses says nothing of "forbidden", the refusal of "owner-admin-role", nor does protocol.yaml',
    ],
    [],
  ]);
});

test("a reading with rules and no trigger, or no protocol written, is said so", () => {
  expect({
    trigger: triggerFindings(undefined),
    protocol: checkProtocol(undefined),
  }).toEqual({
    trigger: ["trigger.yaml: missing"],
    protocol: { findings: ["protocol.yaml: missing"] },
  });
});

test("a rule that says a size or a limit passes, in a rule or a common rule", () => {
  expect({
    rules: readRules(
      rulesText.replace(
        "says: The pet no longer exists;",
        "says: The page size is 100 and the pet no longer exists;",
      ),
    ).findings,
    common: checkCommon(
      commonText.replace(
        "fact: the caller holds the admin role",
        "fact: the caller holds the admin role, within 300 ms",
      ),
    ).findings,
  }).toEqual({ rules: [], common: [] });
});

test("a refusal said twice by the protocol, with another status or body, is a finding naming both", () => {
  const rule = (name: string, status: number, body: string) =>
    `  - {rule: ${name}, applies-to: x, fact: f, otherwise: {refusal: r, status: ${status}, body: "${body}"}, source: "a/b.ext:1"}`;
  const wire = (rules: readonly string[], refuses: string) =>
    checkProtocol(`target: t\nrules:\n${rules.join("\n")}\nrefuses:\n${refuses}`)
      .findings;
  expect([
    wire([rule("a", 400, "x"), rule("b", 422, "x")], "  q: {status: 401, body: y}"),
    wire([rule("a", 400, "x"), rule("b", 400, "z")], "  q: {status: 401, body: y}"),
    wire([rule("a", 400, "x")], "  r: {status: 422, body: x}"),
    wire([rule("a", 400, "x"), rule("b", 400, "x")], "  r: {status: 400, body: x}"),
  ]).toEqual([
    [
      'protocol.yaml: the refusal "r" is said by the rule "a" and by the rule "b" with another status',
    ],
    [
      'protocol.yaml: the refusal "r" is said by the rule "a" and by the rule "b" with another body',
    ],
    [
      'protocol.yaml: the refusal "r" is said by the rule "a" and by refuses with another status',
    ],
    [],
  ]);
});

test("an interface may say a common refusal with another status than the protocol", () => {
  expect(
    triggerFindings(
      triggerText,
      protocol && {
        ...protocol,
        refuses: { ...protocol.refuses, "not-found": { status: 410, body: "gone" } },
      },
    ),
  ).toEqual([]);
});

test("a reader is told what its rules and its trigger lack at once", () => {
  expect(
    readerFilesOf(
      filesOf({
        "operations/f/hints.yaml": "[]",
        "operations/f/trigger.yaml":
          "{trigger: f, interface: f, operation: f, answers: {status: []}}",
      }),
      "f",
    ).findings,
  ).toEqual([
    'hints.yaml: no hint for the rule "exists"',
    "trigger.yaml: the trigger says no accepted status: answers.status lists each status an accepted call is answered with",
    'trigger.yaml: refuses says nothing of "not-found", the refusal of "exists", nor does protocol.yaml',
  ]);
});
