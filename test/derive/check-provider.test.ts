import { expect, test } from "bun:test";
import { checkProvider } from "../../src/derive/check-provider.ts";
import { checkService } from "../../src/derive/check-service.ts";

const interfaces = `
interfaces:
  - {interface: make, method: post, pattern: /made, responses: {"200": {body: any, headers: {x-a: string}}}}
`;

const provider = `
provider: p
renders: s
state:
  shape: {made: int, kept: [string]}
  says: made counts what was made; a key not in kept is gone
expects:
  - {expect: make-gives-key, on: make, says: a made item is answered with its key in x-a, source: src/a/b.ts}
unsure:
  - whether a key is ever answered without x-a
`;

const service = `
service: s
says: keeps a document and gives it back by its key
conditions:
  - {condition: forgets-everything, says: no document is kept any longer}
  - {condition: refuses, takes: {address: string}, says: what is sent to that address is refused}
`;

const files = (more: Readonly<Record<string, string>>) =>
  Object.entries(more).map(([path, text]) => ({ path, text }));

test("a provider whose two files pass, rendering a service that passes, has no finding", () => {
  expect(
    checkProvider(
      files({
        "providers/p/interfaces.yaml": interfaces,
        "providers/p/provider.yaml": provider,
        "services/s.yaml": service,
      }),
      "p",
    ),
  ).toEqual({ renders: "s", findings: [] });
});

test("a missing file, or one that does not parse, is a finding", () => {
  expect([
    checkProvider([], "p"),
    checkProvider(
      files({
        "providers/p/interfaces.yaml": "interfaces: [",
        "providers/p/provider.yaml": "provider: p",
      }),
      "p",
    ),
  ]).toEqual([
    { findings: ["interfaces.yaml: missing", "provider.yaml: missing"] },
    {
      findings: [
        "interfaces.yaml: not YAML: YAML Parse error: Unexpected token",
        "provider.yaml: renders: Invalid input: expected string, received undefined",
        "provider.yaml: state: Invalid input: expected object, received undefined",
        "provider.yaml: expects: Invalid input: expected array, received undefined",
      ],
    },
  ]);
});

test("a broken provider gives a finding for each thing to fix", () => {
  expect(
    checkProvider(
      files({
        "providers/q/interfaces.yaml": `
interfaces:
  - {interface: make, method: post, pattern: /made, responses: {"200": {body: [schema, N]}}}
`,
        "providers/q/provider.yaml": `
provider: p
renders: t
state: {shape: {made: int}, says: made counts what was made}
expects:
  - {expect: make-gives-key, on: make, says: a key in x-a, source: src/a/b.ts}
  - {expect: make-gives-key, on: take, says: a key in x-a, source: src/a/b.ts}
`,
      }),
      "q",
    ),
  ).toEqual({
    renders: "t",
    findings: [
      'interfaces.yaml: interfaces.make.responses.200.body: unknown schema "N"',
      'provider.yaml: provider is "p", the provider is "q"',
      "services/t.yaml: missing",
      'provider.yaml: the expectation "make-gives-key" is declared twice',
      'provider.yaml: the expectation "make-gives-key" is on "take", which interfaces.yaml does not declare',
    ],
  });
});

test("a provider with no interface is a finding", () => {
  expect(
    checkProvider(
      files({
        "providers/p/interfaces.yaml": "interfaces: []",
        "providers/p/provider.yaml": provider,
        "services/s.yaml": service,
      }),
      "p",
    ).findings,
  ).toEqual([
    "interfaces.yaml: no interface is declared",
    'provider.yaml: the expectation "make-gives-key" is on "make", which interfaces.yaml does not declare',
  ]);
});

test("a service that says another name, a condition twice, or a key it does not know gives a finding each", () => {
  expect([
    checkService(
      files({
        "services/s.yaml": `
service: t
says: keeps a document
conditions:
  - {condition: refuses, says: a}
  - {condition: refuses, says: b}
`,
      }),
      "s",
    ),
    checkService(
      files({ "services/s.yaml": "{service: s, says: a, conditions: [], status: 200}" }),
      "s",
    ),
  ]).toEqual([
    {
      findings: [
        'services/s.yaml: service is "t", the service is "s"',
        'services/s.yaml: the condition "refuses" is declared twice',
      ],
    },
    { findings: ['services/s.yaml: (file): Unrecognized key: "status"'] },
  ]);
});

test("a service rendered by two providers is a finding of each", () => {
  expect(
    checkProvider(
      files({
        "providers/p/interfaces.yaml": interfaces,
        "providers/p/provider.yaml": provider,
        "providers/q/provider.yaml": provider.replace("provider: p", "provider: q"),
        "services/s.yaml": service,
      }),
      "p",
    ).findings,
  ).toEqual(['provider.yaml: "s" is rendered by "q" too: a service has one provider']);
});
