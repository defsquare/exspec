import { join } from "node:path";
import { checkExtraction } from "../derive/check.ts";
import { countExtraction } from "../derive/count.ts";
import { phasesOf } from "../derive/phases.ts";
import type { Event } from "../shapes/event.ts";
import { parseExtraction, type SourceFile } from "../shapes/extraction.ts";

export type Examination = {
  readonly dir: string;
  readonly exists: (path: string) => Promise<boolean>;
  readonly readFiles: (dir: string) => Promise<readonly SourceFile[]>;
};

// what check and status share; status counts and shows the phases as well
export async function* examine(
  command: "status" | "check",
  { dir, exists, readFiles }: Examination,
): AsyncIterable<Event> {
  yield { type: "command-started", command, dir };
  const expected = join(dir, "specimen");
  if (!(await exists(expected))) {
    yield { type: "extraction-not-found", dir, expected };
    yield { type: "command-finished", command, ok: false };
    return;
  }
  const parsed = parseExtraction(await readFiles(dir));
  const checked = checkExtraction(parsed.extraction);
  const problems = [...parsed.problems, ...checked.problems];
  if (command === "status") {
    yield { type: "extraction-counted", counts: countExtraction(parsed.extraction) };
    yield {
      type: "extraction-phases",
      phases: phasesOf({ extraction: parsed.extraction, problems, gaps: checked.gaps }),
    };
  }
  for (const problem of problems) yield { type: "problem", ...problem };
  for (const gap of checked.gaps) yield { type: "gap", ...gap };
  yield { type: "command-finished", command, ok: problems.length === 0 };
}
