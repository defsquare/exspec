import { expect, test } from "bun:test";
import { markNoise } from "../../src/derive/noise.ts";
import { played } from "../played.ts";

test("equal values in both executions are one class", () => {
  expect(
    markNoise(
      played({ status: 200, body: { a: "t1", b: "t1", c: "u1", d: 1 } }),
      played({ status: 200, body: { a: "t2", b: "t2", c: "u2", d: 1 } }),
    ),
  ).toEqual({
    stable: true,
    noise: [
      { at: ["act", "response", "body", "a"], class: 1 },
      { at: ["act", "response", "body", "b"], class: 1 },
      { at: ["act", "response", "body", "c"], class: 2 },
    ],
  });
});

test("values equal in one execution only are two classes", () => {
  expect(
    markNoise(
      played({ status: 200, body: { a: "t1", b: "t1" } }),
      played({ status: 200, body: { a: "t2", b: "u2" } }),
    ),
  ).toEqual({
    stable: true,
    noise: [
      { at: ["act", "response", "body", "a"], class: 1 },
      { at: ["act", "response", "body", "b"], class: 2 },
    ],
  });
});

test("the arrange comes before the act, lists are walked, a different form is one place", () => {
  expect(
    markNoise(
      played({ status: 200, body: { l: [1, "t1"], m: { k: 1 }, n: [1] } }, [
        { status: 201, body: { a: "t1" } },
      ]),
      played({ status: 200, body: { l: [1, "t2"], m: { j: 1 }, n: [1, 2] } }, [
        { status: 201, body: { a: "t2" } },
      ]),
    ),
  ).toEqual({
    stable: true,
    noise: [
      { at: ["arrange", 0, "response", "body", "a"], class: 1 },
      { at: ["act", "response", "body", "l", 1], class: 1 },
      { at: ["act", "response", "body", "m"], class: 2 },
      { at: ["act", "response", "body", "n"], class: 3 },
    ],
  });
});

test("a body that is a text is one place", () => {
  expect(
    markNoise(played({ status: 500, body: "e1" }), played({ status: 500, body: "e2" })),
  ).toEqual({ stable: true, noise: [{ at: ["act", "response", "body"], class: 1 }] });
});

test("a status that differs makes the scenario unstable", () => {
  expect(
    markNoise(
      played({ status: 200, body: null }, [{ status: 201, body: { a: 1 } }]),
      played({ status: 404, body: null }, [{ status: 409, body: { a: 2 } }]),
    ),
  ).toEqual({
    stable: false,
    differences: [
      { at: ["arrange", 0, "response", "status"], first: 201, second: 409 },
      { at: ["act", "response", "status"], first: 200, second: 404 },
    ],
  });
});

test("two equal executions have no noise", () => {
  expect(
    markNoise(
      played({ status: 200, body: { a: [1] } }),
      played({ status: 200, body: { a: [1] } }),
    ),
  ).toEqual({ stable: true, noise: [] });
});
