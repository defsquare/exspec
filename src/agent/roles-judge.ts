import { parseJudgeAnswer } from "../derive/judge-answer.ts";
import { judgeTask } from "../derive/judge-task.ts";
import type { Event } from "../shapes/event.ts";
import type { SourceFile } from "../shapes/extraction.ts";
import {
  type Evidence,
  evidenceSchema,
  type Judgement,
  judgementsSchema,
  readYaml,
  verdictSchema,
} from "../shapes/roles.ts";
import type { Interface } from "../shapes/target.ts";
import { inParallel } from "./pool.ts";
import {
  folderOf,
  type Roling,
  readingOf,
  roleJob,
  roleRounds,
  roleSkipped,
  rolesCommand,
  slugsIn,
  textAt,
} from "./roles.ts";

export class EvidenceUnreadable extends Error {
  readonly type = "evidence-unreadable";
}

// the judgements of a folder as they are written, none when there is no file or it does
// not parse
export function judgementsIn(
  files: readonly SourceFile[],
  name: string,
): readonly Judgement[] {
  const file = `${folderOf(name)}/judgements.yaml`;
  const text = textAt(files, file);
  const read = text === undefined ? undefined : readYaml(file, text, judgementsSchema);
  return read !== undefined && "value" in read ? read.value.judgements : [];
}

export function recordingsIn(
  files: readonly SourceFile[],
  name: string,
): readonly { readonly slug: string; readonly evidence: Evidence }[] {
  return slugsIn(files, `${folderOf(name)}/evidence`).map(({ slug, text }) => {
    const read = readYaml(`evidence/${slug}.yaml`, text, evidenceSchema);
    if (!("value" in read)) throw new EvidenceUnreadable(read.findings.join("; "));
    return { slug, evidence: read.value };
  });
}

// the task of one interface's judge, when its reading passes and it has evidence
export function taskOf(files: readonly SourceFile[], bound: Interface) {
  const recordings = recordingsIn(files, bound.interface);
  const { common, rules } = readingOf(files, bound.interface);
  if (rules === undefined || recordings.length === 0) return undefined;
  const task = judgeTask({ bound, common, rules, recordings });
  return { ...task, recordings };
}

async function* judge(roling: Roling, bound: Interface): AsyncGenerator<Event, boolean> {
  const { dir, only, model, io, readFiles, writeFile } = roling;
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
      roling,
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
export function rolesJudge(roling: Roling): AsyncGenerator<Event> {
  const { dir, jobs, readFiles } = roling;
  return rolesCommand("roles-judge", roling, async function* ({ interfaces }) {
    const done = yield* inParallel(
      interfaces.map((bound) => () => judge(roling, bound)),
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
