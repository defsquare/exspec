import { expect, test } from "bun:test";
import { playScenario } from "../../src/run/play.ts";
import { play } from "../../src/run/target-commands.ts";
import { parseExtraction } from "../../src/shapes/extraction.ts";
import type { HttpRequest, TargetResponse } from "../../src/shapes/scenario.ts";
import { scenarioSchema } from "../../src/shapes/scenario.ts";
import { bindings, facts, operation, target } from "../files.ts";
import { run } from "../played.ts";
import { extract, fakeIo, scenarioFile } from "./fake.ts";

const { extraction } = parseExtraction(
  Object.entries({
    "target.yaml": target,
    "interfaces.yaml": `
interfaces:
  - {interface: i, method: post, pattern: "/f/{a}", request: {path: {a: string}}, responses: {200: {body: any}}}
  - {interface: j, method: get, pattern: "/s/{a}", request: {path: {a: string}}, responses: {200: {body: any}}}
  - {interface: k, method: post, pattern: "/g", responses: {200: {body: any}}}
`,
    "structures.yaml": "- {structure: S, identity: a, fields: {a: {type: string}}}",
    "facts.yaml": `
- {fact: p, condition: [{caller: signed-in}]}
- {fact: q, condition: [{structure: S, where: {a: [call, a]}, must-be: [exists]}]}
`,
    "operations/f.yaml": `
operation: f
takes: {a: {field: [S, a]}}
requires: [{rule: signed-in, fact: p, otherwise: x}, {rule: exists, fact: q, otherwise: y}]
answers: null
`,
    "operations/g.yaml": "operation: g\ntakes: {}\nanswers: null\n",
    "bindings.yaml": `
projections:
  - {projection: v, interface: j, shows: [{structure: S, at: [s]}], locates: {a: [path, a]}, absent: 404}
triggers:
  - {trigger: t, interface: i, operation: f, sends: {a: [path, a]}, answers: {status: 200}, refuses: {x: {status: 401}, y: {status: 404}}}
  - {trigger: u, interface: k, operation: g, answers: {status: 200}}
`,
  }).map(([path, text]) => ({ path, text })),
);

const answer = (n: number): TargetResponse => ({ status: 200, body: n });

const scenario = scenarioSchema.parse(
  Bun.YAML.parse(`
scenario: s
says: s
proves: [exists]
assert: [{fact: q, as: v}, {fact: q, as: w}]
arrange: [{call: {operation: g}}]
act: {call: {operation: f, with: {a: x}, caller: u}}
`),
);

test("the readings are taken after the arrange, before the judged call and after it", async () => {
  const sent: string[] = [];
  const send = async ({ method, url, headers }: HttpRequest) => {
    sent.push(`${method} ${url} ${headers.Authorization ?? "-"}`);
    return answer(sent.length);
  };
  const played = await playScenario({
    scenario,
    extraction,
    credentials: { u: { Authorization: "ku" }, v: { Authorization: "kv" } },
    send,
    run,
  });
  expect({ sent, played }).toEqual({
    sent: [
      "post http://h/g -",
      "get http://h/s/x ku",
      "get http://h/s/x kv",
      "post http://h/f/x ku",
      "get http://h/s/x ku",
      "get http://h/s/x kv",
    ],
    played: {
      scenario: "s",
      says: "s",
      proves: ["exists"],
      assert: [
        { fact: "q", as: "v" },
        { fact: "q", as: "w" },
      ],
      run,
      arrange: [{ call: { operation: "g", with: {} }, response: answer(1) }],
      act: {
        call: { operation: "f", with: { a: "x" }, caller: "u" },
        response: answer(4),
      },
      readings: [
        { of: { fact: "p" }, as: "u", before: [], after: [] },
        { of: { fact: "q" }, as: "u", before: [answer(2)], after: [answer(5)] },
        { of: { fact: "q" }, as: "v", before: [answer(3)], after: [answer(6)] },
        {
          of: { fact: "q" },
          as: "w",
          before: [{ unreadable: 'no credentials for "w"' }],
          after: [{ unreadable: 'no credentials for "w"' }],
        },
      ],
    },
  });
});

test("play shows the verdicts of each copy it played", async () => {
  const { io } = fakeIo({ "http://h/f/x": [{ status: 404, body: null }] });
  const events = await Array.fromAsync(
    play(
      {
        dir: "/d",
        extraction: extract({
          "facts.yaml": facts,
          "operations/f.yaml": operation,
          "bindings.yaml": bindings,
          "scenarios/f/a.yaml": scenarioFile("x").replace("[r]", "[q, r]"),
        }),
        paths: [],
      },
      io,
    ),
  );
  expect(events.filter(({ type }) => type === "scenario-judged")).toEqual([
    {
      type: "scenario-judged",
      path: "f/a",
      rules: [
        { rule: "q", verdict: "unjudged", reason: "the fact has no condition" },
        { rule: "r", verdict: "not-exercised", reason: "refused" },
      ],
      binding: { verdict: "not-exercised" },
    },
  ]);
});
