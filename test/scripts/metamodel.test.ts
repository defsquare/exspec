import { expect, test } from "bun:test";
import { join } from "node:path";
import {
  changesOf,
  drawingsOf,
  type Model,
  modelSchema,
} from "../../scripts/metamodel/draw.ts";

const docs = join(import.meta.dir, "../../docs");

test("the drawings under docs/metamodel/ are those of docs/metamodel.yaml", async () => {
  const model = modelSchema.parse(
    Bun.YAML.parse(await Bun.file(join(docs, "metamodel.yaml")).text()),
  );
  const drawn = drawingsOf(model);
  const kept = await Promise.all(
    drawn.map(async ({ name }) => ({
      name,
      svg: await Bun.file(join(docs, "metamodel", `${name}.svg`)).text(),
    })),
  );
  expect(kept).toEqual([...drawn]);
});

const base: Model = {
  groups: [
    { group: "g", says: "one", at: [0, 0] },
    { group: "h", says: "other", at: [1, 0] },
  ],
  concepts: [
    { concept: "a", group: "g", says: "an a", at: [0, 0] },
    { concept: "b", group: "g", says: "a b", at: [1, 0] },
    { concept: "c", group: "h", says: "a c", at: [0, 0] },
  ],
  links: [
    { from: "a", to: "b", verb: "has", card: "1" },
    { from: "a", to: "c", verb: "names" },
  ],
};

test("what changed since a base: a concept by its name, a link by its two ends, a place on the grid left out", () => {
  expect(
    changesOf(
      {
        ...base,
        concepts: [
          { concept: "a", group: "g", says: "an a", at: [3, 2] },
          { concept: "c", group: "g", says: "a c", at: [0, 0] },
          { concept: "d", group: "h", says: "a d", at: [0, 0] },
        ],
        links: [
          { from: "a", to: "c", verb: "names", card: "0..n" },
          { from: "a", to: "d", verb: "has" },
        ],
      },
      base,
    ),
  ).toEqual([
    "~ concept c: was h: a c",
    "+ concept d",
    "- concept b",
    "~ link a > c: names 0..n, was names",
    "+ link a > d: has",
    "- link a > b: has 1",
  ]);
});

test("a link between two groups that do not sit side by side is refused", () => {
  expect(() =>
    drawingsOf({
      ...base,
      groups: [
        { group: "g", says: "one", at: [0, 0] },
        { group: "h", says: "other", at: [1, 1] },
      ],
    }),
  ).toThrow("a link joins g and h: the two groups must sit side by side");
});
