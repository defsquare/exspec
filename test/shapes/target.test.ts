import { expect, test } from "bun:test";
import { parseExtraction } from "../../src/shapes/extraction.ts";

const target = `
target: t
start: [start]
alive: {method: get, path: /alive, status: 200}
seed: [seed]
reset: [reset]
stop: [stop]
api: {base-url: "http://h"}
`;

const proxy = "proxy: {port: 9100}\n";
const observables = `observables:
  - {observable: p, kind: provider}
`;

const parsed = (text: string) => {
  const { extraction, problems } = parseExtraction([{ path: "target.yaml", text }]);
  return { target: extraction.target, problems };
};

test("a proxy and the observables behind it are read, quiet 150 ms when not given", () => {
  expect(parsed(target + proxy + observables)).toEqual({
    target: {
      target: "t",
      start: ["start"],
      alive: { method: "get", path: "/alive", status: 200 },
      seed: ["seed"],
      reset: ["reset"],
      stop: ["stop"],
      api: { "base-url": "http://h" },
      proxy: { port: 9100, quiet: 150 },
      observables: [{ observable: "p", kind: "provider" }],
    },
    problems: [],
  });
});

test("an unknown key of an observable is a problem", () => {
  const behind = `observables:
  - {observable: p, kind: provider, behind: "http://h/p"}
`;
  expect(parsed(target + proxy + behind).problems).toEqual([
    { file: "target.yaml", at: "observables.0", message: 'Unrecognized key: "behind"' },
  ]);
});

test("a response may describe the headers its caller reads", () => {
  const text = `
interfaces:
  - {interface: a, method: get, pattern: /a, responses: {"200": {body: any, headers: {x-a: string}}}}
`;
  expect(parseExtraction([{ path: "interfaces.yaml", text }])).toEqual({
    extraction: {
      schemas: [],
      interfaces: [
        {
          interface: "a",
          method: "get",
          pattern: "/a",
          request: {},
          responses: { "200": { body: "any", headers: { "x-a": "string" } } },
        },
      ],
      structures: [],
      facts: [],
      operations: [],
      projections: [],
      triggers: [],
      scenarios: [],
      references: [],
    },
    problems: [],
  });
});

test("observables without a proxy, or a proxy without observables, is a problem", () => {
  const problem = {
    file: "target.yaml",
    at: "",
    message: "proxy and observables go together: one is given without the other",
  };
  expect([
    parsed(target + observables).problems,
    parsed(target + proxy).problems,
  ]).toEqual([[problem], [problem]]);
});
