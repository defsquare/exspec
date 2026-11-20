import { expect, test } from "bun:test";
import { placesOfInputs } from "../../src/derive/input-places.ts";
import type { Interface } from "../../src/shapes/target.ts";

const bound: Interface = {
  interface: "i",
  method: "post",
  pattern: "/s/{x}/t",
  request: {
    path: { x: "string" },
    query: { q: "int" },
    body: { a: { b: "int" }, c: "string" },
  },
  responses: { "201": { body: null } },
};

const formed: Interface = {
  interface: "j",
  method: "post",
  pattern: "/f/{x}",
  request: { path: { x: "string" }, form: { to: "string" } },
  responses: { "302": { body: null } },
};

test("an input goes where the description names it, unless the trigger's sends says otherwise", () => {
  expect(
    placesOfInputs({
      inputs: ["x", "q", "c", "b"],
      sends: { b: ["body", "a", "b"] },
      bound,
    }),
  ).toEqual({
    places: {
      x: ["path", "x"],
      q: ["query", "q"],
      c: ["body", "c"],
      b: ["body", "a", "b"],
    },
    unplaced: [],
  });
});

test("an input named as a form field goes to the form", () => {
  expect(placesOfInputs({ inputs: ["x", "to"], sends: {}, bound: formed })).toEqual({
    places: { x: ["path", "x"], to: ["form", "to"] },
    unplaced: [],
  });
});

test("an input the description names nowhere has no place", () => {
  expect(placesOfInputs({ inputs: ["z"], sends: {}, bound })).toEqual({
    places: {},
    unplaced: [
      {
        input: "z",
        why: 'no path parameter, query parameter, body field or form field of post /s/{x}/t is named "z"',
      },
    ],
  });
});

test("an input named twice in the description is placed only by the trigger's sends", () => {
  const twice: Interface = {
    ...bound,
    request: { path: { x: "string" }, body: { x: "string" } },
  };
  expect([
    placesOfInputs({ inputs: ["x"], sends: {}, bound: twice }),
    placesOfInputs({ inputs: ["x"], sends: { x: ["path", "x"] }, bound: twice }),
  ]).toEqual([
    {
      places: {},
      unplaced: [
        {
          input: "x",
          why: '"x" is a path parameter and a body field of post /s/{x}/t: the trigger\'s sends says which',
        },
      ],
    },
    { places: { x: ["path", "x"] }, unplaced: [] },
  ]);
});
