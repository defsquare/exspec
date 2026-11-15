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
