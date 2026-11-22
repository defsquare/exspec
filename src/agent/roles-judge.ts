import { parseJudgeAnswer } from "../derive/judge-answer.ts";
import {
  folderOf,
  judgementsIn,
  judgeTaskOf,
  recordingsRead,
} from "../derive/roles-files.ts";
import { interfaceLeft } from "../derive/roles-left.ts";
import type { Event } from "../shapes/event.ts";
import type { SourceFile } from "../shapes/extraction.ts";
import { type Evidence, verdictSchema } from "../shapes/roles.ts";
import type { Interface } from "../shapes/target.ts";
import { inParallel } from "./pool.ts";
import {
  type RolesRun,
  type RolesSetting,
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
  const { text, of, ofStates, recordings, states } = task;
  // a part is a recording, or a state judged on its path: "a", "state:s"
  const parts = [...of.keys(), ...states.map(({ state }) => `state:${state}`)];
  const left = interfaceLeft(files, bound);
  const waiting = left.reading === "done" ? left.judge : [];
  if (only === undefined && waiting.length === 0) {
    // what is not a reference yet is not judged: say that it waits, and for what
    const before =
      left.reading === "done" ? left.build.scenarios.length + left.record.length : 0;
    return yield* roleSkipped(
      "judge",
      name,
      before === 0
        ? "every reference as written has its judgement"
        : `no reference waits for its judgement; ${before} scenarios wait for roles build or roles record`,
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
        const answer = parseJudgeAnswer(said, parts);
        if ("findings" in answer) return answer.findings;
        // every entry is of a part: the answer was parsed against their names
        const judgements = answer.judged.flatMap((judged) => {
          const recording = recordings.find(({ slug }) => slug === judged.scenario);
          const hash = of.get(judged.scenario);
          return recording === undefined || hash === undefined
            ? []
            : [{ ...judged, rule: recording.evidence.rule, of: hash }];
        });
        //   {scenario: "state:s", …} -> {scenario: a, state: s, …, of: k}, a the path of s
        const stateJudgements = answer.judged.flatMap((judged) => {
          const one = states.find(({ state }) => `state:${state}` === judged.scenario);
          const hash = one === undefined ? undefined : ofStates.get(one.state);
          return one === undefined || hash === undefined
            ? []
            : [{ ...judged, scenario: one.slug, state: one.state, of: hash }];
        });
        await writeFile(
          dir,
          `${folderOf(name)}/judgements.yaml`,
          Bun.YAML.stringify(
            { model, at: io.now(), judgements: [...judgements, ...stateJudgements] },
            null,
            2,
          ),
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
        for (const { scenario, state, verdict, confidence } of stateJudgements) {
          yield {
            type: "judgement-written",
            interface: name,
            scenario,
            state,
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
export async function* runJudges(
  rolesRun: RolesRun,
  { interfaces }: RolesSetting,
): AsyncGenerator<Event, boolean> {
  const { dir, jobs, readFiles } = rolesRun;
  yield { type: "roles-queued", role: "judge", count: interfaces.length };
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
}

export function rolesJudge(rolesRun: RolesRun): AsyncGenerator<Event> {
  return rolesCommand("roles-judge", rolesRun, (setting) => runJudges(rolesRun, setting));
}
