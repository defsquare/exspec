import { expect, test } from "bun:test";
import { stepRequest } from "../../src/derive/step-request.ts";

test("a step's request: the base URL, its path and query, the actor's headers", () => {
  expect([
    stepRequest({
      base: "http://h",
      sent: { method: "post", path: "/a/7", query: { x: 1, y: "b c" }, body: { n: 1 } },
      headers: { Authorization: "k" },
    }),
    stepRequest({ base: "http://h", sent: { method: "get", path: "/a" }, headers: {} }),
  ]).toEqual([
    {
      method: "post",
      url: "http://h/a/7?x=1&y=b+c",
      headers: { Authorization: "k", "Content-Type": "application/json" },
      body: { n: 1 },
    },
    { method: "get", url: "http://h/a", headers: {} },
  ]);
});

test("a form is sent as its fields, each a string, with the form content type", () => {
  expect(
    stepRequest({
      base: "http://h",
      sent: { method: "post", path: "/a", form: { to: "x y", n: 1 } },
      headers: { Authorization: "k" },
    }),
  ).toEqual({
    method: "post",
    url: "http://h/a",
    headers: { Authorization: "k", "Content-Type": "application/x-www-form-urlencoded" },
    form: { to: "x y", n: "1" },
  });
});

test("a form field whose value is null is left out", () => {
  expect(
    stepRequest({
      base: "http://h",
      sent: { method: "post", path: "/a", form: { to: "x", gone: null } },
      headers: {},
    }),
  ).toEqual({
    method: "post",
    url: "http://h/a",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    form: { to: "x" },
  });
});
