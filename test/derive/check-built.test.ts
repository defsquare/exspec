import { expect, test } from "bun:test";
import { checkBuilt } from "../../src/derive/check-built.ts";
import {
  checkCommon,
  checkRulesAndHints,
  checkStructuresFile,
} from "../../src/derive/check-reader.ts";
import type { Service } from "../../src/shapes/service.ts";
import type { Interface } from "../../src/shapes/target.ts";
import { commonText, hintsText, rulesText, structuresText } from "../roles-fixture.ts";

const { rules } = checkRulesAndHints({
  operation: "delete-pet",
  common: checkCommon(commonText).common,
  structures: checkStructuresFile(structuresText).structures,
  rules: rulesText,
  hints: hintsText,
});

const bound: Interface = {
  interface: "delete-pet",
  method: "delete",
  pattern: "/api/pets/{petId}",
  request: {},
  responses: {},
};

const scenario = (
  rule: string,
  call = `{method: delete, path: "/api/pets/{{made.body.id}}"}`,
) => `
rule: ${rule}
situation: a pet
reached: yes
steps:
  - {when: arrange, as: ann, name: made, request: {method: post, path: /api/pets, body: {name: a}}}
  - {when: call, as: ann, request: ${call}}
`;

const every = [
  "pet-exists",
  "pet-removed",
  "pet-gone-from-owner",
  "visits-removed",
  "other-pets-untouched",
  "pet-type-kept",
  "signed-in",
  "owner-admin-role",
];

test("a scenario per rule, each with one call to the operation, passes", () => {
  const files = every.map((rule) => ({ slug: rule, text: scenario(rule) }));
  const built =
    rules === undefined
      ? undefined
      : checkBuilt({ bound, rules, actors: ["ann", "bob"], services: [], files });
  expect(built?.findings).toEqual([]);
});

test("what a builder must fix, by file, then the rules no scenario exercises", () => {
  const files = [
    {
      slug: "pet-exists",
      text: scenario("pet-exists", "{method: get, path: /api/pets}"),
    },
    { slug: "other-2", text: scenario("pet-removed") },
    {
      slug: "pet-gone-from-owner",
      text: `
rule: pet-gone-from-owner
situation: s
reached: "no — the owner cannot be read"
steps:
  - {when: before, as: carl, request: {method: get, path: "/api/owners/{{owner.body.id}}"}}
  - {when: call, as: null, request: {method: delete, path: /api/pets/1, body: {a: "x{{owner.body.id}}"}}}
  - {when: call, as: null, request: {method: delete, path: /api/pets/2}}
`,
    },
    { slug: "unknown", text: scenario("unknown") },
    { slug: "broken", text: "rule: [" },
  ];
  expect(
    rules === undefined
      ? undefined
      : checkBuilt({ bound, rules, actors: ["ann", "bob"], services: [], files })
          .findings,
  ).toEqual([
    "scenarios/pet-exists.yaml: the call is a get, the operation a delete",
    "scenarios/pet-exists.yaml: the call's path /api/pets does not match /api/pets/{petId}",
    'scenarios/other-2.yaml: the file\'s name does not start with "pet-removed"',
    "scenarios/pet-gone-from-owner.yaml: 2 call steps, where one is expected",
    'scenarios/pet-gone-from-owner.yaml: step 1: "carl" is not an actor (ann, bob)',
    'scenarios/pet-gone-from-owner.yaml: step 1: a hole cites "owner", no step named before it',
    'scenarios/pet-gone-from-owner.yaml: step 2: a hole cites "owner", no step named before it',
    "scenarios/pet-gone-from-owner.yaml: step 2: body.a holds a hole inside a longer string; a hole outside the path is a whole string",
    'scenarios/unknown.yaml: "unknown" is not a rule of rules.yaml, nor a name under its common, nor "answers"',
    "scenarios/broken.yaml: not YAML: YAML Parse error: Unexpected token",
    'no scenario for the rule "visits-removed"',
    'no scenario for the rule "other-pets-untouched"',
    'no scenario for the rule "pet-type-kept"',
    'no scenario for the rule "signed-in"',
    'no scenario for the rule "owner-admin-role"',
  ]);
});

const service: Service = {
  service: "s",
  says: "keeps a document",
  conditions: [
    { condition: "forgets-everything", says: "nothing is kept" },
    { condition: "refuses", takes: { address: "string" }, says: "refuses an address" },
  ],
  unsure: [],
};

const givenSteps = (steps: string) => `
rule: pet-exists
situation: a pet
reached: yes
steps:
  - {when: arrange, as: ann, name: made, request: {method: post, path: /api/pets, body: {name: a}}}
${steps}
  - {when: call, as: ann, request: {method: delete, path: /api/pets/1}}
`;

const findingsOfGiven = (steps: string) =>
  rules === undefined
    ? undefined
    : checkBuilt({
        bound,
        rules,
        actors: ["ann"],
        services: [service],
        files: every.map((rule) => ({
          slug: rule,
          text: rule === "pet-exists" ? givenSteps(steps) : scenario(rule),
        })),
      }).findings;

test("a step that gives a service its condition, with what the condition takes, passes", () => {
  expect(
    findingsOfGiven(`  - {when: arrange, service: s, is: forgets-everything}
  - {when: arrange, service: s, is: refuses, with: {address: "{{made.body.owner}}"}}`),
  ).toEqual([]);
});

test("a service step names a service read, one of its conditions, exactly what it takes, and arranges", () => {
  expect(
    findingsOfGiven(`  - {when: arrange, service: m, is: refuses}
  - {when: arrange, service: s, is: lost}
  - {when: arrange, service: s, is: refuses}
  - {when: arrange, service: s, is: refuses, with: {address: a, copy: b}}
  - {when: before, service: s, is: forgets-everything}
  - {when: arrange, service: s, is: refuses, with: {address: "{{later.body.to}}"}}`),
  ).toEqual([
    'scenarios/pet-exists.yaml: step 2: "m" is not a service (s)',
    'scenarios/pet-exists.yaml: step 3: "lost" is not a condition of "s" (forgets-everything, refuses)',
    'scenarios/pet-exists.yaml: step 4: "refuses" of "s" takes "address", which is not given',
    'scenarios/pet-exists.yaml: step 5: "refuses" of "s" takes no "copy"',
    'scenarios/pet-exists.yaml: step 6: a step that gives "s" a condition is an arrange step, not before',
    'scenarios/pet-exists.yaml: step 7: a hole cites "later", no step named before it',
  ]);
});
