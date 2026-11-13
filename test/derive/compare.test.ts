import { expect, test } from "bun:test";
import { compareWithReference } from "../../src/derive/compare.ts";
import type { Noise, Reference } from "../../src/shapes/scenario.ts";
import { played } from "../played.ts";

const reference = (noise: readonly Noise[]): Reference => ({
  ...played({ status: 200, body: { a: "t1", b: "t1", c: "u1", d: 1 } }, [
    { status: 201, body: { e: 1 } },
  ]),
  noise,
});

const noise: readonly Noise[] = [
  { at: ["act", "response", "body", "a"], class: 1 },
  { at: ["act", "response", "body", "b"], class: 1 },
  { at: ["act", "response", "body", "c"], class: 2 },
];

test("a played copy equal outside the noise has no difference", () => {
  expect(
    compareWithReference(
      reference(noise),
      played({ status: 200, body: { a: "t3", b: "t3", c: "u3", d: 1 } }, [
        { status: 201, body: { e: 1 } },
      ]),
    ),
  ).toEqual([]);
});

test("places of one class that differ from each other are one difference", () => {
  expect(
    compareWithReference(
      reference(noise),
      played({ status: 200, body: { a: "t3", b: "t4", c: "u3", d: 1 } }, [
        { status: 201, body: { e: 1 } },
      ]),
    ),
  ).toEqual([{ at: ["act", "response", "body", "b"], expected: "t3", actual: "t4" }]);
});

test("two classes that answer one value are one difference", () => {
  expect(
    compareWithReference(
      reference(noise),
      played({ status: 200, body: { a: "t3", b: "t3", c: "t3", d: 1 } }, [
        { status: 201, body: { e: 1 } },
      ]),
    ),
  ).toEqual([
    {
      at: ["act", "response", "body", "c"],
      expected: { "apart from": ["act", "response", "body", "a"] },
      actual: "t3",
    },
  ]);
});

test("a status, a value and a form that differ outside the noise", () => {
  expect(
    compareWithReference(
      reference(noise),
      played({ status: 200, body: { a: "t3", b: "t3", c: "u3", d: 2 } }, [
        { status: 400, body: [1] },
      ]),
    ),
  ).toEqual([
    { at: ["arrange", 0, "response", "status"], expected: 201, actual: 400 },
    { at: ["arrange", 0, "response", "body"], expected: { e: 1 }, actual: [1] },
    { at: ["act", "response", "body", "d"], expected: 1, actual: 2 },
  ]);
});

test("a played copy with another number of calls", () => {
  expect(
    compareWithReference(reference([]), played({ status: 200, body: null })),
  ).toEqual([{ at: ["arrange"], expected: 1, actual: 0 }]);
});

test("the readings are compared like the calls' answers, their noise included", () => {
  const read = (t: string, n: number) => [
    {
      of: { fact: "p" },
      as: null,
      before: [{ status: 200, body: { t, n } }],
      after: [{ status: 200, body: { t, n } }],
    },
  ];
  const kept: Reference = {
    ...played({ status: 200, body: null }),
    readings: read("t1", 1),
    noise: [
      { at: ["readings", 0, "before", 0, "body", "t"], class: 1 },
      { at: ["readings", 0, "after", 0, "body", "t"], class: 1 },
    ],
  };
  expect([
    compareWithReference(kept, {
      ...played({ status: 200, body: null }),
      readings: read("t2", 1),
    }),
    compareWithReference(kept, {
      ...played({ status: 200, body: null }),
      readings: read("t2", 2),
    }),
    compareWithReference(kept, { ...played({ status: 200, body: null }), readings: [] }),
  ]).toEqual([
    [],
    [
      { at: ["readings", 0, "before", 0, "body", "n"], expected: 1, actual: 2 },
      { at: ["readings", 0, "after", 0, "body", "n"], expected: 1, actual: 2 },
    ],
    [{ at: ["readings"], expected: 1, actual: 0 }],
  ]);
});
