import { join } from "node:path";
import { factBlocks } from "../derive/blocks.ts";
import { checkExtraction } from "../derive/check.ts";
import { countExtraction } from "../derive/count.ts";
import { declaredIn, phasesOf } from "../derive/phases.ts";
import { countJudged, judgeExtraction } from "../derive/provenance.ts";
import { pathsOf, statesOf } from "../derive/roles-files.ts";
import { leftOf } from "../derive/roles-left.ts";
import { problemOf } from "../derive/roles-view.ts";
import type { Event } from "../shapes/event.ts";
import { parseExtraction, type SourceFile } from "../shapes/extraction.ts";

export type Examination = {
  readonly dir: string;
  readonly exists: (path: string) => Promise<boolean>;
  readonly readFiles: (dir: string) => Promise<readonly SourceFile[]>;
};

// what every reader of an extraction starts from: the files parsed and checked
export function checkedExtraction(files: readonly SourceFile[]) {
  const { extraction, problems } = parseExtraction(files);
  const checked = checkExtraction(extraction);
  const states = statesOf(files);
  const paths = pathsOf(files, states.states);
  return {
    extraction,
    problems: [
      ...problems,
      ...checked.problems,
      ...[...states.findings, ...paths.findings].map((finding) => problemOf("", finding)),
    ],
    gaps: [...checked.gaps, ...paths.gaps],
  };
}

// What check, status and verdicts share. Status counts, shows the phases and every claim
// not verified; verdicts shows every claim.
export async function* examine(
  command: "status" | "check" | "verdicts",
  { dir, exists, readFiles }: Examination,
): AsyncIterable<Event> {
  yield { type: "command-started", command, dir };
  const expected = join(dir, "exspec");
  if (!(await exists(expected))) {
    yield { type: "extraction-not-found", dir, expected };
    yield { type: "command-finished", command, ok: false };
    return;
  }
  const files = await readFiles(dir);
  const { extraction, problems, gaps } = checkedExtraction(files);
  const judged = command === "check" ? undefined : judgeExtraction(extraction);
  if (command === "status" && judged !== undefined) {
    const declared = declaredIn(files);
    yield { type: "extraction-counted", counts: countExtraction(extraction) };
    yield {
      type: "extraction-phases",
      phases: phasesOf(
        declared,
        leftOf({ files, interfaces: declared.extraction.interfaces }),
      ),
    };
    yield { type: "extraction-judged", ...countJudged(judged) };
    yield* judged.rules.filter(({ provenance }) => provenance !== "verified");
    yield* judged.bindings.filter(({ provenance }) => provenance !== "verified");
    yield* factBlocks(extraction);
    yield { type: "not-observed", what: "side-effects" };
  }
  for (const problem of problems) yield { type: "problem", ...problem };
  if (command === "verdicts" && judged !== undefined) {
    yield* judged.rules;
    yield* judged.bindings;
  } else {
    for (const gap of gaps) yield { type: "gap", ...gap };
  }
  yield { type: "command-finished", command, ok: problems.length === 0 };
}
