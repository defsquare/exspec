import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { SourceFile } from "../shapes/extraction.ts";

export async function readExtractionFiles(dir: string): Promise<readonly SourceFile[]> {
  const root = join(dir, "specimen");
  const paths = await Array.fromAsync(new Bun.Glob("**/*.yaml").scan(root));
  return Promise.all(
    paths
      .sort()
      .map(async (path) => ({ path, text: await Bun.file(join(root, path)).text() })),
  );
}

export async function directoryExists(path: string): Promise<boolean> {
  return stat(path).then(
    (s) => s.isDirectory(),
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return false;
      throw error;
    },
  );
}
