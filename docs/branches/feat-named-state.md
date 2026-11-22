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

- **Built** (2026-11-22): `states.yaml` and its check (`2a46492`); the `state` step,
  replaced by its path's steps in `derive` (`22ab5ce`, `aef23b6`); the builder told, and
  `check` / `status` reading the file (`e33a553`, `05d95a2`, `488ccb3`). Each reviewed;
  one Important finding a round on the last two, fixed. Minor, for the pre-merge reading:
  `serves` is checked against nothing; `roles-files.ts` is past 300 lines; a finding
  about a replaced step shows the name as replaced (`{{p-s.id}}`), not as written
  (`{{p.s.id}}`); the fix commits are to be squashed into the commits they fix.
- **Measured on `trainings`** (a copy, two states written by hand: `a-session-scheduled`
  by `schedule-session/answers`, `a-client-with-a-learner` by `register-learner/answers`;
  four builders run again with `--force`, once each; before: the run of 2026-11-21):

  | Operation | Cost USD | Seconds | Steps written | Scenarios from a state |
  |---|---|---|---|---|
  | assign-trainer | 0.34 → 0.27 | 94 → 57 | 147 → 72 | 17 of 20 |
  | update-session-location | 0.37 → 0.25 | 102 → 63 | 150 → 87 | 19 of 27 |
  | update-session-dates | 0.50 → 0.30 | 145 → 74 | 188 → 108 | 26 of 30 |
  | record-attendance | 0.50 → 0.43 | 155 → 118 | 247 → 189 | 0 of 27 |

  `record-attendance` used no state — it needs a learner enrolled in the session, which
  neither state gives — and still cost 15 % less: that much is not the states' doing. The
  three that used one: 22, 31 and 41 % less. One run each: a direction, not a figure.
  Recorded, replayed (77 of 77 as recorded) and judged: 69 `holds` against 71 before. The
  flips on the rules about the API key are the judge's, on scenarios with no state. One
  is the state's: for `domain-rule-holds` of `assign-trainer` the builder, a scheduled
  session at hand, took a trainer that does not exist (a 404, judged `contradicted`)
  where it had arranged two overlapping sessions before. A state at hand pulls a builder
  toward the situation it already gives.
- **Seen while measuring.** A state whose path is `not-shown` for a reason foreign to it
  is not reached: `create-program/answers` creates the program and is `not-shown` for a
  `Location` header that is not recorded. Nothing ties the rule a path proves to `seen`.

## Backlog

- [ ] The pass that gathers the states after the readers; the review.
- [ ] A builder, a state at hand, keeps the situation its rule asks for.
- [ ] A state reached though its path is `not-shown` for what `seen` does not say.
- [ ] After the measure: ADR-0025 › Not decided here.
- [ ] The world of a proven state captured and restored — last, apart.

Taken from `docs/backlog.md`: *A scenario that starts from the end of another one, judged
to hold* (Source: `docs/branches/feat-calls-in-the-evidence.md` at `04d6a81`, Journal ›
"Not built, from the user").
