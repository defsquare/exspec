import { expect, test } from "bun:test";
import { dataOf } from "../../src/cli/view.ts";
import { builtOf } from "../../src/derive/built-of.ts";
import {
  bound,
  filesOf,
  hash,
  judgedAs,
  pathed,
  points,
  reading,
  stateHashIn,
} from "../roles-left-fixture.ts";

const written = {
  ...points["a reference"],
  "operations/f/scenarios/exists-a.yaml":
    pathed["operations/f/scenarios/exists-a.yaml"] ?? "",
  "operations/f/evidence/exists-a.yaml":
    pathed["operations/f/evidence/exists-a.yaml"] ?? "",
  "states.yaml": "- {state: s, of: [S], seen: reading the a shows it, path: f/exists-a}",
  "interfaces.yaml": `
interfaces:
  - {interface: f, method: get, pattern: "/f/{a}", responses: {200: {body: any}}}
  - {interface: g, method: get, pattern: "/g/{a}", responses: {200: {body: any}}}
`,
  "operations/g/trigger.yaml": (reading["operations/f/trigger.yaml"] ?? "").replaceAll(
    "f,",
    "g,",
  ),
  "operations/g/rules.yaml": (reading["operations/f/rules.yaml"] ?? "").replace(
    "operation: f",
    "operation: g",
  ),
  "operations/g/hints.yaml": reading["operations/f/hints.yaml"] ?? "",
  "operations/g/scenarios/exists-b.yaml": `
rule: exists
situation: an id no item has
reached: yes
steps:
  - {when: arrange, state: s, name: p}
  - {when: call, as: v, request: {method: get, path: /g/y}}
`,
};

const reached = filesOf({
  ...written,
  ...judgedAs(hash, "holds", { of: stateHashIn(written), verdict: "holds" }),
});

test("with no actors given, a scenario that starts from a state may be played by its path's actors, which it does not name", () => {
  expect(
    builtOf(reached, { ...bound, interface: "g", pattern: "/g/{a}" })?.findings,
  ).toEqual([]);
});

test("the page tells no problem of such a scenario either", () => {
  expect(
    dataOf("/d/t", reached).problems.filter(({ file }) => file === "operations/g"),
  ).toEqual([]);
});
