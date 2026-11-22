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
  "roles/f/scenarios/exists-a.yaml": `
rule: exists
situation: an id no item has
reached: yes
steps:
  - {when: call, as: u, request: {method: get, path: /f/x}}
  - {when: after, as: u, request: {method: get, path: /f/x}}
`,
};

const at = (more: Files) => filesOf({ ...points["a reference"], ...states, ...more });

const awaited = (path: string) => ({
  paths: [],
  unreached: [{ state: "s", awaited: true, why: `its path ${path} is not judged yet` }],
  findings: [],
  gaps: [
    {
      kind: "state-not-reached" as const,
      name: "s",
      message: `its path ${path} is not judged yet`,
    },
  ],
});

test("a state is reached when its path's judgement holds on today's text, awaited while it is not judged on it", () => {
  expect({
    noInterface: pathsOf(
      at({ "states.yaml": "- {state: s, of: [S], seen: x, path: g/exists-a}" }),
    ),
    notWritten: pathsOf(
      at({ "states.yaml": "- {state: s, of: [S], seen: x, path: f/exists-b}" }),
    ),
    unparsed: pathsOf(at({ "roles/f/scenarios/exists-a.yaml": "rule: [" })),
    noEvidence: pathsOf(at({ "roles/f/evidence/exists-a.yaml": "" })),
    none: pathsOf(at({})),
    stale: pathsOf(at(judgedAs("h"))),
    notShown: pathsOf(at(judgedAs(hash, "not-shown"))),
    holds: pathsOf(at(judgedAs(hash))),
  }).toEqual({
    noInterface: awaited("g/exists-a"),
    notWritten: awaited("f/exists-b"),
    unparsed: awaited("f/exists-a"),
    noEvidence: awaited("f/exists-a"),
    none: awaited("f/exists-a"),
    stale: awaited("f/exists-a"),
    notShown: {
      paths: [],
      unreached: [
        { state: "s", awaited: false, why: "its path f/exists-a is judged not-shown" },
      ],
      findings: ["states.yaml: s: its path f/exists-a is judged not-shown"],
      gaps: [],
    },
    holds: {
      paths: [
        {
          state: "s",
          steps: [
            { when: "call", as: "u", request: { method: "get", path: "/f/x" } },
            { when: "after", as: "u", request: { method: "get", path: "/f/x" } },
          ],
        },
      ],
      unreached: [],
      findings: [],
      gaps: [],
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
    unreached: [
      {
        state: "s",
        awaited: false,
        why: "its path f/exists-a: a path does not start from a state",
      },
    ],
    findings: ["states.yaml: s: its path f/exists-a: a path does not start from a state"],
    gaps: [],
  });
});

const startingFrom = (state: string): Files => ({
  "roles/f/scenarios/exists-b.yaml": `
rule: exists
situation: an id no item has
reached: yes
steps:
  - {when: arrange, state: ${state}, name: p}
  - {when: call, as: u, request: {method: get, path: /f/y}}
`,
});

const notReached = (why: string) => [
  `scenarios/exists-b.yaml: step 1: "s" is not a state that is reached: ${why}`,
];

test("a scenario that starts from a state not reached is told so in one line, with why its path is not", () => {
  const findingsAt = (more: Files) =>
    builtOf(at({ ...startingFrom("s"), ...more }), bound)?.findings;
  expect({
    none: findingsAt({}),
    notShown: findingsAt(judgedAs(hash, "not-shown")),
    stale: findingsAt(judgedAs("h")),
    holds: findingsAt(judgedAs(hash)),
    noState: builtOf(at({ ...startingFrom("t"), ...judgedAs(hash) }), bound)?.findings,
  }).toEqual({
    none: notReached("its path f/exists-a is not judged yet"),
    notShown: notReached("its path f/exists-a is judged not-shown"),
    stale: notReached("its path f/exists-a is not judged yet"),
    holds: [],
    noState: ['scenarios/exists-b.yaml: step 1: "t" is not a state of states.yaml'],
  });
});

const scenarioOf = (steps: string) => `
rule: exists
situation: an id no item has
reached: yes
steps:
${steps}
`;

test("the scenario a state's path names is written, and ends with an after step", () => {
  const findingsAt = (more: Files) => builtOf(at(more), bound)?.findings;
  expect({
    notWritten: findingsAt({
      "states.yaml": "- {state: s, of: [S], seen: x, path: f/exists-b}",
    }),
    noAfter: findingsAt({
      "roles/f/scenarios/exists-a.yaml": scenarioOf(
        "  - {when: call, as: u, request: {method: get, path: /f/x}}",
      ),
    }),
    after: findingsAt({}),
    otherInterface: findingsAt({
      "states.yaml": "- {state: s, of: [S], seen: x, path: g/exists-b}",
    }),
  }).toEqual({
    notWritten: ['"exists-b" is the path of the state "s": it is not written'],
    noAfter: [
      '"exists-a" is the path of the state "s": it ends with no after step, which shows what is seen in the state',
    ],
    after: [],
    otherInterface: [],
  });
});
