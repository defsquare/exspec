import { problemLine } from "../derive/phases.ts";
import {
  type Command,
  type Event,
  type Phase,
  phaseSchema,
  type Role,
  type SessionStep,
} from "../shapes/event.ts";

export type PhaseState = {
  readonly phase: Phase;
  readonly state: "to-do" | "running" | "done" | "skipped" | "failed";
  // 0 before it starts; 1 at phase-started and when a session's step starts; +1 at each
  // failed gate of that step
  readonly round: number;
  readonly cost?: number;
  readonly startedAt?: number;
  readonly endedAt?: number;
};

// a role's session running in the phase
export type RoleSession = {
  readonly role: Role;
  readonly interface?: string;
  readonly provider?: string;
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
  // what a phase did in this run: {specification: {written: 3}} -> "3 read"
  readonly counts?: Readonly<
    Partial<Record<Phase, Readonly<Partial<Record<Counted, number>>>>>
  >;
  // the judgements of the run by verdict, once counted
  readonly verdicts?: Extract<Event, { type: "roles-counted" }>["verdicts"];
  // The running phase's panel, from step to skips, all of it cleared at phase-started.
  // step: the session's step that spoke last, the target's from the target's phase
  // starting; none once a role's event comes after it
  readonly step?: SessionStep;
  readonly gate?: { readonly round: number; readonly findings: readonly string[] };
  readonly said?: string;
  readonly used?: { readonly tool: string; readonly about: string };
  readonly target?: { readonly step: string; readonly state: string };
  readonly sessions: readonly RoleSession[];
  readonly troubles: readonly Trouble[];
  // the last scenario played in the running phase: {interface: f, scenario: a} -> "f/a"
  readonly played?: string;
  // the sessions a roles' step was given, and how many of them are over: skipped or finished
  readonly queued?: {
    readonly phase: Phase;
    readonly role: Role;
    readonly count: number;
    readonly done: number;
  };
  // why the interfaces of the running phase were passed over, the same reason counted once
  readonly skips: readonly { readonly why: string; readonly count: number }[];
  readonly command?: Command;
  // what ended the command or a phase of the agent, and the problems of the files a
  // command of the roles reads first; kept from one phase to the next
  readonly failures: readonly string[];
};

export const emptyFlow: Flow = {
  boxes: phaseSchema.options.map((phase) => ({ phase, state: "to-do", round: 0 })),
  sessions: [],
  troubles: [],
  skips: [],
  failures: [],
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

// a command of the roles stands for the phase it does part of
export const phaseOfCommand: Readonly<Partial<Record<Command, Phase>>> = {
  "providers-read": "target",
  "providers-write-twin": "target",
  "roles-read": "specification",
  "roles-build": "proof",
  "roles-record": "proof",
  "roles-judge": "proof",
};

type By = {
  readonly role: Role;
  readonly interface?: string | undefined;
  readonly provider?: string | undefined;
};

// {role: a, interface: f} -> "f"; {role: a, provider: p} -> "p"; {role: a} -> "a"
const byOf = ({ role, interface: of, provider }: By) => of ?? provider ?? role;

const sameSession = (a: By, b: By) =>
  a.role === b.role && a.interface === b.interface && a.provider === b.provider;

// the count goes to the phase that runs; with none running, nothing changes
const counting = (flow: Flow, what: Counted): Flow => {
  const phase = runningPhase(flow);
  return phase === undefined
    ? flow
    : {
        ...flow,
        counts: {
          ...flow.counts,
          [phase]: {
            ...flow.counts?.[phase],
            [what]: (flow.counts?.[phase]?.[what] ?? 0) + 1,
          },
        },
      };
};

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

// ([{why: w, count: 1}], w) -> [{why: w, count: 2}]; a reason not said yet is appended
const skipped = (flow: Flow, why: string): Flow => ({
  ...flow,
  skips: flow.skips.some((one) => one.why === why)
    ? flow.skips.map((one) => (one.why === why ? { ...one, count: one.count + 1 } : one))
    : [...flow.skips, { why, count: 1 }],
});

// f(flow, a, 3) -> the box of a {state: running, round: 1, startedAt: 3}, the panel emptied
const startedPhase = (flow: Flow, phase: Phase, at: number): Flow => {
  const { step, gate, said, used, target, queued, played, ...kept } = flow;
  return inBox({ ...kept, sessions: [], troubles: [], skips: [] }, phase, (box) => ({
    ...box,
    state: "running",
    round: 1,
    startedAt: at,
  }));
};

const finishedPhase = (flow: Flow, phase: Phase, ok: boolean, at: number): Flow =>
  inBox(flow, phase, (box) => ({
    ...box,
    state: ok ? "done" : "failed",
    endedAt: at,
  }));

// a session's event of step s: s speaks; a step not speaking before starts at round 1, the
// last session's gate and words cleared
//   f({step: a, gate: g, box p round 2}, {phase: p, step: a}) -> unchanged
//   f({step: a, gate: g, box p round 2}, {phase: p, step: b}) -> {step: b, box p round 1}
const inStep = (flow: Flow, { phase, step }: { phase: Phase; step: SessionStep }) => {
  if (flow.step === step) return flow;
  const { gate, said, used, ...kept } = flow;
  return inBox({ ...kept, step }, phase, (box) => ({ ...box, round: 1 }));
};

// a role's event: the panel is the roles' again
const inRoles = (flow: Flow): Flow => {
  const { step, ...kept } = flow;
  return kept;
};

// f(flow, {phase-started: a}) -> flow with a running, round 1, and its panel emptied
export function flowAfter(flow: Flow, event: Event, at: number): Flow {
  switch (event.type) {
    case "command-started": {
      const started = { ...flow, command: event.command, dir: event.dir, startedAt: at };
      const phase = phaseOfCommand[event.command];
      return phase === undefined ? started : startedPhase(started, phase, at);
    }
    case "command-finished": {
      const ended = { ...flow, endedAt: at, ok: event.ok };
      const phase = phaseOfCommand[event.command];
      return phase === undefined ? ended : finishedPhase(ended, phase, event.ok, at);
    }
    case "command-failed":
      return { ...flow, failures: [...flow.failures, event.message] };
    case "target-step":
      return { ...flow, target: { step: event.step, state: event.state } };
    case "phase-started": {
      // the target's phase opens on its first session, which has not spoken yet
      const started = startedPhase(flow, event.phase, at);
      return event.phase === "target" ? { ...started, step: "target" } : started;
    }
    case "phase-skipped":
      return inBox(flow, event.phase, (box) => ({ ...box, state: "skipped" }));
    case "phase-finished":
      return finishedPhase(flow, event.phase, event.ok, at);
    case "gate-checked": {
      if ("phase" in event) {
        const stepped = inStep(flow, event);
        if (event.ok) return stepped;
        const { phase, findings } = event;
        const round = stepped.boxes.find((box) => box.phase === phase)?.round ?? 0;
        return inBox({ ...stepped, gate: { round, findings } }, phase, (box) => ({
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
        ? { ...inStep(flow, event), said: event.text.replace(/\n[\s\S]*/, "") }
        : flow;
    case "agent-used": {
      const { tool, about } = event;
      return "phase" in event
        ? { ...inStep(flow, event), used: { tool, about } }
        : withSession(flow, event, (session) => ({ ...session, used: { tool, about } }));
    }
    case "agent-ended": {
      const stepped = "phase" in event ? inStep(flow, event) : flow;
      const phase = "phase" in event ? event.phase : runningPhase(flow);
      if (phase === undefined || event.cost === undefined) return stepped;
      const { cost } = event;
      return inBox(stepped, phase, (box) => ({ ...box, cost: (box.cost ?? 0) + cost }));
    }
    case "role-started":
      return runningPhase(flow) === undefined
        ? flow
        : {
            ...inRoles(flow),
            sessions: [
              ...flow.sessions,
              {
                role: event.role,
                ...(event.interface === undefined ? {} : { interface: event.interface }),
                ...(event.provider === undefined ? {} : { provider: event.provider }),
                startedAt: at,
                round: 1,
              },
            ],
          };
    case "roles-queued": {
      const phase = runningPhase(flow);
      return phase === undefined
        ? flow
        : {
            ...inRoles(flow),
            queued: { phase, role: event.role, count: event.count, done: 0 },
          };
    }
    case "steps-played":
      return runningPhase(flow) === undefined
        ? flow
        : { ...flow, played: `${event.interface}/${event.scenario}` };
    case "role-skipped":
      return runningPhase(flow) === undefined
        ? flow
        : // the reader of the structures and of what is common are no interface passed over
          event.interface === undefined
          ? inRoles(flow)
          : skipped(
              counting(queuedOver(inRoles(flow), event.role), "skipped"),
              event.why,
            );
    case "role-failed":
      return runningPhase(flow) === undefined
        ? flow
        : troubled(flow, { by: byOf(event), lines: [event.message] });
    case "role-finished": {
      if (runningPhase(flow) === undefined) return flow;
      const left: Flow = {
        ...queuedOver(flow, event.role),
        sessions: flow.sessions.filter((session) => !sameSession(session, event)),
      };
      if (event.ok) {
        return event.role === "reader" ? counting(left, "written") : left;
      }
      return counting(left, "failed");
    }
    case "reference-written":
      return counting(flow, "written");
    case "reference-kept":
      return counting(flow, "kept");
    case "scenario-unstable": {
      const counted = counting(flow, "unstable");
      return runningPhase(flow) === undefined
        ? counted
        : troubled(counted, {
            by: event.path,
            lines: [
              "unstable",
              ...event.differences.map(
                ({ at, first, second }) =>
                  `${at.join(".")}: ${JSON.stringify(first)}, then ${JSON.stringify(second)}`,
              ),
            ],
          });
    }
    case "roles-counted":
      return { ...flow, verdicts: event.verdicts };
    case "problem":
      return { ...flow, failures: [...flow.failures, problemLine(event)] };
    case "extraction-not-found":
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
    case "state-renamed":
    // told by the verdicts once counted
    case "judgement-written":
      return flow;
    default: {
      const unreachable: never = event;
      return unreachable;
    }
  }
}
