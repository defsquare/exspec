import { afterAll, beforeEach, expect, test } from "bun:test";
import { startProxy } from "../src/io/proxy.ts";

let posted = 0;

const twin = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch: async (request) => {
    const { pathname } = new URL(request.url);
    if (pathname === "/slow") await Bun.sleep(300);
    posted += 1;
    return Response.json({ id: "e1" });
  },
});

const port = 9187;
const proxy = startProxy({
  port,
  quiet: 50,
  observables: [{ observable: "p", behind: `http://127.0.0.1:${twin.port}` }],
});

const call = async (method: string, path: string, init: RequestInit = {}) => {
  const response = await fetch(`http://127.0.0.1:${port}/p${path}`, { method, ...init });
  return { status: response.status, body: await response.text() };
};

beforeEach(async () => {
  await proxy.forgetSideEffects();
  posted = 0;
});

afterAll(async () => {
  await proxy.stopProxy();
  await twin.stop(true);
});

test("a call through the proxy reaches the twin and is recorded whole", async () => {
  const answered = await call("POST", "/b?k=1", {
    headers: { "content-type": "application/json", authorization: "key" },
    body: JSON.stringify({ to: "x" }),
  });
  expect({ answered, posted, taken: await proxy.takeSideEffects() }).toEqual({
    answered: { status: 200, body: '{"id":"e1"}' },
    posted: 1,
    taken: [
      {
        observable: "p",
        request: { method: "post", path: "/b", query: { k: "1" }, body: { to: "x" } },
        response: { status: 200, body: { id: "e1" } },
      },
    ],
  });
});

test("a call under /__ is recorded and passed on like any other", async () => {
  const answered = await call("GET", "/__a");
  expect({ answered, taken: await proxy.takeSideEffects() }).toEqual({
    answered: { status: 200, body: '{"id":"e1"}' },
    taken: [
      {
        observable: "p",
        request: { method: "get", path: "/__a" },
        response: { status: 200, body: { id: "e1" } },
      },
    ],
  });
});

test("a binary body is recorded as its length and digest", async () => {
  await call("POST", "/b", {
    headers: { "content-type": "application/pdf" },
    body: new Uint8Array([37, 80, 68, 70]),
  });
  expect(await proxy.takeSideEffects()).toEqual([
    {
      observable: "p",
      request: {
        method: "post",
        path: "/b",
        body: {
          bytes: 4,
          sha256: "315d429b7714cedb6ad04ac31240145257692630457f3c88253c5beceac76027",
        },
      },
      response: { status: 200, body: { id: "e1" } },
    },
  ]);
});

test("a take waits for a call still in flight", async () => {
  const slow = call("POST", "/slow");
  await Bun.sleep(20);
  const taken = await proxy.takeSideEffects();
  expect({ taken, slow: await slow }).toEqual({
    taken: [
      {
        observable: "p",
        request: { method: "post", path: "/slow" },
        response: { status: 200, body: { id: "e1" } },
      },
    ],
    slow: { status: 200, body: '{"id":"e1"}' },
  });
});

test("an unknown observable is answered 502 and recorded nowhere", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/z/b`, { method: "POST" });
  expect({ status: response.status, taken: await proxy.takeSideEffects() }).toEqual({
    status: 502,
    taken: [],
  });
});
