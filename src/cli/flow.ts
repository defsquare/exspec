import { type Counts, type Event, type Phase, phaseSchema } from "../shapes/event.ts";

export type PhaseState = {
  readonly phase: Phase;
  readonly state: "to-do" | "running" | "done" | "skipped" | "failed";
  // 0 before it starts; 1 at phase-started; +1 at each failed gate
  readonly round: number;
  readonly turns: number;
  readonly cost?: number;
  readonly startedAt?: number;
  readonly endedAt?: number;
};

export type Flow = {
  readonly dir?: string;
  readonly startedAt?: number;
  readonly endedAt?: number;
  readonly ok?: boolean;
  readonly boxes: readonly PhaseState[];
  readonly counts?: Counts;
  // the running phase's panel, all four cleared at phase-started
  readonly gate?: { readonly round: number; readonly findings: readonly string[] };
  readonly said?: string;
  readonly used?: { readonly tool: string; readonly about: string };
  readonly target?: { readonly step: string; readonly state: string };
  readonly failed?: string;
};

export const emptyFlow: Flow = {
  boxes: phaseSchema.options.map((phase) => ({
    phase,
    state: "to-do",
    round: 0,
    turns: 0,
  })),
};

const inBox = (
  flow: Flow,
  phase: Phase,
  change: (box: PhaseState) => PhaseState,
): Flow => ({
  ...flow,
  boxes: flow.boxes.map((box) => (box.phase === phase ? change(box) : box)),
});

// f(flow, {phase-started: a}) -> flow with a running, round 1, and its panel emptied
export function flowAfter(flow: Flow, event: Event, at: number): Flow {
  switch (event.type) {
    case "command-started":
      return { ...flow, dir: event.dir, startedAt: at };
    case "command-finished":
      return { ...flow, endedAt: at, ok: event.ok };
    case "command-failed":
      return { ...flow, failed: event.message };
    case "extraction-counted":
      return { ...flow, counts: event.counts };
    case "target-step":
      return { ...flow, target: { step: event.step, state: event.state } };
    case "phase-started": {
      const { gate, said, used, target, ...kept } = flow;
      return inBox(kept, event.phase, (box) => ({
        ...box,
        state: "running",
        round: 1,
        startedAt: at,
      }));
    }
    case "phase-skipped":
      return inBox(flow, event.phase, (box) => ({ ...box, state: "skipped" }));
    case "phase-finished":
      return inBox(flow, event.phase, (box) => ({
        ...box,
        state: event.ok ? "done" : "failed",
        endedAt: at,
      }));
    case "gate-checked": {
      if (!("phase" in event) || event.ok) return flow;
      const { phase, findings } = event;
      const round = flow.boxes.find((box) => box.phase === phase)?.round ?? 0;
      return inBox({ ...flow, gate: { round, findings } }, phase, (box) => ({
        ...box,
        round: box.round + 1,
      }));
    }
    case "agent-said":
      return "phase" in event
        ? { ...flow, said: event.text.replace(/\n[\s\S]*/, "") }
        : flow;
    case "agent-used":
      return "phase" in event
        ? { ...flow, used: { tool: event.tool, about: event.about } }
        : flow;
    case "agent-ended": {
      if (!("phase" in event)) return flow;
      const { turns, cost } = event;
      return inBox(flow, event.phase, (box) => ({
        ...box,
        turns: box.turns + turns,
        ...(cost === undefined ? {} : { cost: (box.cost ?? 0) + cost }),
      }));
    }
    case "extraction-not-found":
    case "problem":
    case "gap":
    case "extraction-phases":
    case "scenario-played":
    case "scenario-unplayable":
    case "reference-written":
    case "reference-kept":
    case "scenario-unstable":
    case "scenario-replayed":
    case "scenario-judged":
    case "rule-judged":
    case "binding-judged":
    case "extraction-judged":
    case "fact-blocks":
    case "not-observed":
    case "role-started":
    case "role-skipped":
    case "role-finished":
    case "steps-played":
    case "judgement-written":
    case "roles-counted":
      return flow;
    default: {
      const unreachable: never = event;
      return unreachable;
    }
  }
}

export type Panel = {
  readonly phase: Phase;
  // the phase runs: its round and what the agent does are drawn too
  readonly running?: { readonly round: number };
  readonly findings: readonly string[];
  // the findings left out
  readonly more: number;
};

// While a phase runs, its last failed gate cut to `most` findings; once the extraction has
// failed, every finding of the phase that failed — nothing when its gate found none.
export function panelOf(flow: Flow, most: number): Panel | undefined {
  const all = flow.gate?.findings ?? [];
  const running = flow.boxes.find(({ state }) => state === "running");
  if (running !== undefined) {
    return {
      phase: running.phase,
      running: { round: running.round },
      findings: all.slice(0, most),
      more: Math.max(0, all.length - most),
    };
  }
  const failed = flow.boxes.find(({ state }) => state === "failed");
  return flow.ok === false && failed !== undefined && all.length > 0
    ? { phase: failed.phase, findings: all, more: 0 }
    : undefined;
}

const written: Readonly<Record<Phase, readonly (keyof Counts)[]>> = {
  target: [],
  interfaces: ["interfaces"],
  specification: ["structures", "facts", "operations", "rules"],
  scenarios: ["scenarios"],
  record: ["references"],
};

// ("specification", {structures: 4, facts: 0, operations: 17, …}) -> ["4 structures", "17 operations", …]
export function countsOf(phase: Phase, counts: Counts | undefined): readonly string[] {
  if (counts === undefined) return [];
  return written[phase].flatMap((name) =>
    counts[name] === 0 ? [] : [`${counts[name]} ${name}`],
  );
}

// 0 -> "0s"; 65_000 -> "1m05"; 3_725_000 -> "1h02m"
export function duration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (hours > 0) return `${hours}h${pad(minutes)}m`;
  if (minutes > 0) return `${minutes}m${pad(total % 60)}`;
  return `${total}s`;
}
