import { stat } from "node:fs/promises";

export async function directoryExists(path: string): Promise<boolean> {
  return stat(path).then(
    (s) => s.isDirectory(),
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return false;
      throw error;
    },
  );
}
