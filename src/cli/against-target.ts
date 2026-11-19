import { join } from "node:path";
import { checkExtraction } from "../derive/check.ts";
import type { Command } from "../run/command.ts";
import type { Event } from "../shapes/event.ts";
import { type Extraction, parseExtraction } from "../shapes/extraction.ts";
import type { Examination } from "./examine.ts";

// A command that runs against the target starts only from an extraction with no problem.
export async function* againstTarget(
  command: Command,
  { dir, exists, readFiles }: Examination,
  run: (extraction: Extraction) => AsyncIterable<Event>,
): AsyncIterable<Event> {
  const expected = join(dir, "exspec");
  if (!(await exists(expected))) {
    yield { type: "command-started", command, dir };
    yield { type: "extraction-not-found", dir, expected };
    yield { type: "command-finished", command, ok: false };
    return;
  }
  const parsed = parseExtraction(await readFiles(dir));
  const problems = [...parsed.problems, ...checkExtraction(parsed.extraction).problems];
  if (problems.length === 0) {
    yield* run(parsed.extraction);
    return;
  }
  yield { type: "command-started", command, dir };
  for (const problem of problems) yield { type: "problem", ...problem };
  yield { type: "command-finished", command, ok: false };
}
