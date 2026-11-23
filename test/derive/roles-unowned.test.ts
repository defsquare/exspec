import { expect, test } from "bun:test";
import { unownedScenarios } from "../../src/derive/roles-files.ts";

const rules = `
operation: f
requires:
  - {rule: a, fact: the item exists, otherwise: not-found, source: "F.java:1"}
  - {rule: a-b, fact: the item is open, otherwise: closed, source: "F.java:2"}
answers: {says: "the item", structure: null}
`;

const hints = `
- {rule: a, situation: s, how: h, seen-in: none, reachable: yes}
- {rule: a-b, situation: s, how: h, seen-in: none, reachable: yes}
`;

const scenarios = ["a", "a-2", "a-b-2", "answers", "c", "b-a"].map((slug) => ({
  path: `operations/f/scenarios/${slug}.yaml`,
  text: "",
}));

test("a scenario file is unowned when its name starts with no rule of the reading", () => {
  expect(
    unownedScenarios(
      [
        { path: "operations/f/rules.yaml", text: rules },
        { path: "operations/f/hints.yaml", text: hints },
        {
          path: "operations/f/trigger.yaml",
          text: "{trigger: f, interface: f, operation: f, answers: {status: 200}, refuses: {not-found: {status: 404}, closed: {status: 409}}}",
        },
        ...scenarios,
      ],
      "f",
    ),
  ).toEqual(["c", "b-a"]);
});

test("no scenario file is unowned while the reading does not pass its check", () => {
  expect(
    unownedScenarios(
      [
        { path: "operations/f/rules.yaml", text: "operation: [" },
        { path: "operations/f/hints.yaml", text: hints },
        {
          path: "operations/f/trigger.yaml",
          text: "{trigger: f, interface: f, operation: f, answers: {status: 200}, refuses: {not-found: {status: 404}, closed: {status: 409}}}",
        },
        ...scenarios,
      ],
      "f",
    ),
  ).toEqual([]);
});
