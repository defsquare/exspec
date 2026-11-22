import { expect, test } from "bun:test";
import { checkGathered } from "../../src/derive/check-gathered.ts";

const state = (more: { path?: string; serves?: readonly string[] }) => ({
  state: "s",
  of: ["A"],
  seen: "x",
  path: more.path ?? "f/answers",
  serves: more.serves ?? ["g/r", "h/q"],
});

const rules = ["f/answers", "g/r", "g/q", "h/q"];

test("a gathered state's path is an operation's answers, and it serves rules read of two operations", () => {
  expect({
    passes: checkGathered({ states: [state({})], rules }),
    path: checkGathered({ states: [state({ path: "f/x" })], rules }),
    one: checkGathered({ states: [state({ serves: ["g/r", "g/q"] })], rules }),
    unknown: checkGathered({ states: [state({ serves: ["g/r", "h/zz"] })], rules }),
  }).toEqual({
    passes: [],
    path: ["s: its path is f/x: the path of a state is <operation>/answers"],
    one: ["s: it serves rules of one operation: a state serves two at least"],
    unknown: ['s: "h/zz" is not a rule of an operation read'],
  });
});
