import type { AgentPhase } from "../derive/phases.ts";
import type { Phase } from "../shapes/event.ts";
import type { Flow, RoleSession, Trouble } from "./flow.ts";

export type Panel =
  | {
      readonly kind: "session";
      readonly phase: Phase;
      // the phase runs: its round and what the agent does are drawn too
      readonly running?: { readonly round: number };
      readonly findings: readonly string[];
      // the findings left out
      readonly more: number;
    }
  | {
      readonly kind: "roles";
      readonly phase: Phase;
      readonly running: boolean;
      // the last scenario played, while the phase runs and no session does
      readonly played?: string;
      readonly sessions: readonly RoleSession[];
      readonly troubles: readonly Trouble[];
      // the troubles left out
      readonly more: number;
    };

const agentPhases: readonly AgentPhase[] = ["target", "interfaces"];

const isRoles = (phase: Phase) => !agentPhases.some((one) => one === phase);

// A running agent phase: its last failed gate cut to `most` findings. A running roles' phase:
// its sessions, and the last `most` troubles. Once the extraction has failed, every finding
// or trouble of the phase that failed — nothing when it has none.
export function panelOf(flow: Flow, most: number): Panel | undefined {
  const running = flow.boxes.find(({ state }) => state === "running");
  if (running !== undefined) {
    if (isRoles(running.phase)) {
      return {
        kind: "roles",
        phase: running.phase,
        running: true,
        ...(flow.sessions.length === 0 && flow.played !== undefined
          ? { played: flow.played }
          : {}),
        sessions: flow.sessions,
        troubles: flow.troubles.slice(-most),
        more: Math.max(0, flow.troubles.length - most),
      };
    }
    const all = flow.gate?.findings ?? [];
    return {
      kind: "session",
      phase: running.phase,
      running: { round: running.round },
      findings: all.slice(0, most),
      more: Math.max(0, all.length - most),
    };
  }
  const failed = flow.boxes.find(({ state }) => state === "failed");
  if (flow.ok !== false || failed === undefined) return undefined;
  if (isRoles(failed.phase)) {
    return flow.troubles.length === 0
      ? undefined
      : {
          kind: "roles",
          phase: failed.phase,
          running: false,
          sessions: [],
          troubles: flow.troubles,
          more: 0,
        };
  }
  const all = flow.gate?.findings ?? [];
  return all.length > 0
    ? { kind: "session", phase: failed.phase, findings: all, more: 0 }
    : undefined;
}

// what a phase writes, one of it and several
const written: Readonly<Record<Phase, readonly [string, string]>> = {
  target: ["", ""],
  interfaces: ["", ""],
  reading: ["read", "read"],
  evidence: ["reference", "references"],
  judgement: ["judgement", "judgements"],
};

// evidence with {written: 3, kept: 2, failed: 1}, 2 sessions and 4 of 9 builders queued over
//   -> ["3 references", "2 kept", "4 of 9 builders", "2 running", "1 failed"]
// what counts scenarios first, then what counts sessions; a zero is left out, except in
// "0 of 9 builders", said for as long as the phase runs
export function countsOf(phase: Phase, flow: Flow): readonly string[] {
  const counts = flow.counts?.[phase];
  const isRunning = flow.boxes.some(
    (box) => box.phase === phase && box.state === "running",
  );
  const { queued } = flow;
  const of =
    queued?.phase === phase && isRunning
      ? [
          `${queued.done} of ${queued.count} ${queued.role}${queued.count === 1 ? "" : "s"}`,
        ]
      : [];
  const said = ([n, word]: readonly [number, string]) => (n > 0 ? [`${n} ${word}`] : []);
  return [
    ...said([counts?.written ?? 0, written[phase][counts?.written === 1 ? 0 : 1]]),
    ...said([counts?.unstable ?? 0, "unstable"]),
    ...said([counts?.kept ?? 0, "kept"]),
    ...of,
    ...said([isRunning ? flow.sessions.length : 0, "running"]),
    ...said([counts?.failed ?? 0, "failed"]),
    ...said([counts?.skipped ?? 0, "skipped"]),
  ];
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
