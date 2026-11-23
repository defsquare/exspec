import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "../../scripts/migrations/0027-roles-to-operations.ts";

const treeOf = async (dir: string) =>
  (
    await Array.fromAsync(new Bun.Glob("**/*").scan({ cwd: dir, onlyFiles: true }))
  ).sort();

async function extractionWith(paths: readonly string[]) {
  const dir = await mkdtemp(join(tmpdir(), "exspec-"));
  for (const path of paths) {
    await mkdir(join(dir, "exspec", path, ".."), { recursive: true });
    await Bun.write(join(dir, "exspec", path), "x: 1\n");
  }
  return dir;
}

const before = [
  "roles/common.yaml",
  "roles/protocol.yaml",
  "roles/a/rules.yaml",
  "roles/a/scenarios/b.yaml",
  "structures.yaml",
];

test("an extraction under roles/ is rewritten, then left as it is", async () => {
  const dir = await extractionWith(before);
  try {
    const first = await migrate(dir);
    const after = await treeOf(join(dir, "exspec"));
    const second = await migrate(dir);
    expect({ first, after, second, again: await treeOf(join(dir, "exspec")) }).toEqual({
      first: "moved: 3",
      after: [
        "common.yaml",
        "operations/a/rules.yaml",
        "operations/a/scenarios/b.yaml",
        "protocol.yaml",
        "structures.yaml",
      ],
      second: "nothing to do",
      again: after,
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a destination that exists moves nothing", async () => {
  const dir = await extractionWith([...before, "operations/a/rules.yaml"]);
  try {
    const result = await migrate(dir);
    expect({ result, tree: await treeOf(join(dir, "exspec")) }).toEqual({
      result: "refused: operations/a exists",
      tree: [...before, "operations/a/rules.yaml"].sort(),
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a file of roles/ that is of no operation moves nothing", async () => {
  const dir = await extractionWith([...before, "roles/n.yaml"]);
  try {
    const result = await migrate(dir);
    expect({ result, tree: await treeOf(join(dir, "exspec")) }).toEqual({
      result: "refused: roles/n.yaml is not an operation's folder",
      tree: [...before, "roles/n.yaml"].sort(),
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
