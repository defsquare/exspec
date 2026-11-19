import { type Event, type Phase, phaseSchema, type Role } from "../shapes/event.ts";

export type PhaseState = {
  readonly phase: Phase;
  readonly state: "to-do" | "running" | "done" | "skipped" | "failed";
  // 0 before it starts; 1 at phase-started; +1 at each failed gate
  readonly round: number;
  readonly cost?: number;
  readonly startedAt?: number;
  readonly endedAt?: number;
};

// a role's session running in the phase
export type RoleSession = {
  readonly role: Role;
  readonly interface?: string;
  readonly startedAt: number;
  // 1 at role-started; +1 at each of its gates that fails
  readonly round: number;
  readonly used?: { readonly tool: string; readonly about: string };
};

// what is wrong in the running phase, by who says it: an interface, a role that has none,
// a scenario's path
export type Trouble = { readonly by: string; readonly lines: readonly string[] };

type Counted = "written" | "failed" | "skipped" | "kept" | "unstable";

export type Flow = {
  readonly dir?: string;
  readonly startedAt?: number;
  readonly endedAt?: number;
  readonly ok?: boolean;
  readonly boxes: readonly PhaseState[];
  // what a roles' phase did in this run: {reading: {written: 3}} -> "3 read"
  readonly counts?: Readonly<
    Partial<Record<Phase, Readonly<Partial<Record<Counted, number>>>>>
  >;
  // the judgements of the run by verdict, once counted
  readonly verdicts?: Extract<Event, { type: "roles-counted" }>["verdicts"];
  // the running phase's panel, all of it cleared at phase-started
  readonly gate?: { readonly round: number; readonly findings: readonly string[] };
  readonly said?: string;
  readonly used?: { readonly tool: string; readonly about: string };
  readonly target?: { readonly step: string; readonly state: string };
  readonly sessions: readonly RoleSession[];
  readonly troubles: readonly Trouble[];
  // the sessions a roles' step was given, and how many of them are over: skipped or finished
  readonly queued?: {
    readonly role: Role;
    readonly count: number;
    readonly done: number;
  };
  // kept from one phase to the next
  readonly failed?: string;
};

export const emptyFlow: Flow = {
  boxes: phaseSchema.options.map((phase) => ({ phase, state: "to-do", round: 0 })),
  sessions: [],
  troubles: [],
};

const inBox = (
  flow: Flow,
  phase: Phase,
  change: (box: PhaseState) => PhaseState,
): Flow => ({
  ...flow,
  boxes: flow.boxes.map((box) => (box.phase === phase ? change(box) : box)),
});

const runningPhase = (flow: Flow): Phase | undefined =>
  flow.boxes.find(({ state }) => state === "running")?.phase;

export const phaseOfRole: Readonly<Record<Role, Phase>> = {
  "structures-reader": "reading",
  "common-reader": "reading",
  reader: "reading",
  builder: "evidence",
  judge: "judgement",
};

type By = { readonly role: Role; readonly interface?: string | undefined };

// {role: a, interface: f} -> "f"; {role: a} -> "a"
const byOf = ({ role, interface: of }: By) => of ?? role;

const sameSession = (a: By, b: By) => a.role === b.role && a.interface === b.interface;

const counting = (flow: Flow, phase: Phase, what: Counted): Flow => ({
  ...flow,
  counts: {
    ...flow.counts,
    [phase]: { ...flow.counts?.[phase], [what]: (flow.counts?.[phase]?.[what] ?? 0) + 1 },
  },
});

// {by: a, lines: m} on [{by: a, lines: l}, {by: b, ...}] -> [{by: a, lines: m}, {by: b, ...}]
const troubled = (flow: Flow, trouble: Trouble): Flow => ({
  ...flow,
  troubles: flow.troubles.some(({ by }) => by === trouble.by)
    ? flow.troubles.map((one) => (one.by === trouble.by ? trouble : one))
    : [...flow.troubles, trouble],
});

// one more session of the queued role over: {role: a, count: 3, done: 1} -> done: 2
const queuedOver = (flow: Flow, role: Role): Flow =>
  flow.queued?.role === role
    ? { ...flow, queued: { ...flow.queued, done: flow.queued.done + 1 } }
    : flow;

const withSession = (
  flow: Flow,
  of: By,
  change: (session: RoleSession) => RoleSession,
): Flow => ({
  ...flow,
  sessions: flow.sessions.map((session) =>
    sameSession(session, of) ? change(session) : session,
  ),
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
      const { gate, said, used, target, queued, ...kept } = flow;
      return inBox({ ...kept, sessions: [], troubles: [] }, event.phase, (box) => ({
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
      if ("phase" in event) {
        if (event.ok) return flow;
        const { phase, findings } = event;
        const round = flow.boxes.find((box) => box.phase === phase)?.round ?? 0;
        return inBox({ ...flow, gate: { round, findings } }, phase, (box) => ({
          ...box,
          round: box.round + 1,
        }));
      }
      const by = byOf(event);
      if (event.ok) {
        return { ...flow, troubles: flow.troubles.filter((one) => one.by !== by) };
      }
      if (runningPhase(flow) === undefined) return flow;
      return withSession(
        troubled(flow, { by, lines: event.findings }),
        event,
        (session) => ({ ...session, round: session.round + 1 }),
      );
    }
    case "agent-said":
      return "phase" in event && runningPhase(flow) !== undefined
        ? { ...flow, said: event.text.replace(/\n[\s\S]*/, "") }
        : flow;
    case "agent-used": {
      const { tool, about } = event;
      return "phase" in event
        ? { ...flow, used: { tool, about } }
        : withSession(flow, event, (session) => ({ ...session, used: { tool, about } }));
    }
    case "agent-ended": {
      const phase = "phase" in event ? event.phase : runningPhase(flow);
      if (phase === undefined || event.cost === undefined) return flow;
      const { cost } = event;
      return inBox(flow, phase, (box) => ({ ...box, cost: (box.cost ?? 0) + cost }));
    }
    case "role-started":
      return runningPhase(flow) === undefined
        ? flow
        : {
            ...flow,
            sessions: [
              ...flow.sessions,
              {
                role: event.role,
                ...(event.interface === undefined ? {} : { interface: event.interface }),
                startedAt: at,
                round: 1,
              },
            ],
          };
    case "roles-queued":
      return runningPhase(flow) === undefined
        ? flow
        : { ...flow, queued: { role: event.role, count: event.count, done: 0 } };
    case "role-skipped":
      return counting(queuedOver(flow, event.role), phaseOfRole[event.role], "skipped");
    case "role-failed":
      return runningPhase(flow) === undefined
        ? flow
        : troubled(flow, { by: byOf(event), lines: [event.message] });
    case "role-finished": {
      const left: Flow = {
        ...queuedOver(flow, event.role),
        sessions: flow.sessions.filter((session) => !sameSession(session, event)),
      };
      if (event.ok) {
        return event.role === "reader" ? counting(left, "reading", "written") : left;
      }
      const by = byOf(event);
      const failed = counting(left, phaseOfRole[event.role], "failed");
      return runningPhase(flow) === undefined ||
        flow.troubles.some((one) => one.by === by)
        ? failed
        : troubled(failed, { by, lines: ["ended in error"] });
    }
    case "reference-written":
      return counting(flow, "evidence", "written");
    case "reference-kept":
      return counting(flow, "evidence", "kept");
    case "scenario-unstable": {
      const counted = counting(flow, "evidence", "unstable");
      return runningPhase(flow) === undefined
        ? counted
        : troubled(counted, {
            by: event.path,
            lines: [`unstable: ${event.differences.length} differences`],
          });
    }
    case "judgement-written":
      return counting(flow, "judgement", "written");
    case "roles-counted":
      return { ...flow, verdicts: event.verdicts };
    case "extraction-not-found":
    case "problem":
    case "gap":
    case "extraction-counted":
    case "extraction-phases":
    case "scenario-played":
    case "scenario-unplayable":
    case "scenario-replayed":
    case "scenario-judged":
    case "rule-judged":
    case "binding-judged":
    case "extraction-judged":
    case "fact-blocks":
    case "not-observed":
    case "steps-played":
      return flow;
    default: {
      const unreachable: never = event;
      return unreachable;
    }
  }
}
