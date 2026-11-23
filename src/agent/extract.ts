import { checkPointedAtProxy } from "../derive/check-pointed-at-proxy.ts";
import { pathsFirst } from "../derive/paths-first.ts";
import {
  declaredIn,
  type Examined,
  phasesOf,
  problemLine,
  staticFindings,
  stepDone,
} from "../derive/phases.ts";
import { leftOf } from "../derive/roles-left.ts";
import type { Io } from "../run/io.ts";
import { resetTarget, startTarget, stopTarget } from "../run/lifecycle.ts";
import {
  type Event,
  type Phase,
  phaseSchema,
  type SessionStep,
  sessionStepSchema,
} from "../shapes/event.ts";
import type { SourceFile } from "../shapes/extraction.ts";
import type { Target } from "../shapes/target.ts";
import { under, writesOf } from "./access.ts";
import { type Drive, type Session, sessionTools } from "./drive.ts";
import type { Instructions } from "./instructions.ts";
import { runProviderReaders, runTwinWriters } from "./providers.ts";
import { type RolesRun, type RolesSetting, rolesRunOf } from "./roles.ts";
import { runBuilders } from "./roles-build.ts";
import { runJudges } from "./roles-judge.ts";
import { runReaders } from "./roles-read.ts";
import { recordReferences } from "./roles-record.ts";
import { sessionRounds } from "./rounds.ts";

export type Extracting = {
  readonly dir: string;
  // the one phase to run, what is left of it; none runs every phase not done yet
  readonly only?: Phase;
  readonly model: string;
  // the roles' sessions: the most at once, how hard they reason
  readonly jobs: number;
  readonly effort: Session["effort"];
  readonly instructions: Instructions;
  readonly drive: Drive;
  // the io of every phase but the proof
  readonly io: Io;
  // the providers the target declares stood, and the io that goes with them, which the
  // proof plays with; called once, when the proof starts
  readonly ioForProof: (target: Target) => Promise<Io>;
  // the files under <dir>/exspec, read again before every gate: the agent changes them
  readonly readFiles: (dir: string) => Promise<readonly SourceFile[]>;
  // the files directly under <dir>/exspec/target/: what starts the target
  readonly readStartFiles: (dir: string) => Promise<readonly SourceFile[]>;
  // path relative to <dir>/exspec: what the tool writes itself, never the agent
  readonly writeFile: (dir: string, path: string, text: string) => Promise<void>;
  readonly removeFile: (dir: string, path: string) => Promise<void>;
};

const failedGate =
  "The check of this session failed. Fix what follows, then end with the same short message.";

// the findings of a failed gate go back to the session this many times at most
const rounds = 3;

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

async function examineAgain({ dir, readFiles }: Extracting): Promise<Examined> {
  return declaredIn(await readFiles(dir));
}

async function phasesNow({ dir, readFiles }: Extracting) {
  const files = await readFiles(dir);
  const examined = declaredIn(files);
  return phasesOf(
    examined,
    leftOf({
      files,
      interfaces: examined.extraction.interfaces,
      providers: examined.extraction.target?.observables ?? [],
    }),
  );
}

// stop, start, reset, stop: the target's lifecycle as declared, run once
async function* lifecycleGate(
  target: Target,
  { dir, io }: Extracting,
): AsyncGenerator<Event, readonly string[]> {
  const lifecycle = { dir, target, io };
  try {
    yield* stopTarget(lifecycle);
    yield* startTarget(lifecycle);
    yield* resetTarget(lifecycle);
    yield* stopTarget(lifecycle);
    return [];
  } catch (error) {
    try {
      yield* stopTarget(lifecycle);
      return [messageOf(error)];
    } catch (stopError) {
      return [messageOf(error), messageOf(stopError)];
    }
  }
}

// the files first; then, for the target, each provider named at the proxy by what starts
// it, then the target itself
async function* gate(
  step: SessionStep,
  extracting: Extracting,
): AsyncGenerator<Event, readonly string[]> {
  const examined = await examineAgain(extracting);
  const found = staticFindings(step, examined);
  const { target } = examined.extraction;
  if (found.length > 0 || step === "interfaces" || target === undefined) return found;
  const { dir, readStartFiles } = extracting;
  const pointing = checkPointedAtProxy(
    target,
    (await readStartFiles(dir)).map(({ text }) => text),
  );
  if (pointing.length > 0) return pointing;
  return yield* lifecycleGate(target, extracting);
}

// What each of the two sessions may write under exspec/: its own files, never the
// other's — a list of interfaces written by the session of the target would have its own
// step found done and never run.
//   target      target.yaml, .gitignore, target/…
//   interfaces  interfaces.yaml
const owned: Readonly<Record<SessionStep, (path: string) => boolean>> = {
  target: (path) =>
    path === "target.yaml" || path === ".gitignore" || under("target")(path),
  interfaces: (path) => path === "interfaces.yaml",
};

const confinement: Readonly<Record<SessionStep, string>> = {
  target:
    "This session writes only exspec/target.yaml, exspec/.gitignore and under exspec/target/: the list of interfaces is written by the session after this one.",
  interfaces:
    "This session writes only exspec/interfaces.yaml: how the target starts is settled, and the rest is written after this session.",
};

export const stepWrites = (dir: string, step: SessionStep) => writesOf(dir, owned[step]);

// one session, then its gate; a failed gate's findings are the session's next prompt
function sessionStep(
  step: SessionStep,
  extracting: Extracting,
): AsyncGenerator<Event, boolean> {
  const phase = "target";
  const { dir, model, instructions, drive } = extracting;
  return sessionRounds({
    drive,
    session: {
      prompt: instructions.sessions[step],
      system: instructions.system,
      cwd: dir,
      model,
      tools: sessionTools,
      mayRead: () => true,
      mayWrite: stepWrites(dir, step),
      confinement: confinement[step],
    },
    rounds,
    failedGate,
    label: (event) => ({ ...event, phase, step }),
    checked: (findings) => ({
      type: "gate-checked",
      phase,
      step,
      ok: findings.length === 0,
      findings,
    }),
    gate: () => gate(step, extracting),
  });
}

// each session in order, skipped with no event when its files pass what its gate checks;
// then, when target.yaml declares providers, their readers, then their twins' writers
async function* targetPhase(
  extracting: Extracting,
  rolesRun: RolesRun,
): AsyncGenerator<Event, boolean> {
  for (const step of sessionStepSchema.options) {
    if (stepDone(step, await examineAgain(extracting))) continue;
    if (!(yield* sessionStep(step, extracting))) return false;
  }
  const providers = (await examineAgain(extracting)).extraction.target?.observables ?? [];
  if (providers.length === 0) return true;
  if (!(yield* runProviderReaders(rolesRun, providers))) return false;
  return yield* runTwinWriters(rolesRun, providers);
}

// What the roles run in a phase, on the target and interfaces declared. In the proof, the
// interfaces a path of a state not reached names go first, as far as their judgement: then
// every interface is built and recorded with the states now reached, then judged.
function rolesPhase(
  phase: Exclude<Phase, "target">,
  rolesRun: RolesRun,
  setting: RolesSetting,
): AsyncGenerator<Event, boolean> {
  switch (phase) {
    case "specification":
      return runReaders(rolesRun, setting);
    case "proof":
      return (async function* () {
        const first = pathsFirst(
          await rolesRun.readFiles(rolesRun.dir),
          setting.interfaces,
        );
        if (first.length > 0) {
          const ahead = { ...setting, interfaces: first };
          if (!(yield* runBuilders(rolesRun, ahead))) return false;
          if (!(yield* recordReferences(rolesRun, ahead, false))) return false;
          if (!(yield* runJudges(rolesRun, ahead))) return false;
        }
        const built = yield* runBuilders(rolesRun, setting);
        const recorded = yield* recordReferences(rolesRun, setting, false);
        if (!(built && recorded)) return false;
        return yield* runJudges(rolesRun, setting);
      })();
    default: {
      const unreachable: never = phase;
      return unreachable;
    }
  }
}

// the roles' run of a phase, with the io given
function rolesRunWith(extracting: Extracting, io: Io): RolesRun {
  const { dir, model, jobs, effort, drive, readFiles, writeFile, removeFile } =
    extracting;
  return rolesRunOf({
    dir,
    jobs,
    model,
    effort,
    drive,
    io,
    readFiles,
    writeFile,
    removeFile,
  });
}

async function* runPhase(
  phase: Phase,
  extracting: Extracting,
): AsyncGenerator<Event, boolean> {
  const { io, ioForProof } = extracting;
  try {
    if (phase === "target") {
      return yield* targetPhase(extracting, rolesRunWith(extracting, io));
    }
    const { extraction, problems } = await examineAgain(extracting);
    const { target, interfaces } = extraction;
    const failures = [
      ...problems.map(problemLine),
      ...(target === undefined ? ["no target is declared"] : []),
      ...(interfaces.length === 0 ? ["no interface is declared"] : []),
    ];
    for (const message of failures) yield { type: "command-failed", message };
    if (target === undefined || failures.length > 0) return false;
    // the proof plays: its builders, recording and replays see the providers stood
    const played = phase === "proof" ? await ioForProof(target) : io;
    return yield* rolesPhase(phase, rolesRunWith(extracting, played), {
      target,
      interfaces,
    });
  } catch (error) {
    yield { type: "command-failed", message: messageOf(error) };
    return false;
  }
}

// The phases in order, each skipped when the files say it is done; the first that fails
// ends the extraction. A phase named runs alone, and does what is left of it.
export async function* extract(extracting: Extracting): AsyncGenerator<Event> {
  const { dir, only } = extracting;
  yield { type: "command-started", command: "extract", dir };
  for (const phase of phaseSchema.options) {
    if (only !== undefined && phase !== only) continue;
    if (only === undefined && (await phasesNow(extracting))[phase] === "done") {
      yield { type: "phase-skipped", phase };
      continue;
    }
    yield { type: "phase-started", phase };
    const ok = yield* runPhase(phase, extracting);
    yield { type: "phase-finished", phase, ok };
    if (!ok) {
      yield { type: "command-finished", command: "extract", ok: false };
      return;
    }
  }
  yield { type: "command-finished", command: "extract", ok: true };
}
