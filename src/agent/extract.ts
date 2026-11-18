import { countExtraction } from "../derive/count.ts";
import {
  type AgentPhase,
  declaredIn,
  type Examined,
  phasesOf,
  problemLine,
  staticFindings,
} from "../derive/phases.ts";
import { leftOf } from "../derive/roles-left.ts";
import type { Io } from "../run/io.ts";
import { resetTarget, startTarget, stopTarget } from "../run/lifecycle.ts";
import { type Event, type Phase, phaseSchema } from "../shapes/event.ts";
import type { SourceFile } from "../shapes/extraction.ts";
import type { Target } from "../shapes/target.ts";
import {
  type Drive,
  mayWrite,
  phaseConfinement,
  phaseTools,
  type Session,
} from "./drive.ts";
import type { Instructions } from "./instructions.ts";
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
  readonly io: Io;
  // the files under <dir>/specimen, read again before every gate: the agent changes them
  readonly readFiles: (dir: string) => Promise<readonly SourceFile[]>;
  // path relative to <dir>/specimen: what the tool writes itself, never the agent
  readonly writeFile: (dir: string, path: string, text: string) => Promise<void>;
  readonly removeFile: (dir: string, path: string) => Promise<void>;
};

const failedGate =
  "The check of this phase failed. Fix what follows, then end with the same short message.";

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
    leftOf({ files, interfaces: examined.extraction.interfaces }),
  );
}

const counted = ({ extraction }: Examined): Event => ({
  type: "extraction-counted",
  counts: countExtraction(extraction),
});

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

// the files first; then, for the target, the target itself
async function* gate(
  phase: AgentPhase,
  extracting: Extracting,
): AsyncGenerator<Event, readonly string[]> {
  const examined = await examineAgain(extracting);
  yield counted(examined);
  const found = staticFindings(phase, examined);
  const { target } = examined.extraction;
  if (found.length > 0 || phase === "interfaces" || target === undefined) return found;
  return yield* lifecycleGate(target, extracting);
}

// one session, then its gate; a failed gate's findings are the session's next prompt
function agentPhase(
  phase: AgentPhase,
  extracting: Extracting,
): AsyncGenerator<Event, boolean> {
  const { dir, model, instructions, drive } = extracting;
  return sessionRounds({
    drive,
    session: {
      prompt: instructions.phases[phase],
      system: instructions.system,
      cwd: dir,
      model,
      tools: phaseTools,
      mayRead: () => true,
      mayWrite: (path) => mayWrite(dir, path),
      confinement: phaseConfinement,
    },
    rounds,
    failedGate,
    label: (event) => ({ ...event, phase }),
    checked: (findings) => ({
      type: "gate-checked",
      phase,
      ok: findings.length === 0,
      findings,
    }),
    gate: () => gate(phase, extracting),
  });
}

// what the roles run in a phase, on the target and interfaces declared
function rolesPhase(
  phase: Exclude<Phase, AgentPhase>,
  rolesRun: RolesRun,
  setting: RolesSetting,
): AsyncGenerator<Event, boolean> {
  switch (phase) {
    case "reading":
      return runReaders(rolesRun, setting);
    case "evidence":
      return (async function* () {
        const built = yield* runBuilders(rolesRun, setting);
        const recorded = yield* recordReferences(rolesRun, setting, false);
        return built && recorded;
      })();
    case "judgement":
      return runJudges(rolesRun, setting);
    default: {
      const unreachable: never = phase;
      return unreachable;
    }
  }
}

async function* runPhase(
  phase: Phase,
  extracting: Extracting,
  rolesRun: RolesRun,
): AsyncGenerator<Event, boolean> {
  try {
    if (phase === "target" || phase === "interfaces") {
      return yield* agentPhase(phase, extracting);
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
    return yield* rolesPhase(phase, rolesRun, { target, interfaces });
  } catch (error) {
    yield { type: "command-failed", message: messageOf(error) };
    return false;
  }
}

// The phases in order, each skipped when the files say it is done; the first that fails
// ends the extraction. A phase named runs alone, and does what is left of it.
export async function* extract(extracting: Extracting): AsyncGenerator<Event> {
  const { dir, only, model, jobs, effort, drive, io, readFiles, writeFile, removeFile } =
    extracting;
  const rolesRun = rolesRunOf({
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
  yield { type: "command-started", command: "extract", dir };
  yield counted(await examineAgain(extracting));
  for (const phase of phaseSchema.options) {
    if (only !== undefined && phase !== only) continue;
    if (only === undefined && (await phasesNow(extracting))[phase] === "done") {
      yield { type: "phase-skipped", phase };
      continue;
    }
    yield { type: "phase-started", phase };
    const ok = yield* runPhase(phase, extracting, rolesRun);
    yield { type: "phase-finished", phase, ok };
    if (!ok) {
      yield { type: "command-finished", command: "extract", ok: false };
      return;
    }
  }
  yield { type: "command-finished", command: "extract", ok: true };
}
