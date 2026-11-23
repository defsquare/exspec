import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compareWithReference } from "../../src/derive/compare.ts";
import {
  readExtractionFiles,
  writeExtractionFile,
  writeReference,
} from "../../src/io/files.ts";
import { parseExtraction } from "../../src/shapes/extraction.ts";
import type { Reference } from "../../src/shapes/scenario.ts";
import { played } from "../played.ts";

test("a body that answers {noise: 1} is data: it goes through YAML and back unchanged", async () => {
  const dir = await mkdtemp(join(tmpdir(), "exspec-"));
  const reference: Reference = {
    ...played({ status: 200, body: { noise: 1, a: "no", b: "0123", c: [{ noise: 2 }] } }),
    noise: [{ at: ["act", "response", "body", "a"], class: 1 }],
  };
  try {
    await writeReference(dir, "f/a", reference);
    const [read] = parseExtraction(await readExtractionFiles(dir)).extraction.references;
    expect({
      read,
      compared: read && compareWithReference(read.reference, read.reference),
    }).toEqual({ read: { path: "f/a", reference }, compared: [] });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the files read are the YAML files and the twins, not serve.ts nor the target's", async () => {
  const dir = await mkdtemp(join(tmpdir(), "exspec-"));
  try {
    for (const path of [
      "target.yaml",
      "target/t.ts",
      "providers/serve.ts",
      "providers/p/provider.yaml",
      "providers/p/twin.ts",
      "services/s.yaml",
    ]) {
      await writeExtractionFile(dir, path, "a");
    }
    expect((await readExtractionFiles(dir)).map(({ path }) => path)).toEqual([
      "providers/p/provider.yaml",
      "providers/p/twin.ts",
      "services/s.yaml",
      "target.yaml",
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("an extraction still under roles/ is refused with the script to run", async () => {
  const dir = await mkdtemp(join(tmpdir(), "exspec-"));
  try {
    await Bun.write(join(dir, "exspec", "roles", "common.yaml"), "x: 1\n");
    await expect(readExtractionFiles(dir)).rejects.toThrow(
      "exspec/roles/ is the layout before operations/: run `bun scripts/migrations/0027-roles-to-operations.ts <dir>`",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
