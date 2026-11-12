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
