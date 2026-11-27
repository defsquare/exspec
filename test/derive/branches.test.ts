import { expect, test } from "bun:test";
import { join } from "node:path";
import { branchesOf } from "../../src/derive/branches.ts";
import {
  type MetJudgement,
  type RuleJudgement,
  rulesSchema,
} from "../../src/shapes/roles.ts";

const rulesIn = async (name: string) => {
  const text = await Bun.file(join(import.meta.dir, "../fixtures/flows", name)).text();
  return rulesSchema.parse(Bun.YAML.parse(text));
};

const ruleJudged = (scenario: string, rule: string): RuleJudgement => ({
  scenario,
  rule,
  situation: "yes",
  verdict: "holds",
  confidence: 0.9,
  evidence: "e",
  of: "h",
});

const metJudged = (scenario: string, met: MetJudgement["met"]): MetJudgement => ({
  scenario,
  met,
  evidence: "e",
  of: "m",
});

test("the outcomes seen of an operation that turns on a situation and an input: one per conditions met, the rules met on one and not another fork", async () => {
  expect(
    branchesOf({
      rules: await rulesIn("cancel-claim-task.yaml"),
      accepted: [200],
      recordings: [
        { slug: "owner-kept", rule: "owner-kept", status: 200 },
        { slug: "back-to-ready", rule: "state-ready", status: 200 },
        { slug: "in-review", rule: "state-ready-for-review", status: 200 },
      ],
      judgements: [
        ruleJudged("back-to-ready", "state-ready"),
        ruleJudged("owner-kept", "owner-kept"),
        ruleJudged("in-review", "state-ready-for-review"),
      ],
      met: [
        metJudged("back-to-ready", {
          "state-ready": "yes",
          "state-ready-for-review": "no",
          "owner-cleared": "yes",
          "owner-kept": "no",
        }),
        metJudged("owner-kept", {
          "state-ready": "yes",
          "state-ready-for-review": "no",
          "owner-cleared": "no",
          "owner-kept": "yes",
        }),
        metJudged("in-review", {
          "state-ready": "no",
          "state-ready-for-review": "yes",
          "owner-cleared": "yes",
          "owner-kept": "unsure",
        }),
      ],
    }),
  ).toEqual({
    outcomes: [
      {
        met: ["state-ready", "owner-cleared"],
        unsure: [],
        status: 200,
        scenarios: ["back-to-ready"],
      },
      {
        met: ["state-ready-for-review", "owner-cleared"],
        unsure: ["owner-kept"],
        status: 200,
        scenarios: ["in-review"],
      },
      {
        met: ["state-ready", "owner-kept"],
        unsure: [],
        status: 200,
        scenarios: ["owner-kept"],
      },
    ],
    forks: ["state-ready", "state-ready-for-review", "owner-cleared", "owner-kept"],
    neverMet: [],
    accepted: [{ status: 200, seen: true }],
  });
});

test("two recordings met on the same conditions with the same status are one outcome, an accepted status no recording answered never seen", async () => {
  expect(
    branchesOf({
      rules: await rulesIn("cancel-claim-task.yaml"),
      accepted: [200, 201],
      recordings: [
        { slug: "b", rule: "owner-cleared", status: 200 },
        { slug: "a", rule: "state-ready", status: 200 },
      ],
      judgements: [],
      met: [
        metJudged("a", { "state-ready": "yes", "owner-cleared": "yes" }),
        metJudged("b", { "state-ready": "yes", "owner-cleared": "yes" }),
      ],
    }),
  ).toEqual({
    outcomes: [
      {
        met: ["state-ready", "owner-cleared"],
        unsure: [],
        status: 200,
        scenarios: ["a", "b"],
      },
    ],
    forks: [],
    neverMet: ["state-ready-for-review", "owner-kept"],
    accepted: [
      { status: 200, seen: true },
      { status: 201, seen: false },
    ],
  });
});

test("an operation with two accepted statuses: an outcome ends in each, a recording not judged on its conditions counts for its own rule", async () => {
  expect(
    branchesOf({
      rules: await rulesIn("delete-workbasket.yaml"),
      accepted: [204, 202],
      recordings: [
        { slug: "deleted-when-empty", rule: "deleted-when-empty", status: 204 },
        {
          slug: "marked-when-completed-tasks",
          rule: "marked-when-completed-tasks",
          status: 202,
        },
      ],
      judgements: [
        ruleJudged("deleted-when-empty", "deleted-when-empty"),
        ruleJudged("marked-when-completed-tasks", "marked-when-completed-tasks"),
      ],
      met: [
        metJudged("marked-when-completed-tasks", {
          "deleted-when-empty": "no",
          "references-removed": "no",
          "marked-when-completed-tasks": "yes",
        }),
      ],
    }),
  ).toEqual({
    outcomes: [
      {
        met: ["deleted-when-empty"],
        unsure: [],
        status: 204,
        scenarios: ["deleted-when-empty"],
      },
      {
        met: ["marked-when-completed-tasks"],
        unsure: [],
        status: 202,
        scenarios: ["marked-when-completed-tasks"],
      },
    ],
    forks: ["deleted-when-empty", "marked-when-completed-tasks"],
    neverMet: ["references-removed"],
    accepted: [
      { status: 204, seen: true },
      { status: 202, seen: true },
    ],
  });
});
