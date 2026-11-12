import { expect, test } from "bun:test";
import { requestOf, UnplayableCall } from "../../src/derive/request.ts";
import { type Extraction, parseExtraction } from "../../src/shapes/extraction.ts";
import type { Call } from "../../src/shapes/scenario.ts";

const files: Readonly<Record<string, string>> = {
  "target.yaml": `
target: t
start: [s]
alive: {method: get, path: /a, status: 200}
seed: []
reset: []
stop: []
api: {base-url: "http://h/api"}
`,
  "interfaces.yaml": `
interfaces:
  - interface: i
    method: delete
    pattern: /s/{a}/f
    request: {path: {a: string}, query: {x: int}, body: {o: {b: string, c: string}}}
    responses: {200: {body: null}}
`,
  "bindings.yaml": `
triggers:
  - trigger: t
    interface: i
    operation: f
    sends: {a: [path, a], x: [query, x], b: [body, o, b], c: [body, o, c]}
    answers: {status: 200}
`,
};

function extract(overrides: Readonly<Record<string, string>> = {}): Extraction {
  return parseExtraction(
    Object.entries({ ...files, ...overrides }).map(([path, text]) => ({ path, text })),
  ).extraction;
}

const credentials = { u: { Authorization: "Token k" } };

const call = (fields: Partial<Call>): Call => ({ operation: "f", with: {}, ...fields });

function refusal(run: () => unknown) {
  try {
    run();
    return undefined;
  } catch (error) {
    return error instanceof UnplayableCall
      ? { type: error.type, message: error.message }
      : error;
  }
}

test("a call becomes the request its trigger describes", () => {
  expect(
    requestOf({
      call: call({ with: { a: "a b", x: 1, b: "v", c: "w" }, caller: "u" }),
      extraction: extract(),
      credentials,
    }),
  ).toEqual({
    method: "delete",
    url: "http://h/api/s/a%20b/f?x=1",
    headers: { Authorization: "Token k", "Content-Type": "application/json" },
    body: { o: { b: "v", c: "w" } },
  });
});

test("a call with no caller and no body sends no header", () => {
  expect(
    requestOf({ call: call({ with: { a: "a" } }), extraction: extract(), credentials }),
  ).toEqual({ method: "delete", url: "http://h/api/s/a/f", headers: {} });
});

test("a call that cannot be sent is unplayable", () => {
  const extraction = extract();
  expect([
    refusal(() =>
      requestOf({ call: call({ with: { a: "a", z: 1 } }), extraction, credentials }),
    ),
    refusal(() =>
      requestOf({
        call: call({ with: { a: "a" }, caller: "v" }),
        extraction,
        credentials,
      }),
    ),
    refusal(() => requestOf({ call: call({}), extraction, credentials })),
    refusal(() =>
      requestOf({
        call: call({ with: { a: "a" } }),
        extraction: { ...extraction, target: undefined },
        credentials,
      }),
    ),
  ]).toEqual([
    { type: "unplayable-call", message: '"z" is sent nowhere by "t"' },
    { type: "unplayable-call", message: 'no credentials for "v"' },
    {
      type: "unplayable-call",
      message: 'the path parameter "a" of /s/{a}/f is not given',
    },
    { type: "unplayable-call", message: "the extraction names no target" },
  ]);
});
