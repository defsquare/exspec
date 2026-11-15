import { expect, test } from "bun:test";
import { fillHoles, holesOf } from "../../src/derive/holes.ts";

const answers = new Map([
  ["m", { status: 201, body: { id: 7, tags: [{ name: "a b" }] } }],
  ["n", { status: 200, body: null }],
]);

test("a hole alone in a string keeps its value's type; in the path it is a segment", () => {
  expect(
    fillHoles(
      {
        method: "put",
        path: "/a/{{m.body.id}}/t/{{m.body.tags.0.name}}",
        query: { at: "{{m.body.id}}", x: "y" },
        body: { id: "{{m.body.id}}", tags: "{{m.body.tags}}", s: "{{m.status}}" },
      },
      answers,
    ),
  ).toEqual({
    sent: {
      method: "put",
      path: "/a/7/t/a%20b",
      query: { at: 7, x: "y" },
      body: { id: 7, tags: [{ name: "a b" }], s: 201 },
    },
  });
});

test("a hole that resolves to nothing makes the step unplayable", () => {
  expect([
    fillHoles({ method: "get", path: "/a/{{m.body.missing}}" }, answers),
    fillHoles({ method: "post", path: "/a", body: { x: "{{z.body.id}}" } }, answers),
    fillHoles({ method: "get", path: "/a/{{n.body.id}}" }, answers),
  ]).toEqual([
    { unplayable: "{{m.body.missing}} resolves to nothing" },
    { unplayable: "{{z.body.id}} resolves to nothing" },
    { unplayable: "{{n.body.id}} resolves to nothing" },
  ]);
});

test("the holes a request cites, and those inside a longer string outside the path", () => {
  expect(
    holesOf({
      method: "post",
      path: "/a/{{m.body.id}}-{{n.body.k}}",
      query: { q: "x{{m.body.id}}" },
      body: { a: ["{{p.body.id}}", "id {{p.body.id}}"] },
    }),
  ).toEqual({ cited: ["m", "n", "p"], misplaced: ["query.q", "body.a.1"] });
});
