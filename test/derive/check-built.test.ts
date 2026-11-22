import { expect, test } from "bun:test";
import type { Callable } from "../../src/derive/callables.ts";
import { checkBuilt } from "../../src/derive/check-built.ts";
import {
  checkCommon,
  checkRulesAndHints,
  checkStructuresFile,
} from "../../src/derive/check-reader.ts";
import type { Path } from "../../src/derive/steps-from-states.ts";
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
      : checkBuilt({
          bound,
          rules,
          protocol: [],
          actors: ["ann", "bob"],
          services: [],
          callables: [],
          paths: [],
          unreached: [],
          files,
        });
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
      : checkBuilt({
          bound,
          rules,
          protocol: [],
          actors: ["ann", "bob"],
          services: [],
          callables: [],
          paths: [],
          unreached: [],
          files,
        }).findings,
  ).toEqual([
    "scenarios/pet-exists.yaml: the call is a get, the operation a delete",
    "scenarios/pet-exists.yaml: the call's path /api/pets does not match /api/pets/{petId}",
    'scenarios/other-2.yaml: the file\'s name does not start with "pet-removed"',
    "scenarios/pet-gone-from-owner.yaml: 2 call steps, where one is expected",
    'scenarios/pet-gone-from-owner.yaml: step 1: "carl" is not an actor (ann, bob)',
    'scenarios/pet-gone-from-owner.yaml: step 1: a hole cites "owner", no step named before it',
    'scenarios/pet-gone-from-owner.yaml: step 2: a hole cites "owner", no step named before it',
    "scenarios/pet-gone-from-owner.yaml: step 2: body.a holds a hole inside a longer string; a hole outside the path is a whole string",
    `scenarios/unknown.yaml: "unknown" is not a rule of rules.yaml, nor a name under its common or under its trigger's protocol, nor "answers"`,
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
        protocol: [],
        actors: ["ann"],
        services: [service],
        callables: [],
        paths: [],
        unreached: [],
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

test("a rule of the target's wire its trigger lists is a rule a scenario may be of, and must be", () => {
  const findingsWith = (rulesOf: readonly string[]) =>
    rules === undefined
      ? undefined
      : checkBuilt({
          bound,
          rules,
          protocol: ["no-store"],
          actors: ["ann"],
          services: [],
          callables: [],
          paths: [],
          unreached: [],
          files: rulesOf.map((rule) => ({ slug: rule, text: scenario(rule) })),
        }).findings;
  expect({
    without: findingsWith(every),
    with: findingsWith([...every, "no-store"]),
  }).toEqual({ without: ['no scenario for the rule "no-store"'], with: [] });
});

const callables: readonly Callable[] = [
  {
    operation: "delete-pet",
    bound,
    takes: { petId: { says: "the pet" } },
    places: { petId: ["path", "petId"] },
    unplaced: [],
    structure: null,
    fields: undefined,
    answer: { none: "the operation answers no structure" },
  },
  {
    operation: "add-pet",
    bound: {
      interface: "add-pet",
      method: "post",
      pattern: "/api/pets",
      request: { body: { name: "string", id: "int" } },
      responses: { "201": { body: ["schema", "Pet"] } },
    },
    takes: { name: { says: "its name" }, id: { says: "its id" } },
    places: { name: ["body", "name"] },
    unplaced: [{ input: "id", why: '"id" is a path parameter and a body field' }],
    structure: "Pet",
    fields: ["id", "name"],
    answer: { at: [] },
  },
];

const findingsOfCalls = (steps: string) =>
  rules === undefined
    ? undefined
    : checkBuilt({
        bound,
        rules,
        protocol: [],
        actors: ["ann"],
        services: [],
        callables,
        paths: [],
        unreached: [],
        files: every.map((rule) => ({
          slug: rule,
          text:
            rule === "pet-exists"
              ? `
rule: pet-exists
situation: a pet
reached: yes
steps:
${steps}
`
              : scenario(rule),
        })),
      }).findings.filter((finding) => finding.startsWith("scenarios/pet-exists.yaml"));

test("a step that calls an operation by its inputs, a later hole reading a field of what it answers, passes", () => {
  expect(
    findingsOfCalls(`  - {when: arrange, as: ann, name: made, call: {operation: add-pet, with: {name: a}}}
  - {when: before, as: ann, request: {method: get, path: "/api/pets/{{made.id}}"}}
  - {when: call, as: ann, call: {operation: delete-pet, with: {petId: "{{made.id}}"}}}`),
  ).toEqual([]);
});

test("a request a call says exactly is a finding, with the call to write; one no call says is none", () => {
  expect(
    findingsOfCalls(`  - {when: arrange, as: ann, name: made, request: {method: post, path: /api/pets, body: {name: a}}}
  - {when: before, as: ann, request: {method: get, path: /api/pets}}
  - {when: call, as: ann, request: {method: delete, path: "/api/pets/{{made.body.id}}"}}`),
  ).toEqual([
    "scenarios/pet-exists.yaml: step 1 is the call {operation: add-pet, with: {name: a}}: write it as a call",
    'scenarios/pet-exists.yaml: step 3 is the call {operation: delete-pet, with: {petId: "{{made.id}}"}}: write it as a call',
  ]);
});

test("a call step names an operation read, inputs it takes and can send, and a hole on it a field of what it answers", () => {
  expect(
    findingsOfCalls(`  - {when: arrange, as: ann, name: made, call: {operation: add-pet, with: {name: a, id: 1, colour: red}}}
  - {when: arrange, as: ann, name: gone, call: {operation: remove-pet}}
  - {when: arrange, as: ann, name: done, call: {operation: delete-pet, with: {petId: 1}}}
  - {when: before, as: ann, request: {method: get, path: "/api/pets/{{made.body.id}}"}}
  - {when: before, as: ann, request: {method: get, path: "/api/pets/{{done.id}}"}}
  - {when: call, as: ann, call: {operation: add-pet, with: {name: b}}}
  - {when: after, as: ann, call: {operation: delete-pet}}`),
  ).toEqual([
    'scenarios/pet-exists.yaml: the call is to "add-pet", the operation under trial is "delete-pet"',
    'scenarios/pet-exists.yaml: step 1: "add-pet" takes no "colour" (name, id)',
    'scenarios/pet-exists.yaml: step 1: "id" cannot be sent: "id" is a path parameter and a body field',
    'scenarios/pet-exists.yaml: step 2: no reading declares the operation "remove-pet"',
    'scenarios/pet-exists.yaml: step 4: {{made.body.id}} reads no field of the Pet "made" answers, a call to "add-pet": a hole on a call reads a field of what it answers, not the answer on the wire — id, name',
    'scenarios/pet-exists.yaml: step 5: {{done.id}} names "done", a call to "delete-pet", which answers no single structure: the operation answers no structure',
    'scenarios/pet-exists.yaml: step 7: the path parameter "petId" of delete /api/pets/{petId} is not given',
  ]);
});

const reached: Path = {
  state: "s",
  steps: [
    {
      when: "arrange",
      as: "ann",
      name: "c",
      request: { method: "post", path: "/api/pets", body: { name: "a" } },
    },
    {
      when: "call",
      as: "ann",
      request: { method: "get", path: "/api/pets/{{c.body.id}}" },
    },
  ],
};

const startingFrom = (steps: string) => `
rule: pet-exists
situation: a pet
reached: yes
steps:
${steps}
  - {when: call, as: ann, request: {method: delete, path: /api/pets/1}}
`;

const findingsOfState = (steps: string, path: Path = reached) =>
  rules === undefined
    ? undefined
    : checkBuilt({
        bound,
        rules,
        protocol: [],
        actors: ["ann"],
        services: [],
        callables: [],
        paths: [path],
        unreached: [],
        files: every.map((rule) => ({
          slug: rule,
          text: rule === "pet-exists" ? startingFrom(steps) : scenario(rule),
        })),
      }).findings;

test("a scenario starts from a state that is reached, its holes read in the path's steps under its name", () => {
  expect({
    passes: findingsOfState(`  - {when: arrange, state: s, name: p}
  - {when: before, as: ann, request: {method: get, path: "/api/pets/{{p.c.body.id}}"}}`),
    noState: findingsOfState("  - {when: arrange, state: t, name: p}"),
    colliding:
      findingsOfState(`  - {when: arrange, as: ann, name: p-c, request: {method: post, path: /api/pets}}
  - {when: arrange, state: s, name: p}`),
    uncited: findingsOfState(`  - {when: arrange, state: s, name: p}
  - {when: before, as: ann, request: {method: get, path: "/api/pets/{{p.x.id}}"}}`),
  }).toEqual({
    passes: [],
    noState: ['scenarios/pet-exists.yaml: step 1: "t" is not a state of states.yaml'],
    colliding: ['scenarios/pet-exists.yaml: step 2: the names collide on "p-c"'],
    uncited: [
      'scenarios/pet-exists.yaml: step 2: a hole cites "p-x", no step named before it',
    ],
  });
});

test("a hole of a path's step citing a step the path leaves out is a finding on the state step", () => {
  expect(
    findingsOfState("  - {when: arrange, state: s, name: p}", {
      state: "s",
      steps: [
        {
          when: "before",
          as: "ann",
          name: "b",
          request: { method: "get", path: "/api/pets" },
        },
        {
          when: "call",
          as: "ann",
          request: { method: "get", path: "/api/pets/{{b.body.id}}" },
        },
      ],
    }),
  ).toEqual([
    'scenarios/pet-exists.yaml: step 1: a hole cites "p-b", no step named before it',
  ]);
});
