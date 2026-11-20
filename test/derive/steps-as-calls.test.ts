import { expect, test } from "bun:test";
import type { Callable } from "../../src/derive/callables.ts";
import { stepsAsCalls, stepsConverted } from "../../src/derive/steps-as-calls.ts";

const callable = (
  operation: string,
  method: "get" | "post",
  pattern: string,
  places: Callable["places"],
): Callable => ({
  operation,
  bound: {
    interface: operation,
    method,
    pattern,
    request: {},
    responses: { "201": { body: { data: ["schema", "S"] } } },
  },
  takes: Object.fromEntries(Object.keys(places).map((input) => [input, { says: input }])),
  places,
  unplaced: [],
  structure: "S",
  fields: ["id"],
  answer: { at: ["data"] },
});

const callables = [
  callable("f", "post", "/s", { n: ["body", "n"] }),
  callable("g", "get", "/s/{x}", { x: ["path", "x"] }),
];

test("each request step as the call that says it, a hole on an earlier call or converted request read in its structure", () => {
  expect(
    stepsAsCalls(
      [
        {
          when: "arrange",
          as: "a",
          name: "s",
          request: { method: "post", path: "/s", body: { n: 1 } },
        },
        { when: "arrange", as: "a", name: "c", call: { operation: "f", with: { n: 2 } } },
        {
          when: "before",
          as: "a",
          request: { method: "get", path: "/s/{{s.body.data.id}}" },
        },
        { when: "call", as: "a", request: { method: "get", path: "/s/{{c.id}}" } },
        { when: "after", as: "a", request: { method: "get", path: "/z" } },
        { when: "arrange", service: "m", is: "down" },
      ],
      callables,
    ),
  ).toEqual([
    { call: { operation: "f", with: { n: 1 } } },
    undefined,
    { call: { operation: "g", with: { x: "{{s.id}}" } } },
    { call: { operation: "g", with: { x: "{{c.id}}" } } },
    { refused: [{ reason: "no-interface", what: "no interface read answers get /z" }] },
    undefined,
  ]);
});

test("the steps converted: a request a call says becomes that call, a hole of a step left on it reads its structure", () => {
  expect(
    stepsConverted(
      [
        {
          when: "arrange",
          as: "a",
          name: "s",
          request: { method: "post", path: "/s", body: { n: 1 } },
        },
        {
          when: "before",
          as: "a",
          request: {
            method: "get",
            path: "/z/{{s.body.data.id}}",
            body: ["{{s.body.data.id}}"],
          },
        },
        { when: "arrange", service: "m", is: "down", with: { to: "{{s.body.data.id}}" } },
      ],
      callables,
    ),
  ).toEqual({
    steps: [
      { when: "arrange", as: "a", name: "s", call: { operation: "f", with: { n: 1 } } },
      {
        when: "before",
        as: "a",
        request: { method: "get", path: "/z/{{s.id}}", body: ["{{s.id}}"] },
      },
      { when: "arrange", service: "m", is: "down", with: { to: "{{s.id}}" } },
    ],
    converted: 1,
    conflicts: [],
  });
});

test("a hole of a step left that reads outside what a converted step answers is a conflict", () => {
  expect(
    stepsConverted(
      [
        {
          when: "arrange",
          as: "a",
          name: "s",
          request: { method: "post", path: "/s", body: { n: 1 } },
        },
        { when: "before", as: "a", request: { method: "get", path: "/z/{{s.status}}" } },
      ],
      callables,
    ).conflicts,
  ).toEqual(['step 2: {{s.status}} reads outside what "s" answers as a call']);
});
