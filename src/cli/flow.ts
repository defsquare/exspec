import { type Event, type Phase, phaseSchema } from "../shapes/event.ts";

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
  // what a roles' phase did in this run: {reading: 3} -> "3 read"
  readonly counts?: Readonly<Partial<Record<Phase, number>>>;
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

// a role's event names no phase: it serves the one running
const runningPhase = (flow: Flow): Phase | undefined =>
  flow.boxes.find(({ state }) => state === "running")?.phase;

const counting = (flow: Flow, phase: Phase): Flow => ({
  ...flow,
  counts: { ...flow.counts, [phase]: (flow.counts?.[phase] ?? 0) + 1 },
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
      const phase = "phase" in event ? event.phase : runningPhase(flow);
      if (phase === undefined || event.ok) return flow;
      if (!("phase" in event)) {
        // sessions run at once, so no round of their own: {interface: g, findings: ["x"]} -> "g: x"
        const { interface: by, findings } = event;
        const round = flow.boxes.find((box) => box.phase === phase)?.round ?? 0;
        const named = findings.map((finding) =>
          by === undefined ? finding : `${by}: ${finding}`,
        );
        return { ...flow, gate: { round, findings: named } };
      }
      const { findings } = event;
      const round = flow.boxes.find((box) => box.phase === phase)?.round ?? 0;
      return inBox({ ...flow, gate: { round, findings } }, phase, (box) => ({
        ...box,
        round: box.round + 1,
      }));
    }
    case "agent-said":
      return ("phase" in event ? event.phase : runningPhase(flow)) === undefined
        ? flow
        : { ...flow, said: event.text.replace(/\n[\s\S]*/, "") };
    case "agent-used":
      return ("phase" in event ? event.phase : runningPhase(flow)) === undefined
        ? flow
        : { ...flow, used: { tool: event.tool, about: event.about } };
    case "agent-ended": {
      const phase = "phase" in event ? event.phase : runningPhase(flow);
      if (phase === undefined) return flow;
      const { turns, cost } = event;
      return inBox(flow, phase, (box) => ({
        ...box,
        turns: box.turns + turns,
        ...(cost === undefined ? {} : { cost: (box.cost ?? 0) + cost }),
      }));
    }
    case "role-finished":
      return event.ok && event.role === "reader" ? counting(flow, "reading") : flow;
    case "reference-written":
      return counting(flow, "evidence");
    case "judgement-written":
      return counting(flow, "judgement");
    case "extraction-not-found":
    case "problem":
    case "gap":
    case "extraction-counted":
    case "extraction-phases":
    case "scenario-played":
    case "scenario-unplayable":
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
    case "steps-played":
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

const written: Readonly<Record<Phase, string>> = {
  target: "",
  interfaces: "",
  reading: "read",
  evidence: "references",
  judgement: "judged",
};

// ("reading", {reading: 3}) -> ["3 read"]; a phase with no count, or a zero, -> []
export function countsOf(phase: Phase, counts: Flow["counts"]): readonly string[] {
  const n = counts?.[phase] ?? 0;
  return n === 0 ? [] : [`${n} ${written[phase]}`];
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
