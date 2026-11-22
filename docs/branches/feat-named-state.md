# feat/named-state

## Frame

**Goal.** A state of the system has a name in the specification — what is seen in it —
that a rule cites and a scenario starts from; the way to reach it is proven once, not
searched for by every builder. Measured on `trainings` (then `spring-petclinic-rest`):
the rules left `not-shown` for a state never reached, and what a build costs.

**Non-goals.** A richer seed. Scenarios sharing one world in place. The capture and
restore of a proven state's world (set apart, last). Another extraction of `her_hippos`
before the design holds on a cheaper target.

The design: ADR-0025 (Proposed).

## Journal

- **Before the design** (2026-11-22, read on extractions made, nothing played). On
  `trainings`, arrangements told by the operations they call: a program alone 116
  scenarios of 13 operations; program, client, trainer, session scheduled 96 of 15, and
  the same in two other orders 29; a client and a learner 35 of 7. On six interfaces of
  `her_hippos`: 82 rules, the states of a request line cited 80 times in prose; on one
  interface 9 rules of 19 `not-shown`, 5 for a line that never left its first state.
- **The design challenged** (2026-11-22): "keep the direction, reduce it". Two defects
  taken: an evidence that dropped the path's steps could not be played back and let a
  judgement outlive its path; `in` / `leaves` said neither the state before nor the one a
  refusal is played from. First slice: three states of `trainings`, no rule rewritten.
  What it measures is what a build costs; the rules left `not-shown` on `trainings` are
  so for other reasons.

## Backlog

- [ ] `states.yaml` (`state`, `of`, `seen`, `serves`), its check; a path is a scenario at
      `states/<state>/path.yaml`, judged against `seen`.
- [ ] The `state` step, replaced by the path's steps in `derive` before play and before
      the comparison; first test with no target: the step replaced, the evidence whole
      read as written, the judge's text changing when the path does.
- [ ] The pass that gathers the states after the readers; the review.
- [ ] `trainings`: three states (a program; program, client, trainer, session scheduled;
      a client and a learner), four interfaces rebuilt, the build's cost before and after.
- [ ] After the measure: ADR-0025 › Not decided here.
- [ ] The world of a proven state captured and restored — last, apart.

Taken from `docs/backlog.md`: *A scenario that starts from the end of another one, judged
to hold* (Source: `docs/branches/feat-calls-in-the-evidence.md` at `04d6a81`, Journal ›
"Not built, from the user").
