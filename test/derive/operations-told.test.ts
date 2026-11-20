import { expect, test } from "bun:test";
import type { Callable } from "../../src/derive/callables.ts";
import { operationsTold } from "../../src/derive/operations-told.ts";

const bound: Callable["bound"] = {
  interface: "f",
  method: "post",
  pattern: "/s/{x}",
  request: {},
  responses: {},
};

test("each operation a builder may call: its inputs and what they say, what it answers and its fields", () => {
  expect(
    operationsTold([
      {
        operation: "f",
        bound,
        takes: { x: { says: "the s" }, n: { says: "a number" } },
        places: { x: ["path", "x"] },
        unplaced: [{ input: "n", why: "named nowhere" }],
        structure: "S",
        fields: ["id", "name"],
        answer: { at: ["data"] },
      },
      {
        operation: "g",
        bound,
        takes: {},
        places: {},
        unplaced: [],
        structure: null,
        fields: undefined,
        answer: { none: "the operation answers no structure" },
      },
    ]),
  ).toEqual([
    "- f: takes x (the s), n (a number; cannot be sent: named nowhere). Answers S: id, name.",
    "- g: takes nothing. Answers no structure a hole can read: the operation answers no structure.",
  ]);
});
