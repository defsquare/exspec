import { expect, test } from "bun:test";
import { scenarioConverted } from "../../scripts/migrations/0024-requests-to-calls.ts";
import type { Callable } from "../../src/derive/callables.ts";

const callables: readonly Callable[] = [
  {
    operation: "f",
    bound: {
      interface: "f",
      method: "post",
      pattern: "/s",
      request: { body: { n: "int" } },
      responses: { "201": { body: { data: ["schema", "S"] } } },
    },
    takes: { n: { says: "a number" } },
    places: { n: ["body", "n"] },
    unplaced: [],
    structure: "S",
    fields: ["id"],
    answer: { at: ["data"] },
  },
];

const text = `rule: r
situation: a s  # kept
reached: yes
steps:
  - {when: arrange, as: a, name: s, request: {method: post, path: /s, body: {n: 1}}}
  - {when: call, as: a, request: {method: get, path: "/z/{{s.body.data.id}}"}}
`;

test("a scenario's steps converted on their own lines, the rest of the file as it was; converted again, nothing changes", () => {
  const once = scenarioConverted("x.yaml", text, callables);
  expect({
    once,
    twice: "text" in once ? scenarioConverted("x.yaml", once.text, callables) : undefined,
  }).toEqual({
    once: {
      text: `rule: r
situation: a s  # kept
reached: yes
steps:
  - {when: arrange, as: a, name: s, call: {operation: f, with: {n: 1}}}
  - {when: call, as: a, request: {method: get, path: "/z/{{s.id}}"}}
`,
    },
    twice: { unchanged: true },
  });
});
