import { expect, test } from "bun:test";
import { checkStates } from "../../src/derive/check-states.ts";

const known = { structures: ["A", "B"], interfaces: ["f", "g"] };
const entry = '- {state: s, of: [A], seen: "reading the a shows x", path: f/accepted}';

test("no file is no state and no finding", () => {
  expect(checkStates({ text: undefined, ...known })).toEqual({
    states: [],
    findings: [],
  });
});

test("a valid entry comes back with no rule served", () => {
  expect(checkStates({ text: entry, ...known })).toEqual({
    states: [
      {
        state: "s",
        of: ["A"],
        seen: "reading the a shows x",
        path: "f/accepted",
        serves: [],
      },
    ],
    findings: [],
  });
});

test("each fault of an entry is a finding", () => {
  const text = [
    entry,
    entry,
    '- {state: t, of: [A, C], seen: "y", path: h/accepted, serves: [g/r]}',
  ].join("\n");
  expect(checkStates({ text, ...known }).findings).toEqual([
    'states.yaml: "s" is named twice',
    'states.yaml: t: "C" is not a structure',
    'states.yaml: t: the path h/accepted names "h", not an interface',
  ]);
});
