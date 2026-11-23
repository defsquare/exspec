import { expect, test } from "bun:test";
import { checkPointedAtProxy } from "../../src/derive/check-pointed-at-proxy.ts";
import type { Target } from "../../src/shapes/target.ts";

const target: Target = {
  target: "t",
  start: ["sh exspec/target/start.sh"],
  alive: { method: "get", path: "/alive", status: 200 },
  seed: [],
  reset: [],
  stop: [],
  api: { "base-url": "http://h" },
  proxy: { port: 9100, quiet: 150 },
  observables: [{ observable: "p", kind: "provider" }],
};

const notNamed = [
  'target.yaml: the provider "p" is declared and nothing that starts the target names it at the proxy — expected http://127.0.0.1:9100/p in the start lines or in a file of exspec/target/',
];

test("a provider named at the proxy in a start line passes", () => {
  expect(
    checkPointedAtProxy({ ...target, start: ["P_URL=http://127.0.0.1:9100/p run"] }, []),
  ).toEqual([]);
});

test("a provider named at the proxy in a file of the target passes", () => {
  expect(checkPointedAtProxy(target, ["a=1\nP_URL=http://127.0.0.1:9100/p\n"])).toEqual(
    [],
  );
});

test("a longer name at the proxy does not name the provider", () => {
  expect(checkPointedAtProxy(target, ["P_URL=http://127.0.0.1:9100/pq"])).toEqual(
    notNamed,
  );
});

test("a provider named nowhere is a finding", () => {
  expect(checkPointedAtProxy(target, ["P_URL=https://p.example.com"])).toEqual(notNamed);
});

test("a proxy with no provider is a finding", () => {
  expect(checkPointedAtProxy({ ...target, observables: [] }, [])).toEqual([
    "target.yaml: a proxy is declared and no provider — declare each provider the target calls, or remove the proxy",
  ]);
});

test("no provider declared: nothing to find", () => {
  const { proxy: _proxy, observables: _observables, ...plain } = target;
  expect(checkPointedAtProxy(plain, [])).toEqual([]);
});
