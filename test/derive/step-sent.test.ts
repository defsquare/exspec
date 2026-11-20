import { expect, test } from "bun:test";
import type { Callable } from "../../src/derive/callables.ts";
import { readOfStep, sentOfStep } from "../../src/derive/step-sent.ts";
import type { CallStep } from "../../src/shapes/roles.ts";

const callables: readonly Callable[] = [
  {
    operation: "f",
    bound: {
      interface: "f",
      method: "post",
      pattern: "/s/{x}",
      request: { path: { x: "string" }, body: { n: "int" } },
      responses: { "201": { body: { data: ["schema", "S"] } } },
    },
    takes: { x: { says: "the s" }, n: { says: "a number" } },
    places: { x: ["path", "x"], n: ["body", "n"] },
    unplaced: [],
    structure: "S",
    fields: ["id"],
    answer: { at: ["data"] },
  },
  {
    operation: "g",
    bound: {
      interface: "g",
      method: "get",
      pattern: "/g",
      request: {},
      responses: { "200": { body: [["schema", "S"]] } },
    },
    takes: {},
    places: {},
    unplaced: [],
    structure: "S",
    fields: ["id"],
    answer: { none: "a list" },
  },
];

const call = (operation: string, given: CallStep["call"]["with"]): CallStep => ({
  when: "call",
  as: "a",
  call: { operation, with: given },
});

const reads = new Map([["c", { id: 7 }]]);

test("a call step is sent through its operation's trigger, its holes filled from what the steps before read", () => {
  expect([
    sentOfStep(call("f", { x: "{{c.id}}", n: 2 }), reads, callables),
    sentOfStep(call("f", { x: "a b" }), reads, callables),
    sentOfStep(
      { when: "call", as: "a", request: { method: "get", path: "/r/{{c.id}}" } },
      reads,
      callables,
    ),
  ]).toEqual([
    { sent: { method: "post", path: "/s/7", body: { n: 2 } } },
    { sent: { method: "post", path: "/s/a%20b" } },
    { sent: { method: "get", path: "/r/7" } },
  ]);
});

test("a call that cannot be sent is unplayable, with why", () => {
  expect([
    sentOfStep(call("z", {}), reads, callables),
    sentOfStep(call("f", { x: "{{d.id}}" }), reads, callables),
    sentOfStep(call("f", { y: 1 }), reads, callables),
    sentOfStep(call("f", {}), reads, callables),
  ]).toEqual([
    { unplayable: 'no reading declares the operation "z"' },
    { unplayable: "{{d.id}} resolves to nothing" },
    { unplayable: '"y" has no place in post /s/{x}' },
    { unplayable: 'the path parameter "x" of post /s/{x} is not given' },
  ]);
});

test("a hole naming a call reads the structure it answered, naming a request the answer itself", () => {
  const answered = { status: 201, body: { data: { id: 7 } } };
  expect([
    readOfStep(call("f", {}), answered, callables),
    readOfStep(call("f", {}), { status: 404, body: { error: "x" } }, callables),
    readOfStep(call("g", {}), answered, callables),
    readOfStep(
      { when: "call", as: "a", request: { method: "get", path: "/r" } },
      answered,
      callables,
    ),
  ]).toEqual([{ id: 7 }, undefined, undefined, answered]);
});
