import { expect, test } from "bun:test";
import { builtOf } from "../../src/derive/built-of.ts";
import { pathsOf } from "../../src/derive/states-files.ts";
import {
  bound,
  evidenceOf,
  type Files,
  filesOf,
  judgedAs,
  points,
  stateHashIn,
} from "../roles-left-fixture.ts";

const states: Files = {
  "states.yaml": "- {state: s, of: [S], seen: reading the f shows it, path: f/exists-a}",
  "operations/f/scenarios/exists-a.yaml": `
rule: exists
situation: an id no item has
reached: yes
steps:
  - {when: call, as: u, request: {method: get, path: /f/x}}
  - {when: after, as: u, request: {method: get, path: /f/x}}
`,
  "operations/f/evidence/exists-a.yaml": Bun.YAML.stringify(
    evidenceOf({
      noise: [],
      exchanges: [
        {
          when: "call",
          as: "u",
          request: { method: "get", path: "/f/x" },
          response: { status: 404, body: null },
        },
        {
          when: "after",
          as: "u",
          request: { method: "get", path: "/f/x" },
          response: { status: 404, body: null },
        },
      ],
    }),
  ),
};

const at = (more: Files) => filesOf({ ...points["a reference"], ...states, ...more });

const hash = stateHashIn({ ...points["a reference"], ...states });

const awaited = (path: string) => ({
  paths: [],
  unreached: [
    { state: "s", awaited: true, why: `it is not judged on its path ${path} yet` },
  ],
  findings: [],
  gaps: [
    {
      kind: "state-not-reached" as const,
      name: "s",
      message: `it is not judged on its path ${path} yet`,
    },
  ],
});

const reached: ReturnType<typeof pathsOf> = {
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
};

test("a state is reached when its sentence's judgement on its path holds on today's text, awaited while it is not judged on it", () => {
  expect({
    noInterface: pathsOf(
      at({ "states.yaml": "- {state: s, of: [S], seen: x, path: g/exists-a}" }),
    ),
    notWritten: pathsOf(
      at({ "states.yaml": "- {state: s, of: [S], seen: x, path: f/exists-b}" }),
    ),
    unparsed: pathsOf(at({ "operations/f/scenarios/exists-a.yaml": "rule: [" })),
    noEvidence: pathsOf(at({ "operations/f/evidence/exists-a.yaml": "" })),
    playedOnce: pathsOf(
      at({
        ...judgedAs("h", "holds", { of: hash, verdict: "holds" }),
        "operations/f/evidence/exists-a.yaml": Bun.YAML.stringify(evidenceOf()),
      }),
    ),
    none: pathsOf(at({})),
    ruleOnly: pathsOf(at(judgedAs("h"))),
    stale: pathsOf(at(judgedAs("h", "holds", { of: "k", verdict: "holds" }))),
    notShown: pathsOf(at(judgedAs("h", "holds", { of: hash, verdict: "not-shown" }))),
    holds: pathsOf(at(judgedAs("h", "holds", { of: hash, verdict: "holds" }))),
  }).toEqual({
    noInterface: awaited("g/exists-a"),
    notWritten: awaited("f/exists-b"),
    unparsed: awaited("f/exists-a"),
    noEvidence: awaited("f/exists-a"),
    playedOnce: awaited("f/exists-a"),
    none: awaited("f/exists-a"),
    ruleOnly: awaited("f/exists-a"),
    stale: awaited("f/exists-a"),
    notShown: {
      paths: [],
      unreached: [
        {
          state: "s",
          awaited: false,
          why: "its path f/exists-a does not show it: judged not-shown",
        },
      ],
      findings: [
        "states.yaml: s: its path f/exists-a does not show it: judged not-shown",
      ],
      gaps: [],
    },
    holds: reached,
  });
});

test("a state whose path's own rule is judged contradicted is reached when its sentence holds on it", () => {
  expect(
    pathsOf(at(judgedAs("h", "contradicted", { of: hash, verdict: "holds" }))),
  ).toEqual(reached);
});

test("a path whose steps start from a state is a finding", () => {
  expect(
    pathsOf(
      at({
        ...judgedAs("h", "holds", { of: hash, verdict: "holds" }),
        "operations/f/scenarios/exists-a.yaml": `
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
  "operations/f/scenarios/exists-b.yaml": `
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

test("a scenario that starts from a state not reached is told so in one line, with why the state is not", () => {
  const findingsAt = (more: Files) =>
    builtOf(at({ ...startingFrom("s"), ...more }), bound)?.findings;
  expect({
    none: findingsAt({}),
    notShown: findingsAt(judgedAs("h", "holds", { of: hash, verdict: "not-shown" })),
    stale: findingsAt(judgedAs("h", "holds", { of: "k", verdict: "holds" })),
    holds: findingsAt(judgedAs("h", "holds", { of: hash, verdict: "holds" })),
    noState: builtOf(
      at({
        ...startingFrom("t"),
        ...judgedAs("h", "holds", { of: hash, verdict: "holds" }),
      }),
      bound,
    )?.findings,
  }).toEqual({
    none: notReached("it is not judged on its path f/exists-a yet"),
    notShown: notReached("its path f/exists-a does not show it: judged not-shown"),
    stale: notReached("it is not judged on its path f/exists-a yet"),
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
      "operations/f/scenarios/exists-a.yaml": scenarioOf(
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
