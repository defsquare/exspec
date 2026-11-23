// For an extraction made before ADR-0027: exspec/roles/ becomes the root and operations/.
//   exspec/roles/common.yaml, protocol.yaml -> exspec/common.yaml, protocol.yaml
//   exspec/roles/<op>/…                     -> exspec/operations/<op>/…
// It moves nothing and exits 1 when a destination exists or a file of roles/ is of no
// operation; run on an extraction already rewritten, it changes nothing and says so.
// Since ADR-0028 an extraction that has a protocol.yaml is not read: it is extracted again.
//   bun scripts/migrations/0027-roles-to-operations.ts <dir>
import { mkdir, readdir, rename, rmdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { directoryExists } from "../../src/io/files.ts";

const exists = (path: string) =>
  stat(path).then(
    () => true,
    () => false,
  );

const rootFiles = ["common.yaml", "protocol.yaml"];

// the moves of one extraction, relative to exspec/; a file that is neither of the two
// shared ones has no destination — under operations/ the computed path would read it as
// an operation
//   ["a", "common.yaml", "n.yaml"]
//   -> [{from: "roles/a", to: "operations/a"}, {from: "roles/common.yaml", to: "common.yaml"},
//       {from: "roles/n.yaml"}]
export async function movesOf(
  exspec: string,
): Promise<readonly { readonly from: string; readonly to?: string }[]> {
  const entries = await readdir(join(exspec, "roles"), { withFileTypes: true });
  return entries
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => ({
      from: `roles/${entry.name}`,
      ...(rootFiles.includes(entry.name)
        ? { to: entry.name }
        : entry.isDirectory()
          ? { to: `operations/${entry.name}` }
          : {}),
    }));
}

// "moved: n", "nothing to do", or "refused: …" with nothing moved
export async function migrate(dir: string): Promise<string> {
  const exspec = join(dir, "exspec");
  if (!(await directoryExists(join(exspec, "roles")))) return "nothing to do";
  const found = await movesOf(exspec);
  const moves = found.flatMap(({ from, to }) => (to === undefined ? [] : [{ from, to }]));
  const stray = found.find(({ to }) => to === undefined);
  if (stray !== undefined) return `refused: ${stray.from} is not an operation's folder`;
  for (const { to } of moves) {
    if (await exists(join(exspec, to))) return `refused: ${to} exists`;
  }
  await mkdir(join(exspec, "operations"), { recursive: true });
  for (const { from, to } of moves) await rename(join(exspec, from), join(exspec, to));
  await rmdir(join(exspec, "roles"));
  return `moved: ${moves.length}`;
}

if (import.meta.main) {
  const [dir] = process.argv.slice(2);
  if (dir === undefined) {
    console.error("usage: bun scripts/migrations/0027-roles-to-operations.ts <dir>");
    process.exit(2);
  }
  const result = await migrate(dir);
  console.log(result);
  if (result.startsWith("refused")) process.exit(1);
}
