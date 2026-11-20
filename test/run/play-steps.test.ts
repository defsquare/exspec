import { expect, test } from "bun:test";
import { playSteps } from "../../src/run/play-steps.ts";
import type { Exchange, SideEffect, Step } from "../../src/shapes/roles.ts";
import { at, extract, fakeIo } from "./fake.ts";

test("a get step that carries a body is unplayable, and the steps after it are not sent", async () => {
  const { target } = extract({});
  if (target === undefined) throw new Error("the fixture declares a target");
  const { io } = fakeIo({ "http://h/f/1": [{ status: 200, body: { id: 1 } }] });
  const played = await playSteps({
    dir: "/d",
    target,
    io,
    credentials: {},
    callables: [],
    steps: [
      { when: "before", as: null, request: { method: "get", path: "/f/1" } },
      {
        when: "call",
        as: null,
        request: { method: "get", path: "/f/1", body: { a: 1 } },
      },
      { when: "after", as: null, request: { method: "get", path: "/f/1" } },
    ],
  });
  expect(played.exchanges).toEqual([
    {
      when: "before",
      as: null,
      request: { method: "get", path: "/f/1" },
      response: { status: 200, body: { id: 1 } },
    },
    { when: "call", as: null, unplayable: "a get request cannot carry a body" },
  ]);
  expect(played.run.at).toEqual(at);
});

const effect: SideEffect = {
  observable: "s",
  request: { method: "post", path: "/b", body: { to: "x" } },
  response: { status: 200, body: { id: "e" } },
};

const first: Step = {
  when: "before",
  as: null,
  request: { method: "get", path: "/f/1" },
};
const last: Step = { when: "after", as: null, request: { method: "get", path: "/f/1" } };

const answers = {
  "http://h/f/1": [
    { status: 200, body: { id: 1 } },
    { status: 200, body: { id: 2 } },
  ],
};

const exchange = (step: Step, id: number): Exchange => ({
  when: step.when,
  as: null,
  request: { method: "get", path: "/f/1" },
  response: { status: 200, body: { id } },
});

test("an observing io hands the side effects of each step to its exchange", async () => {
  const { target } = extract({});
  if (target === undefined) throw new Error("the fixture declares a target");
  const { io } = fakeIo(answers);
  const taken = [[effect], []];
  const played = await playSteps({
    dir: "/d",
    target,
    io: { ...io, takeSideEffects: async () => taken.shift() ?? [] },
    credentials: {},
    callables: [],
    steps: [first, last],
  });
  expect(played.exchanges).toEqual([
    { ...exchange(first, 1), "side-effects": [effect] },
    { ...exchange(last, 2), "side-effects": [] },
  ]);
});

test("a step whose side effects cannot be taken keeps its answer with no side-effects key, the next is played and the failure is returned", async () => {
  const { target } = extract({});
  if (target === undefined) throw new Error("the fixture declares a target");
  const { io } = fakeIo(answers);
  let takes = 0;
  const played = await playSteps({
    dir: "/d",
    target,
    io: {
      ...io,
      takeSideEffects: async () => {
        takes += 1;
        if (takes === 1) throw new Error("not recorded: a body cut short");
        return [];
      },
    },
    credentials: {},
    callables: [],
    steps: [first, last],
  });
  expect({ exchanges: played.exchanges, notTaken: played.notTaken }).toEqual({
    exchanges: [exchange(first, 1), { ...exchange(last, 2), "side-effects": [] }],
    notTaken: [
      "a before step: what was sent to a provider could not be recorded: not recorded: a body cut short",
    ],
  });
});

test("an io that observes nothing leaves the exchanges with no side-effects key", async () => {
  const { target } = extract({});
  if (target === undefined) throw new Error("the fixture declares a target");
  const { io } = fakeIo(answers);
  const played = await playSteps({
    dir: "/d",
    target,
    io,
    credentials: {},
    callables: [],
    steps: [first, last],
  });
  expect(played.exchanges).toEqual([exchange(first, 1), exchange(last, 2)]);
});

test("a call step is sent as its operation's trigger says, a later hole reading the structure it answered", async () => {
  const { target } = extract({});
  if (target === undefined) throw new Error("the fixture declares a target");
  const { io } = fakeIo({
    "http://h/f/1": [{ status: 201, body: { data: { id: 5 } } }],
    "http://h/g/5": [{ status: 200, body: null }],
  });
  const played = await playSteps({
    dir: "/d",
    target,
    io,
    credentials: {},
    callables: [
      {
        operation: "f",
        bound: {
          interface: "f",
          method: "post",
          pattern: "/f/{x}",
          request: { path: { x: "int" } },
          responses: { "201": { body: { data: ["schema", "S"] } } },
        },
        takes: { x: { says: "an x" } },
        places: { x: ["path", "x"] },
        unplaced: [],
        structure: "S",
        fields: ["id"],
        answer: { at: ["data"] },
      },
    ],
    steps: [
      { when: "arrange", as: null, name: "c", call: { operation: "f", with: { x: 1 } } },
      { when: "call", as: null, request: { method: "get", path: "/g/{{c.id}}" } },
    ],
  });
  expect(played.exchanges).toEqual([
    {
      when: "arrange",
      as: null,
      request: { method: "post", path: "/f/1" },
      response: { status: 201, body: { data: { id: 5 } } },
    },
    {
      when: "call",
      as: null,
      request: { method: "get", path: "/g/5" },
      response: { status: 200, body: null },
    },
  ]);
});

const named: Step = { ...first, name: "m" };
const refuses: Step = {
  when: "arrange",
  service: "s",
  is: "refuses",
  with: { address: "{{m.body.id}}" },
};

test("a service step gives its condition with its holes filled, after the providers are reset, and takes no side effect", async () => {
  const { target } = extract({});
  if (target === undefined) throw new Error("the fixture declares a target");
  const { io } = fakeIo(answers);
  const calls: string[] = [];
  const played = await playSteps({
    dir: "/d",
    target,
    io: {
      ...io,
      send: async (request) => {
        calls.push(`send ${request.url}`);
        return io.send(request);
      },
      runLines: async (lines) => {
        calls.push(...lines);
      },
      resetProviders: async () => {
        calls.push("reset providers");
      },
      giveCondition: async (given) => {
        calls.push(`give ${JSON.stringify(given)}`);
        return { taken: true };
      },
      takeSideEffects: async () => {
        calls.push("take");
        return [];
      },
    },
    credentials: {},
    callables: [],
    steps: [named, refuses, { when: "arrange", service: "s", is: "forgets-everything" }],
  });
  expect({ calls, exchanges: played.exchanges }).toEqual({
    calls: [
      "reset",
      "reset providers",
      "send http://h/f/1",
      "take",
      'give {"service":"s","condition":"refuses","with":{"address":1}}',
      'give {"service":"s","condition":"forgets-everything","with":{}}',
    ],
    exchanges: [
      { ...exchange(first, 1), "side-effects": [] },
      { when: "arrange", service: "s", is: "refuses", with: { address: 1 } },
      { when: "arrange", service: "s", is: "forgets-everything" },
    ],
  });
});

test("a service step not taken is unplayable with the reason, and the steps after it are not sent", async () => {
  const { target } = extract({});
  if (target === undefined) throw new Error("the fixture declares a target");
  const { io } = fakeIo(answers);
  const played = await playSteps({
    dir: "/d",
    target,
    io: {
      ...io,
      giveCondition: async () => ({
        refused: "p answered 404: unknown condition refuses",
      }),
    },
    credentials: {},
    callables: [],
    steps: [named, refuses, last],
  });
  expect(played.exchanges).toEqual([
    exchange(first, 1),
    {
      when: "arrange",
      service: "s",
      is: "refuses",
      unplayable: "p answered 404: unknown condition refuses",
    },
  ]);
});

test("nothing is taken for a step that cannot be played", async () => {
  const { target } = extract({});
  if (target === undefined) throw new Error("the fixture declares a target");
  const { io } = fakeIo(answers);
  let takes = 0;
  const played = await playSteps({
    dir: "/d",
    target,
    io: {
      ...io,
      takeSideEffects: async () => {
        takes += 1;
        return [];
      },
    },
    credentials: {},
    callables: [],
    steps: [
      first,
      {
        when: "call",
        as: null,
        request: { method: "get", path: "/f/1", body: { a: 1 } },
      },
      last,
    ],
  });
  expect({ exchanges: played.exchanges, takes }).toEqual({
    exchanges: [
      { ...exchange(first, 1), "side-effects": [] },
      { when: "call", as: null, unplayable: "a get request cannot carry a body" },
    ],
    takes: 1,
  });
});
