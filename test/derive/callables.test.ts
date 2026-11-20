import { expect, test } from "bun:test";
import { callablesOf } from "../../src/derive/roles-files.ts";

test("an operation may be called when its rules and its trigger parse: its inputs placed, its structure's fields, where it is answered", () => {
  expect(
    callablesOf([
      {
        path: "interfaces.yaml",
        text: `interfaces:
  - {interface: f, method: post, pattern: "/s/{x}", request: {path: {x: string}, body: {a: {b: int}}}, responses: {"201": {body: {data: [schema, S]}}}}
  - {interface: g, method: get, pattern: /g, request: {}, responses: {"200": {body: any}}}`,
      },
      {
        path: "structures.yaml",
        text: "[{structure: S, identity: id, fields: {id: {type: string}}}]",
      },
      {
        path: "roles/f/rules.yaml",
        text: "{operation: f, takes: {x: {says: an x}, b: {says: a b}}, answers: {says: the s, structure: S}}",
      },
      {
        path: "roles/f/trigger.yaml",
        text: "{trigger: f, interface: f, operation: f, sends: {b: [body, a, b]}, answers: {status: 201}}",
      },
      {
        path: "roles/g/rules.yaml",
        text: "{operation: g, answers: {says: x, structure: null}}",
      },
    ]),
  ).toEqual([
    {
      operation: "f",
      bound: {
        interface: "f",
        method: "post",
        pattern: "/s/{x}",
        request: { path: { x: "string" }, body: { a: { b: "int" } } },
        responses: { "201": { body: { data: ["schema", "S"] } } },
      },
      takes: { x: { says: "an x" }, b: { says: "a b" } },
      places: { x: ["path", "x"], b: ["body", "a", "b"] },
      unplaced: [],
      structure: "S",
      fields: ["id"],
      answer: { at: ["data"] },
    },
  ]);
});
