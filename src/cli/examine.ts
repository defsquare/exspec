import { join } from "node:path";
import { checkExtraction } from "../derive/check.ts";
import { countExtraction } from "../derive/count.ts";
import { phasesOf } from "../derive/phases.ts";
import { countJudged, judgeExtraction } from "../derive/provenance.ts";
import type { Event } from "../shapes/event.ts";
import { parseExtraction, type SourceFile } from "../shapes/extraction.ts";

export type Examination = {
  readonly dir: string;
  readonly exists: (path: string) => Promise<boolean>;
  readonly readFiles: (dir: string) => Promise<readonly SourceFile[]>;
};

// What check, status and verdicts share. Status counts, shows the phases and every claim
// not verified; verdicts shows every claim.
export async function* examine(
  command: "status" | "check" | "verdicts",
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
  const judged = command === "check" ? undefined : judgeExtraction(parsed.extraction);
  if (command === "status" && judged !== undefined) {
    yield { type: "extraction-counted", counts: countExtraction(parsed.extraction) };
    yield {
      type: "extraction-phases",
      phases: phasesOf({ extraction: parsed.extraction, problems, gaps: checked.gaps }),
    };
    yield { type: "extraction-judged", ...countJudged(judged) };
    yield* judged.rules.filter(({ provenance }) => provenance !== "verified");
    yield* judged.bindings.filter(({ provenance }) => provenance !== "verified");
    yield { type: "not-observed", what: "side-effects" };
  }
  for (const problem of problems) yield { type: "problem", ...problem };
  if (command === "verdicts" && judged !== undefined) {
    yield* judged.rules;
    yield* judged.bindings;
  } else {
    for (const gap of checked.gaps) yield { type: "gap", ...gap };
  }
  yield { type: "command-finished", command, ok: problems.length === 0 };
}
