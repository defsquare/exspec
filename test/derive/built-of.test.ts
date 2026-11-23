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
  "roles/f/scenarios/exists-a.yaml": pathed["roles/f/scenarios/exists-a.yaml"] ?? "",
  "roles/f/evidence/exists-a.yaml": pathed["roles/f/evidence/exists-a.yaml"] ?? "",
  "states.yaml": "- {state: s, of: [S], seen: reading the a shows it, path: f/exists-a}",
  "interfaces.yaml": `
interfaces:
  - {interface: f, method: get, pattern: "/f/{a}", responses: {200: {body: any}}}
  - {interface: g, method: get, pattern: "/g/{a}", responses: {200: {body: any}}}
`,
  "roles/g/trigger.yaml": (reading["roles/f/trigger.yaml"] ?? "").replaceAll("f,", "g,"),
  "roles/g/rules.yaml": (reading["roles/f/rules.yaml"] ?? "").replace(
    "operation: f",
    "operation: g",
  ),
  "roles/g/hints.yaml": reading["roles/f/hints.yaml"] ?? "",
  "roles/g/scenarios/exists-b.yaml": `
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
    dataOf("/d/t", reached).problems.filter(({ file }) => file === "roles/g"),
  ).toEqual([]);
});
