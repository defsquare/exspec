import { expect, test } from "bun:test";
import { judgeExtraction } from "../../src/derive/provenance.ts";
import type { RuleJudged } from "../../src/shapes/event.ts";
import { parseExtraction } from "../../src/shapes/extraction.ts";
import { bindings, interfaces, operation, target } from "../files.ts";

const referenceAnswering = (status: number) => `
scenario: s
says: s
proves: [q]
run: {target: t, version: v, at: "2026-11-13T10:00:00.000Z", clock: null}
arrange: []
act:
  call: {operation: f, with: {a: x}}
  response: {status: ${status}, body: null}
noise: []
`;

const judge = (references: Readonly<Record<string, number>>) =>
  judgeExtraction(
    parseExtraction(
      Object.entries({
        "target.yaml": target,
        "interfaces.yaml": interfaces,
        "facts.yaml": "- {fact: p, condition: [{caller: signed-in}]}",
        "operations/f.yaml": operation,
        "bindings.yaml": bindings,
        "scenarios/f/c.yaml":
          "{scenario: s, says: s, proves: [r], act: {call: {operation: f, with: {a: x}}}}",
        ...Object.fromEntries(
          Object.entries(references).map(([path, status]) => [
            `references/${path}.yaml`,
            referenceAnswering(status),
          ]),
        ),
      }).map(([path, text]) => ({ path, text })),
    ).extraction,
  );

test("one refuting reference refutes a rule, one verifying verifies it; a rule no reference proves is declared only", () => {
  const notYet: RuleJudged = {
    type: "rule-judged",
    operation: "f",
    rule: "r",
    provenance: "declared-only",
    reason: "no reference yet",
    by: [],
  };
  expect([judge({ "f/a": 404, "f/b": 200 }), judge({ "f/a": 404 })]).toEqual([
    {
      rules: [
        {
          type: "rule-judged",
          operation: "f",
          rule: "q",
          provenance: "refuted",
          by: [
            { scenario: "f/a", verdict: "verified" },
            {
              scenario: "f/b",
              verdict: "refuted",
              reason: "accepted where the fact was false",
            },
          ],
        },
        notYet,
      ],
      bindings: [
        {
          type: "binding-judged",
          trigger: "t",
          provenance: "verified",
          by: [
            { scenario: "f/a", verdict: "verified" },
            { scenario: "f/b", verdict: "verified" },
          ],
        },
      ],
    },
    {
      rules: [
        {
          type: "rule-judged",
          operation: "f",
          rule: "q",
          provenance: "verified",
          by: [{ scenario: "f/a", verdict: "verified" }],
        },
        notYet,
      ],
      bindings: [
        {
          type: "binding-judged",
          trigger: "t",
          provenance: "verified",
          by: [{ scenario: "f/a", verdict: "verified" }],
        },
      ],
    },
  ]);
});
