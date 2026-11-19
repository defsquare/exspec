import type { Phase } from "../shapes/event.ts";
import { type Flow, phaseOfRole, type RoleSession, type Trouble } from "./flow.ts";

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
      readonly sessions: readonly RoleSession[];
      readonly troubles: readonly Trouble[];
      // the troubles left out
      readonly more: number;
    };

const rolesPhases: readonly Phase[] = Object.values(phaseOfRole);

// A running agent phase: its last failed gate cut to `most` findings. A running roles' phase:
// its sessions, and the last `most` troubles. Once the extraction has failed, every finding
// or trouble of the phase that failed — nothing when it has none.
export function panelOf(flow: Flow, most: number): Panel | undefined {
  const running = flow.boxes.find(({ state }) => state === "running");
  if (running !== undefined) {
    if (rolesPhases.includes(running.phase)) {
      return {
        kind: "roles",
        phase: running.phase,
        running: true,
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
  if (rolesPhases.includes(failed.phase)) {
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

const written: Readonly<Record<Phase, string>> = {
  target: "",
  interfaces: "",
  reading: "read",
  evidence: "references",
  judgement: "judged",
};

// reading with {written: 3, failed: 1} and 2 sessions -> ["3 read", "2 running", "1 failed"]
// a zero is left out
export function countsOf(phase: Phase, flow: Flow): readonly string[] {
  const counts = flow.counts?.[phase];
  const isRunning = flow.boxes.some(
    (box) => box.phase === phase && box.state === "running",
  );
  const lines: readonly (readonly [number, string])[] = [
    [counts?.written ?? 0, written[phase]],
    [isRunning ? flow.sessions.length : 0, "running"],
    [counts?.failed ?? 0, "failed"],
    [counts?.unstable ?? 0, "unstable"],
    [counts?.kept ?? 0, "kept"],
    [counts?.skipped ?? 0, "skipped"],
  ];
  return lines.filter(([n]) => n > 0).map(([n, word]) => `${n} ${word}`);
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
