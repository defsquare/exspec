import { expect, test } from "bun:test";
import { join } from "node:path";
import { countExtraction } from "../../src/derive/count.ts";
import { readExtractionFiles } from "../../src/io/files.ts";
import { parseExtraction } from "../../src/shapes/extraction.ts";

test("the fixture's counts", async () => {
  const { extraction } = parseExtraction(
    await readExtractionFiles(join(import.meta.dir, "../fixtures/conduit")),
  );
  expect(countExtraction(extraction)).toEqual({
    interfaces: 9,
    structures: 3,
    facts: 5,
    operations: 5,
    rules: 20,
    projections: 4,
    triggers: 5,
    scenarios: 4,
    references: 0,
  });
});
