import { expect, test } from "bun:test";
import { findGaps } from "../../src/derive/gaps.ts";
import type { Extraction } from "../../src/shapes/extraction.ts";
import { played } from "../played.ts";

const nothing: Extraction = {
  schemas: [],
  interfaces: [],
  structures: [],
  facts: [],
  operations: [],
  projections: [],
  triggers: [],
  scenarios: [],
  references: [],
};

const scenario = {
  scenario: "s",
  says: "s",
  proves: ["r"],
  assert: [],
  arrange: [{ call: { operation: "g", with: {} } }],
  act: { call: { operation: "f", with: {} } },
};

const reference = {
  ...played({ status: 200, body: null }, [{ status: 200, body: null }]),
  noise: [],
};

test("a reference matches its scenario, is stale, or has none", () => {
  expect(
    findGaps({
      ...nothing,
      scenarios: [
        { path: "f/a", scenario },
        { path: "f/b", scenario: { ...scenario, says: "t" } },
        { path: "f/c", scenario },
      ],
      references: [
        { path: "f/a", reference },
        { path: "f/b", reference },
        { path: "f/d", reference },
      ],
    }),
  ).toEqual([
    {
      kind: "reference-stale",
      name: "f/b",
      message: "its scenario is no longer written as it was played",
    },
    {
      kind: "reference-without-scenario",
      name: "f/d",
      message: "no scenario is written at its path",
    },
    {
      kind: "scenario-without-reference",
      name: "f/c",
      message: "it has not been recorded",
    },
  ]);
});

test("a reference of a scenario that now looks at more is stale", () => {
  expect(
    findGaps({
      ...nothing,
      scenarios: [
        { path: "f/a", scenario: { ...scenario, assert: [{ fact: "p" }] } },
        { path: "f/b", scenario: { ...scenario, assert: [{ fact: "p" }] } },
      ],
      references: [
        { path: "f/a", reference },
        { path: "f/b", reference: { ...reference, assert: [{ fact: "p" }] } },
      ],
    }),
  ).toEqual([
    {
      kind: "reference-stale",
      name: "f/a",
      message: "its scenario is no longer written as it was played",
    },
  ]);
});
