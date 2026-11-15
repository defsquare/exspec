import { expect, test } from "bun:test";
import { playSteps } from "../../src/run/play-steps.ts";
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
