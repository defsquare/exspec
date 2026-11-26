import { expect, test } from "bun:test";
import { join } from "node:path";
import { checkRulesAndHints } from "../../src/derive/check-reader.ts";
import { flowsOf } from "../../src/derive/flows.ts";
import { readYaml, rulesSchema } from "../../src/shapes/roles.ts";

const flowsIn = async (name: string) => {
  const text = await Bun.file(join(import.meta.dir, "../fixtures/flows", name)).text();
  const read = readYaml(name, text, rulesSchema);
  return "value" in read ? flowsOf(read.value) : read.findings;
};

test("an operation that turns on one situation: two cases, the refused one an exit apart", async () => {
  expect(await flowsIn("delete-workbasket.yaml")).toEqual({
    exits: {
      onInput: [],
      onSituation: [
        { rule: "admin-or-business-admin", otherwise: "missing-role" },
        { rule: "exists", otherwise: "not-found" },
        { rule: "no-uncompleted-tasks", otherwise: "workbasket-in-use" },
      ],
    },
    line: [],
    variants: [],
    turns: [
      {
        when: "the workbasket holds no task at all",
        effects: ["deleted-when-empty", "references-removed"],
      },
      {
        when: "the workbasket holds only completed tasks",
        effects: ["marked-when-completed-tasks"],
      },
    ],
  });
});

test("an operation that turns on a situation and varies on an input keeps the two apart", async () => {
  expect(await flowsIn("cancel-claim-task.yaml")).toEqual({
    exits: {
      onInput: [],
      onSituation: [
        { rule: "task-exists", otherwise: "not-found" },
        { rule: "edit-tasks-permission", otherwise: "not-allowed-on-workbasket-or-task" },
        { rule: "task-not-finished", otherwise: "invalid-task-state" },
        { rule: "claimed-by-caller", otherwise: "invalid-owner" },
      ],
    },
    line: ["marked-read-modified", "history-event"],
    variants: [
      {
        on: "keepOwner",
        cases: [
          { when: "keepOwner is false or not given", effects: ["owner-cleared"] },
          { when: "keepOwner is true", effects: ["owner-kept"] },
        ],
      },
    ],
    turns: [
      { when: "the task was claimed, or ready", effects: ["state-ready"] },
      { when: "the task was in review", effects: ["state-ready-for-review"] },
    ],
  });
});

test("an effect on an input takes does not declare, or on one with no when, is a finding", () => {
  const rules = `
operation: f
takes: {x: {says: the x}}
effects:
  - {rule: a, on: y, when: y is given, says: s, source: "F.ext:1"}
  - {rule: b, on: x, says: s, source: "F.ext:2"}
answers: {says: nothing, structure: null}
`;
  expect(
    checkRulesAndHints({
      operation: "f",
      common: undefined,
      structures: [],
      rules,
      hints:
        "[{rule: a, situation: s, how: h, seen-in: none, reachable: yes}, {rule: b, situation: s, how: h, seen-in: none, reachable: yes}]",
    }).findings,
  ).toEqual([
    'rules.yaml: the effect "a" is on "y", which takes does not declare',
    'rules.yaml: the effect "b" is on "x" and has no when',
  ]);
});
