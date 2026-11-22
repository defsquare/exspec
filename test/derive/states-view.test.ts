import { expect, test } from "bun:test";
import { statesView } from "../../src/derive/states-view.ts";
import {
  evidenceOf,
  type Files,
  filesOf,
  points,
  stateHashIn,
} from "../roles-left-fixture.ts";

const path: Files = {
  "roles/f/scenarios/exists-a.yaml": `
rule: exists
situation: an id no item has
reached: yes
steps:
  - {when: call, as: u, request: {method: get, path: /f/x}}
  - {when: after, as: u, request: {method: get, path: /f/x}}
`,
  "roles/f/evidence/exists-a.yaml": Bun.YAML.stringify(
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
  "roles/f/scenarios/exists-b.yaml": `
rule: exists
situation: an id no item has
reached: yes
steps:
  - {when: arrange, state: s, name: p}
  - {when: call, as: u, request: {method: get, path: /f/y}}
`,
};

const written: Files = {
  ...points["a reference"],
  ...path,
  "states.yaml": `
- {state: s, of: [S], seen: reading the f shows it, path: f/exists-a, serves: [f/exists, g/r, f/answers]}
- {state: t, of: [S, T], seen: reading the f shows it gone, path: f/exists-a}
- {state: u, of: [S], seen: reading the f shows it, path: f/exists-a}
`,
};

const judged = (state: string, verdict: string, of: string) => ({
  scenario: "exists-a",
  state,
  situation: "yes",
  verdict,
  confidence: 0.9,
  evidence: "e",
  of,
});

test("each state as the page shows it: reached, not judged on its path yet, or not shown by it", () => {
  const k = stateHashIn(written);
  expect(
    statesView(
      filesOf({
        ...written,
        "roles/f/judgements.yaml": Bun.YAML.stringify({
          model: "m",
          at: "2026-11-01T10:00:00.000Z",
          judgements: [judged("s", "holds", k), judged("u", "not-shown", k)],
        }),
      }),
    ),
  ).toEqual([
    {
      state: "s",
      seen: "reading the f shows it",
      of: ["S"],
      path: { operation: "f", scenario: "exists-a" },
      reached: "yes",
      judged: { verdict: "holds", confidence: 0.9, evidence: "e" },
      serves: [
        { operation: "f", rules: ["exists", "answers"] },
        { operation: "g", rules: ["r"] },
      ],
      startedFrom: [{ operation: "f", scenarios: ["exists-b"] }],
    },
    {
      state: "t",
      seen: "reading the f shows it gone",
      of: ["S", "T"],
      path: { operation: "f", scenario: "exists-a" },
      reached: "not-yet",
      why: "it is not judged on its path f/exists-a yet",
      serves: [],
      startedFrom: [],
    },
    {
      state: "u",
      seen: "reading the f shows it",
      of: ["S"],
      path: { operation: "f", scenario: "exists-a" },
      reached: "no",
      why: "its path f/exists-a does not show it: judged not-shown",
      judged: { verdict: "not-shown", confidence: 0.9, evidence: "e" },
      serves: [],
      startedFrom: [],
    },
  ]);
});

test("no state without states.yaml, nor with it empty", () => {
  expect({
    none: statesView(
      filesOf(points["a reference"]).filter(({ path }) => path !== "states.yaml"),
    ),
    empty: statesView(filesOf(points["a reference"])),
  }).toEqual({ none: [], empty: [] });
});
