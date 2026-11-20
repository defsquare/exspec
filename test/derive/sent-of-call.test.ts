import { expect, test } from "bun:test";
import { sentOfCall } from "../../src/derive/sent-of-call.ts";
import type { InputPlace } from "../../src/shapes/bindings.ts";
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

test("each input is sent at its place, a query value keeping its type", () => {
  expect(
    sentOfCall({
      call: { operation: "f", with: { x: "u v", q: 2, b: 1, c: "k" } },
      places: {
        x: ["path", "x"],
        q: ["query", "q"],
        b: ["body", "a", "b"],
        c: ["body", "c"],
      },
      bound,
    }),
  ).toEqual({
    sent: {
      method: "post",
      path: "/s/u%20v/t",
      query: { q: 2 },
      body: { a: { b: 1 }, c: "k" },
    },
  });
});

test("an interface that takes a form is sent one, empty when no input goes to it; a hole in the path is left as written", () => {
  const places: Readonly<Record<string, InputPlace>> = {
    x: ["path", "x"],
    to: ["form", "to"],
  };
  expect([
    sentOfCall({
      call: { operation: "g", with: { x: "{{s.id}}", to: "a@b" } },
      places,
      bound: formed,
    }),
    sentOfCall({ call: { operation: "g", with: { x: "p" } }, places, bound: formed }),
  ]).toEqual([
    { sent: { method: "post", path: "/f/{{s.id}}", form: { to: "a@b" } } },
    { sent: { method: "post", path: "/f/p", form: {} } },
  ]);
});

test("an input with no place, or a path parameter no input fills, cannot be sent", () => {
  expect([
    sentOfCall({
      call: { operation: "f", with: { x: "p", z: 1 } },
      places: { x: ["path", "x"] },
      bound,
    }),
    sentOfCall({
      call: { operation: "f", with: { q: 1 } },
      places: { q: ["query", "q"] },
      bound,
    }),
  ]).toEqual([
    { refused: '"z" has no place in post /s/{x}/t' },
    { refused: 'the path parameter "x" of post /s/{x}/t is not given' },
  ]);
});
