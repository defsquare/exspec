import { evidenceAt, judgeTaskOf } from "../src/derive/roles-files.ts";
import type { SourceFile } from "../src/shapes/extraction.ts";
import type { Evidence } from "../src/shapes/roles.ts";
import type { Interface } from "../src/shapes/target.ts";
import { target } from "./files.ts";

// one interface f at each point of its roles: the files of each, beside the reading

export type Files = Readonly<Record<string, string>>;

export const bound: Interface = {
  interface: "f",
  method: "get",
  pattern: "/f/{a}",
  request: {},
  responses: { 200: { body: "any" } },
};

export const declared: Files = {
  "target.yaml": target,
  "interfaces.yaml": `
interfaces:
  - {interface: f, method: get, pattern: "/f/{a}", responses: {200: {body: any}}}
`,
};

export const reading: Files = {
  ...declared,
  "structures.yaml": "- {structure: S, identity: a, fields: {a: {type: string}}}",
  "roles/common.yaml": "target: t",
  "roles/protocol.yaml": "target: t",
  "roles/f/trigger.yaml":
    "{trigger: f, interface: f, operation: f, answers: {status: 200}, refuses: {not-found: {status: 404, body: empty}}}",
  "roles/f/rules.yaml": `
operation: f
requires:
  - {rule: exists, fact: the item exists, otherwise: not-found, source: "F.java:1"}
answers: {says: "the item", structure: null}
`,
  "roles/f/hints.yaml":
    "- {rule: exists, situation: s, how: h, seen-in: none, reachable: yes}",
  "states.yaml": "[]",
};

export const filesOf = (more: Files): readonly SourceFile[] =>
  Object.entries({ ...reading, ...more }).map(([path, text]) => ({ path, text }));

const scenario = (path: string, as = "u") => `
rule: exists
situation: an id no item has
reached: yes
steps:
  - {when: call, as: ${as}, request: {method: get, path: ${path}}}
`;

export const evidenceOf = (more: Partial<Evidence> = {}): Evidence => ({
  rule: "exists",
  run: { target: "t", version: "v", at: "2026-11-01T10:00:00.000Z", clock: null },
  exchanges: [
    {
      when: "call",
      as: "u",
      request: { method: "get", path: "/f/x" },
      response: { status: 404, body: null },
    },
  ],
  ...more,
});

const recorded = (evidence: Evidence): Files => ({
  "roles/f/scenarios/exists-a.yaml": scenario("/f/x"),
  "roles/f/evidence/exists-a.yaml": Bun.YAML.stringify(evidence, null, 2),
});

const judgementOf = (more: Readonly<Record<string, string>>) => ({
  scenario: "exists-a",
  situation: "yes",
  verdict: "holds",
  confidence: 1,
  evidence: "e",
  ...more,
});

export const judgedAs = (
  of: string,
  verdict = "holds",
  state?: { readonly of: string; readonly verdict: string },
): Files => ({
  "roles/f/judgements.yaml": Bun.YAML.stringify({
    model: "m",
    at: "2026-11-01T10:00:00.000Z",
    judgements: [
      judgementOf({ verdict, rule: "exists", of }),
      ...(state === undefined ? [] : [judgementOf({ ...state, state: "s" })]),
    ],
  }),
});

const reference = evidenceOf({ noise: [] });

export const hash =
  judgeTaskOf(filesOf(recorded(reference)), bound, [
    { slug: "exists-a", evidence: reference },
  ])?.of.get("exists-a") ?? "";

// the hash of the state s judged on the evidence of exists-a, in these files
export function stateHashIn(more: Files): string {
  const files = filesOf(more);
  const evidence = evidenceAt(files, "f", "exists-a");
  return evidence === undefined
    ? ""
    : (judgeTaskOf(files, bound, [{ slug: "exists-a", evidence }])?.ofStates.get("s") ??
        "");
}

export const points = {
  "no scenario": {},
  "played once": recorded(evidenceOf()),
  "a reference": recorded(reference),
  "a stale judgement": { ...recorded(reference), ...judgedAs("h") },
  judged: { ...recorded(reference), ...judgedAs(hash) },
  "edited after its evidence": {
    ...recorded(reference),
    "roles/f/scenarios/exists-a.yaml": scenario("/f/y"),
  },
  "as an unknown actor": {
    "roles/f/scenarios/exists-a.yaml": scenario("/f/x", "c"),
    "roles/f/evidence/exists-a.yaml": Bun.YAML.stringify(
      evidenceOf({
        exchanges: [{ when: "call", as: "c", unplayable: 'no credentials for "c"' }],
      }),
      null,
      2,
    ),
  },
} satisfies Readonly<Record<string, Files>>;
