import { expect, test } from "bun:test";
import type { AnswerPlace } from "../../src/derive/answer-place.ts";
import {
  callOfRequest,
  type Exposure,
  holesOnTheWire,
} from "../../src/derive/call-of-request.ts";
import { sentOfCall } from "../../src/derive/sent-of-call.ts";
import type { Sent } from "../../src/shapes/roles.ts";

const exposures: readonly Exposure[] = [
  {
    operation: "f",
    bound: {
      interface: "i",
      method: "post",
      pattern: "/s/{x}/t",
      request: {
        path: { x: "string" },
        query: { q: "int" },
        body: { a: { b: "int" }, c: "string" },
      },
      responses: { "201": { body: null } },
    },
    places: {
      x: ["path", "x"],
      q: ["query", "q"],
      b: ["body", "a", "b"],
      c: ["body", "c"],
    },
  },
  {
    operation: "g",
    bound: {
      interface: "j",
      method: "post",
      pattern: "/f/{x}",
      request: { path: { x: "string" }, form: { to: "string" } },
      responses: { "302": { body: null } },
    },
    places: { x: ["path", "x"], to: ["form", "to"] },
  },
];

const answered: ReadonlyMap<string, AnswerPlace> = new Map<string, AnswerPlace>([
  ["s", { at: ["data"] }],
  ["n", { none: "the step does not convert" }],
]);

const requests: readonly Sent[] = [
  {
    method: "post",
    path: "/s/{{s.body.data.id}}/t",
    query: { q: 2 },
    body: { a: { b: 1 }, c: "{{s.body.data.c}}" },
  },
  { method: "post", path: "/f/p%20q", form: { to: "a@b" } },
  { method: "post", path: "/f/p", form: {} },
];

const on = (path: string, body?: Sent["body"]): Sent =>
  body === undefined ? { method: "post", path } : { method: "post", path, body };

test("a request is the call of the operation whose interface matches it, a hole read in the answered structure", () => {
  expect(
    requests.map((request) => callOfRequest({ request, exposures, answered })),
  ).toEqual([
    {
      call: {
        operation: "f",
        with: { x: "{{s.id}}", q: 2, b: 1, c: "{{s.c}}" },
      },
    },
    { call: { operation: "g", with: { x: "p q", to: "a@b" } } },
    { call: { operation: "g", with: { x: "p" } } },
  ]);
});

test("the call of a request, its holes put back on the wire, is sent as the request", () => {
  expect(
    requests.map((request) => {
      const converted = callOfRequest({ request, exposures, answered });
      const exposure = exposures.find(
        ({ operation }) => "call" in converted && converted.call.operation === operation,
      );
      return "call" in converted && exposure !== undefined
        ? sentOfCall({
            call: holesOnTheWire(converted.call, answered),
            places: exposure.places,
            bound: exposure.bound,
          })
        : converted;
    }),
  ).toEqual(requests.map((sent) => ({ sent })));
});

test("a request no call can say is refused with why", () => {
  expect(
    [
      { method: "get", path: "/z" } satisfies Sent,
      on("/s/p/t", [1, 2]),
      on("/s/p/t", { a: { b: 1 }, z: 3 }),
      on("/s/a{{s.body.data.id}}/t"),
      on("/s/p/t", { c: "x{{s.body.data.c}}" }),
      on("/s/p/t", { c: "{{s.status}}" }),
      on("/s/p/t", { c: "{{m.body.x}}" }),
      on("/s/p/t", { c: "{{n.body.x}}" }),
      on("/s/a%zz/t"),
    ].map((request) => callOfRequest({ request, exposures, answered })),
  ).toEqual([
    { refused: [{ reason: "no-interface", what: "no interface read answers get /z" }] },
    {
      refused: [
        {
          reason: "unplaced-value",
          what: "body: [1,2] is written, the call sends nothing",
        },
      ],
    },
    {
      refused: [
        {
          reason: "unplaced-value",
          what: 'body: {"a":{"b":1},"z":3} is written, the call sends {"a":{"b":1}}',
        },
      ],
    },
    {
      refused: [
        {
          reason: "hole-in-text",
          what: '"a{{s.body.data.id}}" holds a hole and more',
        },
      ],
    },
    {
      refused: [
        { reason: "hole-in-text", what: '"x{{s.body.data.c}}" holds a hole and more' },
      ],
    },
    {
      refused: [
        {
          reason: "hole-outside-structure",
          what: '{{s.status}} reads outside the structure "s" answers, at body.data',
        },
      ],
    },
    {
      refused: [
        { reason: "hole-unknown-step", what: "{{m.body.x}} names no step before it" },
      ],
    },
    {
      refused: [
        {
          reason: "hole-unconverted-step",
          what: '{{n.body.x}} names "n": the step does not convert',
        },
      ],
    },
    {
      refused: [
        {
          reason: "malformed-path",
          what: 'path parameter "x": /s/a%zz/t is not a path one can decode',
        },
      ],
    },
  ]);
});
