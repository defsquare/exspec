import { expect, test } from "bun:test";
import {
  checkCommon,
  checkCommonTrigger,
  checkRulesAndHints,
  checkStructuresFile,
} from "../../src/derive/check-reader.ts";
import { checkTrigger } from "../../src/derive/check-trigger.ts";
import { readerFilesOf } from "../../src/derive/roles-files.ts";
import type { CommonTrigger } from "../../src/shapes/bindings.ts";
import {
  commonText,
  commonTriggerText,
  hintsText,
  rulesText,
  structuresText,
  triggerText,
} from "../roles-fixture.ts";
import { filesOf } from "../roles-left-fixture.ts";

const { common } = checkCommon(commonText);
const { structures } = checkStructuresFile(structuresText);
const { commonTrigger } = checkCommonTrigger(commonTriggerText, common);

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
  shared: CommonTrigger | undefined = commonTrigger,
) =>
  rules === undefined
    ? undefined
    : checkTrigger({
        name: "delete-pet",
        interfaces: ["delete-pet"],
        rules,
        common,
        commonTrigger: shared,
        text,
      }).findings;

test("a trigger as a reader wrote it, beside its rules and the shared trigger, passes", () => {
  expect({
    commonTrigger: checkCommonTrigger(commonTriggerText, common).findings,
    trigger: triggerFindings(triggerText),
  }).toEqual({ commonTrigger: [], trigger: [] });
});

test("a trigger that says no accepted status, misses a refusal, or names one no rule names gives a finding each", () => {
  expect(
    triggerFindings(`
trigger: delete-pet
interface: remove-pet
operation: remove-pet
answers: {status: []}
refuses:
  gone: {status: 404}
`),
  ).toEqual([
    'trigger.yaml: interface is "remove-pet", the folder is "delete-pet"',
    'trigger.yaml: interface "remove-pet" is not an interface of the target',
    `trigger.yaml: operation is "remove-pet", rules.yaml's is "delete-pet"`,
    "trigger.yaml: the trigger says no accepted status: answers.status lists each status an accepted call is answered with",
    'trigger.yaml: refuses says nothing of "not-found", the refusal of "pet-exists", nor does common-trigger.yaml',
    'trigger.yaml: refuses names "gone", which no rule of this operation names',
  ]);
});

test("a refusal of a common rule is said by the trigger or by the shared trigger", () => {
  expect([
    triggerFindings(triggerText, commonTrigger && { ...commonTrigger, refuses: {} }),
    triggerFindings(
      `${triggerText}  unauthenticated: {status: 401}\n  forbidden: {status: 403}\n`,
      commonTrigger && { ...commonTrigger, refuses: {} },
    ),
  ]).toEqual([
    [
      'trigger.yaml: refuses says nothing of "unauthenticated", the refusal of "signed-in", nor does common-trigger.yaml',
      'trigger.yaml: refuses says nothing of "forbidden", the refusal of "owner-admin-role", nor does common-trigger.yaml',
    ],
    [],
  ]);
});

test("a shared refusal said again by a trigger, in any of its forms, is one finding", () => {
  const saying = (refusal: string) =>
    triggerFindings(`${triggerText}  unauthenticated: ${refusal}\n`);
  const found = [
    'trigger.yaml: "unauthenticated" is a shared refusal, said in common-trigger.yaml: not said again',
  ];
  expect([
    saying('{status: 401, body: "{error: {code: X}}"}'),
    saying("{status: 401}"),
    saying('{status: 401, body: "{error: {code: X}}, header WWW-Authenticate: Bearer"}'),
  ]).toEqual([found, found, found]);
});

test("a reading with rules and no trigger, or no shared trigger written, is said so", () => {
  expect({
    trigger: triggerFindings(undefined),
    commonTrigger: checkCommonTrigger(undefined, common),
  }).toEqual({
    trigger: ["trigger.yaml: missing"],
    commonTrigger: { findings: ["common-trigger.yaml: missing"] },
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

test("the shared trigger says each refusal of common.yaml, and none other", () => {
  const { common: shared } = checkCommon(
    'target: t\nrules: [{rule: a, applies-to: x, fact: f, otherwise: r, source: "a/b.ext:1"}]',
  );
  const check = (text: string) => checkCommonTrigger(text, shared).findings;
  expect([
    check("refuses: {}"),
    check("refuses: {r: {status: 401, body: x}, q: {status: 400, body: y}}"),
    check("refuses: {r: {status: 401, body: x}}"),
  ]).toEqual([
    ['common-trigger.yaml: refuses says nothing of "r", the refusal of "a"'],
    ['common-trigger.yaml: no rule of common.yaml refuses by "q"'],
    [],
  ]);
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
    'trigger.yaml: refuses says nothing of "not-found", the refusal of "exists", nor does common-trigger.yaml',
  ]);
});
