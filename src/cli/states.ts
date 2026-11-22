import { join } from "node:path";
import { renameState } from "../derive/rename-state.ts";
import type { Event } from "../shapes/event.ts";
import type { Examination } from "./examine.ts";

// `exspec states rename <dir> <from> <to>`: every file is rewritten in memory first, then
// all are written; a refusal writes none
export async function* statesRename({
  dir,
  exists,
  readFiles,
  writeFile,
  from,
  to,
}: Examination & {
  readonly writeFile: (dir: string, path: string, text: string) => Promise<void>;
  readonly from: string;
  readonly to: string;
}): AsyncIterable<Event> {
  const command = "states-rename";
  yield { type: "command-started", command, dir };
  const expected = join(dir, "exspec");
  if (!(await exists(expected))) {
    yield { type: "extraction-not-found", dir, expected };
    yield { type: "command-finished", command, ok: false };
    return;
  }
  const renamed = renameState({ files: await readFiles(dir), from, to });
  if ("refused" in renamed) {
    yield { type: "command-failed", message: renamed.refused };
    yield { type: "command-finished", command, ok: false };
    return;
  }
  for (const { path, text } of renamed.files) await writeFile(dir, path, text);
  yield {
    type: "state-renamed",
    from,
    to,
    files: renamed.files.map(({ path }) => path),
  };
  yield { type: "command-finished", command, ok: true };
}
