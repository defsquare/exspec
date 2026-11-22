import { expect, test } from "bun:test";
import { builtOf, pathsOf } from "../../src/derive/roles-files.ts";
import {
  bound,
  type Files,
  filesOf,
  hash,
  judgedAs,
  points,
} from "../roles-left-fixture.ts";

const states: Files = {
  "states.yaml": "- {state: s, of: [S], seen: reading the f shows it, path: f/exists-a}",
};

const at = (more: Files) => filesOf({ ...points["a reference"], ...states, ...more });

const unreached = {
  paths: [],
  findings: ["states.yaml: s: its path f/exists-a is not judged to hold"],
};

test("a state is reached when its path's judgement holds on the text its judge is given today", () => {
  expect({
    none: pathsOf(at({})),
    notShown: pathsOf(at(judgedAs(hash, "not-shown"))),
    stale: pathsOf(at(judgedAs("h"))),
    holds: pathsOf(at(judgedAs(hash))),
  }).toEqual({
    none: unreached,
    notShown: unreached,
    stale: unreached,
    holds: {
      paths: [
        {
          state: "s",
          steps: [{ when: "call", as: "u", request: { method: "get", path: "/f/x" } }],
        },
      ],
      findings: [],
    },
  });
});

test("a path whose steps start from a state is a finding", () => {
  expect(
    pathsOf(
      at({
        ...judgedAs(hash),
        "roles/f/scenarios/exists-a.yaml": `
rule: exists
situation: an id no item has
reached: yes
steps:
  - {when: arrange, state: s, name: p}
  - {when: call, as: u, request: {method: get, path: /f/x}}
`,
      }),
    ),
  ).toEqual({
    paths: [],
    findings: ["states.yaml: s: its path f/exists-a: a path does not start from a state"],
  });
});

const startingFromS: Files = {
  "roles/f/scenarios/exists-b.yaml": `
rule: exists
situation: an id no item has
reached: yes
steps:
  - {when: arrange, state: s, name: p}
  - {when: call, as: u, request: {method: get, path: /f/y}}
`,
};

test("a scenario that starts from a state not reached is told so, with why its path is not", () => {
  expect({
    unreached: builtOf(at(startingFromS), bound)?.findings,
    reached: builtOf(at({ ...startingFromS, ...judgedAs(hash) }), bound)?.findings,
  }).toEqual({
    unreached: [
      'scenarios/exists-b.yaml: step 1: "s" is not a state that is reached',
      "states.yaml: s: its path f/exists-a is not judged to hold",
    ],
    reached: [],
  });
});
