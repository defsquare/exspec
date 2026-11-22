import { expect, test } from "bun:test";
import { parseJudgeAnswer } from "../../src/derive/judge-answer.ts";
import type { Judged } from "../../src/shapes/roles.ts";

const entry = (scenario: string): Judged => ({
  scenario,
  situation: "yes",
  verdict: "holds",
  confidence: 0.9,
  evidence: "the call answered 404",
});

test("the answer, fenced or not, in the order of the recordings", () => {
  expect([
    parseJudgeAnswer(`\`\`\`json\n${JSON.stringify([entry("b"), entry("a")])}\n\`\`\``, [
      "a",
      "b",
    ]),
    parseJudgeAnswer(JSON.stringify([entry("a")]), ["a"]),
  ]).toEqual([{ judged: [entry("a"), entry("b")] }, { judged: [entry("a")] }]);
});

test("what is wrong with an answer, for the judge to fix", () => {
  expect([
    parseJudgeAnswer(undefined, ["a"]),
    parseJudgeAnswer("Here it is: []", ["a"]),
    parseJudgeAnswer(JSON.stringify([{ ...entry("a"), verdict: "fine" }]), ["a"]),
    parseJudgeAnswer(JSON.stringify([entry("a"), entry("a"), entry("c")]), ["a", "b"]),
  ]).toEqual([
    { findings: ["no answer: one JSON array is expected"] },
    {
      findings: [
        'the answer is not one JSON array and nothing else: JSON Parse error: Unexpected identifier "Here"',
      ],
    },
    {
      findings: [
        '0.verdict: Invalid option: expected one of "holds"|"contradicted"|"refused-unexpectedly"|"not-shown"',
      ],
    },
    {
      findings: [
        'no entry for "b"',
        'two entries for "a"',
        'an entry for "c", which is not a part',
      ],
    },
  ]);
});
