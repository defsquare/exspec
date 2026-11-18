import { checkExtraction } from "../derive/check.ts";
import { countExtraction } from "../derive/count.ts";
import {
  type AgentPhase,
  type Examined,
  phasesOf,
  problemLine,
  staticFindings,
} from "../derive/phases.ts";
import type { Io } from "../run/io.ts";
import { resetTarget, startTarget, stopTarget } from "../run/lifecycle.ts";
import { playEach } from "../run/play.ts";
import { record } from "../run/record.ts";
import { type Event, type Phase, phaseSchema } from "../shapes/event.ts";
import { parseExtraction, type SourceFile } from "../shapes/extraction.ts";
import type { Target } from "../shapes/target.ts";
import { type Drive, mayWrite, phaseConfinement, phaseTools } from "./drive.ts";
import type { Instructions } from "./instructions.ts";
import { sessionRounds } from "./rounds.ts";

export type Extracting = {
  readonly dir: string;
  // the one phase to run, done or not; none runs every phase not done yet
  readonly only?: Phase;
  readonly model: string;
  readonly instructions: Instructions;
  readonly drive: Drive;
  readonly io: Io;
  // the files under <dir>/specimen, read again before every gate: the agent changes them
  readonly readFiles: (dir: string) => Promise<readonly SourceFile[]>;
};

const failedGate =
  "The check of this phase failed. Fix what follows, then end with the same short message.";

// the findings of a failed gate go back to the session this many times at most
const rounds = 3;

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

async function examineAgain({ dir, readFiles }: Extracting): Promise<Examined> {
  const parsed = parseExtraction(await readFiles(dir));
  const checked = checkExtraction(parsed.extraction);
  return {
    extraction: parsed.extraction,
    problems: [...parsed.problems, ...checked.problems],
    gaps: checked.gaps,
  };
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

// every scenario played once on the running target
async function* playGate(
  { extraction }: Examined,
  target: Target,
  { dir, io }: Extracting,
): AsyncGenerator<Event, readonly string[]> {
  const findings: string[] = [];
  try {
    const credentials = await io.readCredentials(dir, target);
    const playing = { dir, target, extraction, io };
    for await (const event of playEach(playing, extraction.scenarios, credentials)) {
      yield event;
      if (event.type === "scenario-unplayable") {
        findings.push(`${event.path}: ${event.message}`);
      }
    }
  } catch (error) {
    findings.push(messageOf(error));
  }
  return findings;
}

// the references recorded, those that exist kept
async function* recordReferences(
  { extraction }: Examined,
  { dir, io }: Extracting,
): AsyncGenerator<Event, readonly string[]> {
  const findings: string[] = [];
  for await (const event of record({ dir, extraction, paths: [], force: false }, io)) {
    yield event;
    if (event.type === "scenario-unplayable" || event.type === "command-failed") {
      findings.push(
        event.type === "command-failed"
          ? event.message
          : `${event.path}: ${event.message}`,
      );
    }
    if (event.type === "scenario-unstable") {
      findings.push(
        ...event.differences.map(
          ({ at }) =>
            `${event.path}: two executions answered ${at.join(".")} differently`,
        ),
      );
    }
  }
  return findings;
}

// the files first; then, for the target, the scenarios and the record, the target itself
async function* gate(
  phase: Phase,
  extracting: Extracting,
): AsyncGenerator<Event, readonly string[]> {
  const examined = await examineAgain(extracting);
  yield counted(examined);
  const found =
    phase === "record"
      ? examined.problems.map(problemLine)
      : staticFindings(phase, examined);
  const { target } = examined.extraction;
  if (found.length > 0 || phase === "interfaces" || phase === "specification") {
    return found;
  }
  if (target === undefined) return ["no target is declared"];
  if (phase === "target") return yield* lifecycleGate(target, extracting);
  if (phase === "scenarios") return yield* playGate(examined, target, extracting);
  return yield* recordReferences(examined, extracting);
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

// the scenarios are written against the running target: started before, stopped after
async function* scenariosPhase(extracting: Extracting): AsyncGenerator<Event, boolean> {
  const { dir, io } = extracting;
  const { target } = (await examineAgain(extracting)).extraction;
  if (target === undefined) {
    yield { type: "command-failed", message: "no target is declared" };
    return false;
  }
  const lifecycle = { dir, target, io };
  try {
    yield* startTarget(lifecycle);
    return yield* agentPhase("scenarios", extracting);
  } finally {
    yield* stopTarget(lifecycle);
  }
}

async function* runPhase(
  phase: Phase,
  extracting: Extracting,
): AsyncGenerator<Event, boolean> {
  try {
    if (phase === "scenarios") return yield* scenariosPhase(extracting);
    if (phase !== "record") return yield* agentPhase(phase, extracting);
    const findings = yield* gate(phase, extracting);
    yield { type: "gate-checked", phase, ok: findings.length === 0, findings };
    return findings.length === 0;
  } catch (error) {
    yield { type: "command-failed", message: messageOf(error) };
    return false;
  }
}

// the phases in order, each skipped when the files say it is done; the first that fails
// ends the extraction
export async function* extract(extracting: Extracting): AsyncGenerator<Event> {
  const { dir, only } = extracting;
  yield { type: "command-started", command: "extract", dir };
  yield counted(await examineAgain(extracting));
  for (const phase of phaseSchema.options) {
    if (only !== undefined && phase !== only) continue;
    if (
      only === undefined &&
      phasesOf(await examineAgain(extracting))[phase] === "done"
    ) {
      yield { type: "phase-skipped", phase };
      continue;
    }
    yield { type: "phase-started", phase };
    const ok = yield* runPhase(phase, extracting);
    // the record writes its references after its gate has counted
    if (phase === "record") yield counted(await examineAgain(extracting));
    yield { type: "phase-finished", phase, ok };
    if (!ok) {
      yield { type: "command-finished", command: "extract", ok: false };
      return;
    }
  }
  yield { type: "command-finished", command: "extract", ok: true };
}
