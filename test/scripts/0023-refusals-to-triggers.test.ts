import { expect, test } from "bun:test";
import {
  splitCommon,
  splitRules,
} from "../../scripts/migrations/0023-refusals-to-triggers.ts";

const rules = {
  operation: "f",
  common: ["signed-in", "json-body"],
  requires: [
    {
      rule: "a",
      fact: "the item exists",
      otherwise: { refusal: "not-found", status: 404, body: "x" },
      source: "F.ts:1",
    },
    {
      rule: "b",
      fact: "its owner exists",
      otherwise: { refusal: "not-found", status: 404, body: "y" },
      source: "F.ts:2",
    },
    {
      rule: "c",
      fact: "it is open",
      otherwise: { refusal: "closed", status: 409, body: "z" },
      source: "F.ts:3",
    },
  ],
  answers: { says: "the item", structure: null },
};

test("a rules file keeps the refusals' names, its trigger their wire, two ways of one name renamed apart", () => {
  expect(splitRules("f", rules, ["json-body"])).toEqual({
    rules: {
      operation: "f",
      common: ["signed-in"],
      requires: [
        {
          rule: "a",
          fact: "the item exists",
          otherwise: "not-found-of-a",
          source: "F.ts:1",
        },
        {
          rule: "b",
          fact: "its owner exists",
          otherwise: "not-found-of-b",
          source: "F.ts:2",
        },
        { rule: "c", fact: "it is open", otherwise: "closed", source: "F.ts:3" },
      ],
      answers: { says: "the item", structure: null },
    },
    trigger: {
      trigger: "f",
      interface: "f",
      operation: "f",
      answers: { status: [] },
      refuses: {
        "not-found-of-a": { status: 404, body: "x" },
        "not-found-of-b": { status: 404, body: "y" },
        closed: { status: 409, body: "z" },
      },
      protocol: ["json-body"],
    },
    renamed: [
      'the refusal "not-found" of "a" renamed "not-found-of-a": two rules refuse by that name in two ways',
      'the refusal "not-found" of "b" renamed "not-found-of-b": two rules refuse by that name in two ways',
    ],
  });
});

test("common keeps its rules by name, the protocol takes the wire and the rules of the wire", () => {
  expect(
    splitCommon(
      {
        target: "t",
        "runs-with": [{ setting: "s", source: "a.sh:1" }],
        rules: [
          {
            rule: "signed-in",
            "applies-to": "every operation",
            fact: "the caller is signed in",
            otherwise: { refusal: "unauthenticated", status: 401, body: "u" },
            source: "S.ts:1",
          },
          {
            rule: "json-body",
            "applies-to": "every write",
            fact: "the body is an object",
            otherwise: { refusal: "malformed", status: 400, body: "m" },
            source: "S.ts:2",
          },
          {
            rule: "no-store",
            "applies-to": "every answer",
            fact: "not cached",
            otherwise: { refusal: "none", status: 200, body: "not applicable" },
            source: "S.ts:3",
          },
        ],
        errors: [{ kind: "k", status: 500, body: "e", source: "E.ts:1" }],
        contract: ["c"],
        unsure: [{ about: "a", what: "w" }],
      },
      ["json-body", "no-store"],
    ),
  ).toEqual({
    common: {
      target: "t",
      rules: [
        {
          rule: "signed-in",
          "applies-to": "every operation",
          fact: "the caller is signed in",
          otherwise: "unauthenticated",
          source: "S.ts:1",
        },
      ],
      unsure: [{ about: "a", what: "w" }],
    },
    protocol: {
      target: "t",
      "runs-with": [{ setting: "s", source: "a.sh:1" }],
      rules: [
        {
          rule: "json-body",
          "applies-to": "every write",
          fact: "the body is an object",
          otherwise: { refusal: "malformed", status: 400, body: "m" },
          source: "S.ts:2",
        },
        {
          rule: "no-store",
          "applies-to": "every answer",
          fact: "not cached",
          source: "S.ts:3",
        },
      ],
      refuses: { unauthenticated: { status: 401, body: "u" } },
      errors: [{ kind: "k", status: 500, body: "e", source: "E.ts:1" }],
      contract: ["c"],
    },
    renamed: [],
  });
});

test("a file already rewritten is left as it is", () => {
  expect({
    rules: splitRules("f", splitRules("f", rules, [])?.rules, []),
    common: splitCommon({ target: "t", rules: [{ rule: "a", otherwise: "r" }] }, []),
  }).toEqual({ rules: undefined, common: undefined });
});
