import { expect, test } from "bun:test";
import { viewOfServices } from "../../src/derive/services-view.ts";
import { providerSchema } from "../../src/shapes/provider.ts";
import { serviceSchema } from "../../src/shapes/service.ts";
import { interfacesFileSchema } from "../../src/shapes/target.ts";

const service = serviceSchema.parse(
  Bun.YAML.parse(`
service: s
says: keeps a document
conditions:
  - {condition: c1, takes: {a: string}, says: refuses a}
  - {condition: c2, says: forgets everything}
unsure: [whether one is forgotten alone]
`),
);

const provider = providerSchema.parse(
  Bun.YAML.parse(`
provider: p
renders: s
state: {shape: {kept: [string]}, says: a key not in kept is gone}
expects:
  - {expect: e, on: i, says: a key is given, source: src/a.ts}
unsure: [whether i ever answers 500]
`),
);

const { interfaces } = interfacesFileSchema.parse(
  Bun.YAML.parse(`
interfaces:
  - {interface: i, method: post, pattern: /x, responses: {200: {body: any}}}
`),
);

const sent = (status: number) => ({
  observable: "p",
  request: { method: "post" as const, path: "/x" },
  response: { status, body: null },
});

test("a service says the rules resting on it, the scenarios giving each condition, and its provider's calls", () => {
  expect(
    viewOfServices({
      services: [
        service,
        serviceSchema.parse({ service: "t", says: "x", conditions: [] }),
      ],
      providers: [{ provider, interfaces }],
      operations: [
        {
          operation: "f",
          lines: [
            { rule: "r1", short: "f1", service: "s" },
            { rule: "r2", short: "f2" },
            { rule: "r3", short: "f3", service: "s" },
          ],
        },
        { operation: "g", lines: [{ rule: "r4", short: "f4", service: "s" }] },
      ],
      scenarios: [
        {
          path: "f/a",
          steps: [{ service: "s", is: "c1" }, { sideEffects: [sent(200), sent(503)] }],
        },
        { path: "f/b", steps: [{ service: "s", is: "c1" }, { sideEffects: [] }] },
        { path: "g/a", steps: [{}, { sideEffects: [sent(200)] }] },
      ],
    }),
  ).toEqual([
    {
      service: "s",
      says: "keeps a document",
      unsure: ["whether one is forgotten alone"],
      in: [
        { operation: "f", rules: 2 },
        { operation: "g", rules: 1 },
      ],
      conditions: [
        {
          condition: "c1",
          takes: { a: "string" },
          says: "refuses a",
          given: ["f/a", "f/b"],
        },
        { condition: "c2", takes: {}, says: "forgets everything", given: [] },
      ],
      rules: [
        { operation: "f", rule: "r1", says: "f1" },
        { operation: "f", rule: "r3", says: "f3" },
        { operation: "g", rule: "r4", says: "f4" },
      ],
      provider: {
        provider: "p",
        calls: 3,
        scenarios: 2,
        interfaces: [{ interface: "i", method: "post", pattern: "/x" }],
        expects: [{ expect: "e", on: "i", says: "a key is given", source: "src/a.ts" }],
        unsure: ["whether i ever answers 500"],
      },
    },
    {
      service: "t",
      says: "x",
      unsure: [],
      in: [],
      conditions: [],
      rules: [],
      provider: null,
    },
  ]);
});
