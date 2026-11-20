import { expect, test } from "bun:test";
import { placeOfAnswer } from "../../src/derive/answer-place.ts";
import type { Interface } from "../../src/shapes/target.ts";

const answering = (responses: Interface["responses"]): Interface => ({
  interface: "i",
  method: "post",
  pattern: "/s",
  request: {},
  responses,
});

const bound = answering({
  "201": { body: { data: ["schema", "S"] } },
  "422": { body: ["schema", "E"] },
});

test("the answered structure is the one a 2xx response's body holds", () => {
  expect([
    placeOfAnswer({ structure: "S", shows: [], bound }),
    placeOfAnswer({
      structure: "S",
      shows: [],
      bound: answering({ "200": { body: { data: ["maybe", ["schema", "S"]] } } }),
    }),
    placeOfAnswer({
      structure: "S",
      shows: [],
      bound: answering({ "200": { body: ["schema", "S"] } }),
    }),
  ]).toEqual([{ at: ["data"] }, { at: ["data"] }, { at: [] }]);
});

test("the trigger's shows says where the answered structure is in place of the description", () => {
  expect(
    placeOfAnswer({ structure: "S", shows: [{ structure: "S", at: ["r"] }], bound }),
  ).toEqual({ at: ["r"] });
});

test("an operation that answers no structure, or one no 2xx body holds once, or only in a list, has no place", () => {
  expect([
    placeOfAnswer({ structure: null, shows: [], bound }),
    placeOfAnswer({ structure: "T", shows: [], bound }),
    placeOfAnswer({
      structure: "S",
      shows: [],
      bound: answering({ "200": { body: { data: [["schema", "S"]] } } }),
    }),
    placeOfAnswer({
      structure: "S",
      shows: [],
      bound: answering({
        "200": { body: { data: ["schema", "S"] } },
        "201": { body: ["schema", "S"] },
      }),
    }),
  ]).toEqual([
    { none: "the operation answers no structure" },
    { none: 'no 2xx response of post /s holds one "T"' },
    { none: 'the 2xx responses of post /s hold "S" in a list, never one alone' },
    { none: 'the 2xx responses of post /s hold "S" at several places: data, (body)' },
  ]);
});
