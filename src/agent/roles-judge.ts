import { parseJudgeAnswer } from "../derive/judge-answer.ts";
import {
  folderOf,
  judgementsIn,
  judgeTaskOf,
  recordingsRead,
} from "../derive/roles-files.ts";
import type { Event } from "../shapes/event.ts";
import type { SourceFile } from "../shapes/extraction.ts";
import { type Evidence, verdictSchema } from "../shapes/roles.ts";
import type { Interface } from "../shapes/target.ts";
import { inParallel } from "./pool.ts";
import {
  type RolesRun,
  roleJob,
  roleRounds,
  roleSkipped,
  rolesCommand,
} from "./roles.ts";

export class EvidenceUnreadable extends Error {
  readonly type = "evidence-unreadable";
}

// every evidence file of a folder, parsed; one that does not parse fails the judge
export function recordingsIn(
  files: readonly SourceFile[],
  name: string,
): readonly { readonly slug: string; readonly evidence: Evidence }[] {
  return recordingsRead(files, name).map((read) => {
    if ("findings" in read) throw new EvidenceUnreadable(read.findings.join("; "));
    return read;
  });
}

// the task of one interface's judge, when its reading passes and it has evidence
export const taskOf = (files: readonly SourceFile[], bound: Interface) =>
  judgeTaskOf(files, bound, recordingsIn(files, bound.interface));

async function* judge(
  rolesRun: RolesRun,
  bound: Interface,
): AsyncGenerator<Event, boolean> {
  const { dir, only, model, io, readFiles, writeFile } = rolesRun;
  const name = bound.interface;
  const files = await readFiles(dir);
  const task = taskOf(files, bound);
  if (task === undefined) {
    return yield* roleSkipped(
      "judge",
      name,
      "no evidence, or a reading that does not pass",
    );
  }
  const { text, of, recordings } = task;
  const slugs = [...of.keys()];
  const written = judgementsIn(files, name);
  if (
    only === undefined &&
    slugs.every((slug) =>
      written.some(({ scenario, of: was }) => scenario === slug && was === of.get(slug)),
    )
  ) {
    return yield* roleSkipped(
      "judge",
      name,
      "every judgement is of the present evidence",
    );
  }
  return yield* roleJob("judge", name, () =>
    roleRounds({
      rolesRun,
      role: "judge",
      name,
      rounds: 1,
      session: {
        prompt: text,
        tools: [],
        mayRead: () => false,
        mayWrite: () => false,
        confinement: "This session has no tool.",
      },
      gate: async function* (said) {
        const answer = parseJudgeAnswer(said, slugs);
        if ("findings" in answer) return answer.findings;
        // every entry is of a recording: the answer was parsed against their slugs
        const judgements = answer.judged.flatMap((judged) => {
          const recording = recordings.find(({ slug }) => slug === judged.scenario);
          const hash = of.get(judged.scenario);
          return recording === undefined || hash === undefined
            ? []
            : [{ ...judged, rule: recording.evidence.rule, of: hash }];
        });
        await writeFile(
          dir,
          `${folderOf(name)}/judgements.yaml`,
          Bun.YAML.stringify({ model, at: io.now(), judgements }, null, 2),
        );
        for (const { scenario, rule, verdict, confidence } of judgements) {
          yield {
            type: "judgement-written",
            interface: name,
            scenario,
            rule,
            verdict,
            confidence,
          };
        }
        return [];
      },
    }),
  );
}

// One judge per interface that has evidence, `jobs` at a time, with no tool; then every
// judgement written, counted by verdict.
export function rolesJudge(rolesRun: RolesRun): AsyncGenerator<Event> {
  const { dir, jobs, readFiles } = rolesRun;
  return rolesCommand("roles-judge", rolesRun, async function* ({ interfaces }) {
    const done = yield* inParallel(
      interfaces.map((bound) => () => judge(rolesRun, bound)),
      jobs,
    );
    const files = await readFiles(dir);
    const verdicts = interfaces
      .flatMap(({ interface: name }) => judgementsIn(files, name))
      .map(({ verdict }) => verdict);
    yield {
      type: "roles-counted",
      verdicts: {
        holds: 0,
        contradicted: 0,
        "refused-unexpectedly": 0,
        "not-shown": 0,
        ...Object.fromEntries(
          verdictSchema.options.map((v) => [v, verdicts.filter((x) => x === v).length]),
        ),
      },
    };
    return done.every(Boolean);
  });
}
