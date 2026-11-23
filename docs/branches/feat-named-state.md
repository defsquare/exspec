# feat/named-state

## Frame

**Goal.** A state of the system has a name in the specification — what is seen in it —
that a rule cites and a scenario starts from; the way to reach it is proven once, not
searched for by every builder. Measured on `trainings` (then `spring-petclinic-rest`):
the rules left `not-shown` for a state never reached, and what a build costs.

**Non-goals.** A richer seed. Scenarios sharing one world in place. The capture and
restore of a proven state's world (set apart, last). Another extraction of `her_hippos`
before the design holds on a cheaper target.

The design: ADR-0025 and ADR-0026 (Accepted).

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

- **Built** (2026-11-22): `states.yaml` and its check; the `state` step,
  replaced by its path's steps in `derive`; the builder told, and
  `check` / `status` reading the file. Each reviewed;
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
- **The builder told to choose the situation first** (2026-11-22): a state is a start,
  the situation is the rule's. `assign-trainer` built again: `domain-rule-holds` starts
  from the scheduled session and arranges a second, overlapping one; 17 of 20 scenarios
  still start from a state, 0.26 USD and 60 s; 18 `holds` and 2 `not-shown`, as before
  the states. The second session cites the path's literals (`prog-a`, `tr-a`): a path's
  values are part of what a scenario that starts from it may write.
- **Seen while measuring.** A state whose path is `not-shown` for a reason foreign to it
  is not reached: `create-program/answers` creates the program and is `not-shown` for a
  `Location` header that is not recorded. Nothing ties the rule a path proves to `seen`.

- **The pass that gathers, designed** (2026-11-22, ADR-0026). Two forms to the
  challenger. First: "keep the direction, reduce it" — `<operation>/answers` is not
  always written (8 of 52 on `trainings`, 28 of the 44 others read nothing after the
  call), and a review by a flag is enforced by nothing. The user then set aside any stop
  and any YAML to edit: the review is after the fact. Second: "keep the direction, the
  order is wrong" — the reader's rule is the structures reader's (file missing, every
  interface read), a state not reached is a gap before anything writes the file, the
  rename command and the page wait for names to judge. Not taken: its claim that a
  state's finding stops the evidence phase — `runPhase` reads `target.yaml` and
  `interfaces.yaml` only.
- **The pass that gathers, built** (2026-11-22): a state not reached is a gap, the check
  of a path's scenario, a reading not done without `states.yaml` (reviewed:
  two Important, fixed); the states' reader, what a builder is
  told, the path operations first (reviewed: approved).
  Minor, for the pre-merge challenger: "1 operations are not read yet"; the first wave
  stops every operation on one path's builder failing; `RolesGap` repeats the kinds of
  `gapSchema`.
- **Gathered on `trainings`** (2026-11-22, the copy, the two states by hand set aside).
  The states' reader: 14 states, one session, 54 s, 0.45 USD, its check passed at once;
  read by the user: "plutôt bien". They chain — session planned, then a learner
  enrolled, then an attendance recorded, or completed, or its convention issued — and
  four are a bare creation. Before anything ran, 9 were reached by what the extraction
  held. `extract --phase evidence` then `judgement`: 4.03 + 1.07 USD, 12 sessions of
  builders and judges then 5 judges; three path operations built first (two paths not
  written, one without its `after`), two paths given their `after`. After: 12 of 14
  reached. The two others are problems of `check`, both for a reason foreign to `seen`:
  `create-program/answers` `not-shown` (the `Location` header), `complete-session/answers`
  `contradicted` (its rule says the answer carries attendance and progress; it does not).
  Not a measure of what a builder saves: only the five operations with something left
  were built again, and 85 of their 89 state steps start from `a-session-planned`.
- **What a builder saves with the gathered states** (2026-11-22, six operations that need
  the chained states built again with `--only`, once each; before: the builders' cost in
  the run of 2026-11-21):

  | Operation | Cost USD | Scenarios from a state | The states |
  |---|---|---|---|
  | record-progress | 0.45 → 0.29 | 26 of 28 | learner enrolled 26 |
  | unenroll-learner | 0.35 → 0.39 | 0 of 19 | — |
  | list-session-attendance | 0.29 → 0.22 | 11 of 15 | attendance recorded 10, session planned 1 |
  | admin-get-convention-pdf | 0.31 → 0.28 | 5 of 9 | convention issued 4, session planned 1 |
  | record-attendance | 0.50 → 0.32 | 25 of 28 | learner enrolled 24, attendance recorded 1 |
  | remove-session | 0.34 → 0.23 | 12 of 16 | session planned 9, three others 1 each |

  2.24 → 1.73 USD, 23 % less; the five that used a state, 28 % less. `record-attendance`
  had cost 0.43 with the two states by hand, neither of which it could use: 247 steps
  written then, 99 now. `unenroll-learner` used none, though "a learner enrolled" is its
  situation: one run, a builder's choice, not looked into. The chained states are used
  (enrolled 51 times, attendance recorded 12, convention issued 5) though their paths
  arrange by hand: a path that starts from a state would spare 14 scenarios, not the
  1100 others — left where ADR-0025 leaves it.
- **A state is reached when its sentence is judged on its path** (2026-11-22, ADRs
  amended, built, reviewed: approved). From the two states left
  unreached on `trainings` and the user's objection to "accepted is enough". The
  challenger had read two forms and leaned to the one with no judge.

- **The states judged on the copy** (2026-11-22): 13 judges, 2.79 USD; 13 of 14 reached,
  `a-program-created` and `a-session-completed` among them, each on what its `after`
  step reads. The fourteenth waits for a reference my measuring script did not record.
- **The states on the page, a state renamed** (2026-11-22; built, reviewed: approved, no
  Critical nor Important). A sheet "The states"; a scenario's panel says the state it
  starts from, its steps staying the ones played. `exspec states rename` rewrites the
  name in `states.yaml`, the scenarios and the judgements, computed whole before a file
  is written, refused to an agent's session. Minor: a write that fails midway leaves a
  half rename; a key `my-state: a` makes it refuse where it could go on.
- **Pre-merge review** (2026-11-23, the challenger on `git diff main...`): "ready after
  these fixes" — no rule bent, no dead branch of the first form; words of it left in two
  ADRs, comments and tests' names, a broken sentence and examples taken from `trainings`
  in the builder's instructions: fixed. Older debt it names, not split here:
  `roles-view.ts` (563 lines), `main.ts` (309), `roles-build.ts` (356, `rolesPlay` would
  go in a module of its own), `check-built.ts` (306). `RolesGap` repeats the kinds of
  `gapSchema`. No merge asked.
- **The full run on `trainings`** (2026-11-23, a fresh copy, `extract` once, from the
  reading to the judgement; before: the run of 2026-11-21, its costs corrected). 1 h 53,
  29.04 USD against 30.58 for the same roles: reading 8.47 (7.90; the states' reader 0.44,
  the structures read again 0.24), builders 12.71 (14.35, 11 % less), judges 7.85 (8.33).
  13 states gathered, other names than the first time, the same chain; the 13 path
  operations built, recorded and judged first, the 13 states reached, no problem of
  `check`, no gap of a state. 938 scenarios (1071 before: the readers wrote fewer rules).
  Two defects seen, fixed:
  - 18 of the 37 other builders used no state, all or nothing by builder; one said it
    could not find the step name a hole needs. The names are now in the task. Six of them
    run again: 105 of 121 scenarios from a state, 1.76 → 1.35 USD.
  - Four reading operations whose scenarios all start from a state written by another
    actor were never recorded nor judged, the extraction ending ok: the check told
    without the target took the path's actor for unknown. Fixed; `extract` again finished
    them (1.97 USD more with the six rebuilt).
  After: 50 operations judged, 941 scenarios, 341 from a state in 25 operations; 784
  `holds` (83 %), 149 `not-shown`, 8 `contradicted` — 87 % held before. From a state 81 %
  hold, the others 84 %: not looked into rule by rule. The 13 path operations start from
  no state — they are built before any is reached — and cost 4.50 USD of the 12.71.
  The page read on this run: the sheet "The states" shows each with its sentence, its
  verdict, the rules it serves and the scenarios that start from it.

## Backlog

- [ ] An operation whose check of what is built fails is skipped by the recording and by
  its judge, and the extraction ends ok: nothing says it is left. Seen on the full run.
- [ ] From a state, 81 % of the scenarios hold against 84 % of the others: read the
  `not-shown` of the scenarios that start from a state.
- [ ] Before a merge, the history: fold "check and status show what states.yaml fails
  on" into "check reads states.yaml"; the fix of the path's actors into the commit that
  replaces a state step; "a builder chooses the situation…" is a `feat`, "checkBuilt is
  told the states…" a `refactor`.
- [ ] `serves` is checked by the states' reader alone and read by the page alone: a rule
  renamed later leaves a dead link there.
- [ ] In the first wave one path's builder failing stops the evidence of every operation;
  a state its path does not show puts its operation first again at each extraction
  (nothing left: no cost).
- [ ] ADR-0025 › Not decided here.
- [ ] The world of a proven state captured and restored — last, apart.

Taken from `docs/backlog.md`: *A scenario that starts from the end of another one, judged
to hold* (Source: `docs/branches/feat-calls-in-the-evidence.md` at `04d6a81`, Journal ›
"Not built, from the user").
