# feat/evidence-as-reference

## Frame

**Goal.** The evidence of a roles' scenario becomes a reference: played twice on two fresh
stacks, its noise kept beside it, and replayed against a target with no agent. A judgement
is attached to that reference, so that an evidence played again and equal outside its
noise keeps its judgement: the judge is paid once.

It is the second of four decisions the user settled — the specification takes the roles'
form (`docs/backlog.md` › "Two specifications side by side") — and the first to do: the
default cannot move to the roles while only the computed path replays.

**Non-goals.** Folding the reader's rules into `operations/*.yaml`; `extract` running the
roles; deprecating a concept of the computed path. The headers of an answer and a body
that is not JSON in the evidence. A rule's name from one run of the reader to the next. A
reading that follows a change of the target's code. Reading Petclinic again with the reads
held: after this branch, before the default moves.

**How it is judged.** Without a target or an agent first: the derivations on evidence of
fixtures. Then on one target whose evidence exists, every scenario recorded twice and
replayed: no judgement goes stale that an equal answer should keep, and one planted
difference outside the noise is told.

## Journal

- **The user: go to the end of this branch, autonomous.** The design's choices are the
  main thread's, the challenger's review taken.
- **Design, challenger (opus): the direction kept, two points changed.** Kept: the noise
  as a key of the evidence; the hash left alone — the cause is the gate of `roles build`
  rewriting every evidence, not the hash, which reads `{rule, exchanges}` only. Changed:
  a `roles record` apart instead of a gate that plays twice — two plays on one stack call
  stable what the seed drew (ADR-0004), and a first copy that exists needs one play on a
  stack started for it; "of its scenario as written" compares the rule, `when` and `as`
  and the number of exchanges, not the requests only, and an evidence with an unplayable
  step is never a reference; `markNoise` pairs by index and drops what is left over — two
  copies of different lengths must be unstable; a first copy of another version of the
  target is not a first copy. Against the proposal's "only those are judged again": the
  judge reads the whole interface as soon as one judgement is stale — said in ADR-0013,
  left to the backlog. ADR-0013 written; ADR-0010 marked amended.
- **The measure will be on Conduit** (`targets/conduit`, 224 evidences, 19 files of
  judgements): the smallest, and the one read again since the reads are held.
- **The derivations on an evidence** (`d333ace` refactor, `4aca799`): implementer
  (sonnet), reviewer approved both verdicts. One finding fixed in the thread (`ab88e42`):
  a copy was compared with an evidence played once as if its noise were none — the
  reference's type now requires its noise.
- **The builder's gate, `roles record`, `roles replay`** (`8ba088e`, `3686f8c`):
  implementer (opus), reviewer two rounds. Round 1, one Important — four steps in one
  module — and four Minor, fixed by the implementer: the selection and one play in a
  module of their own; an interface whose check fails is told by `gate-checked`, not by a
  builder "skipped" that never ran; a message of its own for an evidence with an
  unplayable step; two names. Round 2, one left, fixed in the thread: such an interface
  makes the command not ok. 181 tests.
- **A subagent's report file is refused by the harness**: the three reports asked for
  were never written, each implementer handed its report back in its last message. The
  reviewer was given that message's content in its dispatch.
- **The measure, on Conduit** (`targets/conduit`, version `d8f34f0`, 224 evidences of
  2026-11-15, 19 files of judgements; its `roles/` kept aside before).
  - `roles record`: one start; 224 references written, none unstable; every evidence
    equal to what it was but for its `noise` (48 with none, the others 1 to 28 places); no
    other file moved. The page before: 224 gaps "played once", no stale judgement, 181
    holds, 3 contradicted, 5 not shown. After: no gap, no stale judgement, the same counts.
    The judge is not called.
  - `roles replay`, a third stack: 222 of 224 equal outside their noise. The two that
    differ are one cause, not the target's: a token that carries its expiry to the second.
    Two tokens issued in the same second are equal, a second apart they are not — a class
    of two places held in both recordings and broke in the replay
    (`create-user/email-not-taken`), two classes apart in the recordings fell together
    (`create-user/user-stored`). ADR-0005's classes, on the roles' evidence as on a
    reference: to the backlog.
  - One difference planted in a reference outside its noise (`get-tags/answers`, a tag
    renamed in the stored copy): told at its place, expected and answered; the seven other
    scenarios of the interface equal; the command not ok. The file put back.
- For the challenger (reviewer's Minor, and the main thread's): the count in a difference
  at `[exchanges]` is of answers, not of exchanges — three exchanges of which one
  unplayable against two reads "2 against 2"; `isAsWritten` has no test for an unnamed
  step cited by a hole nor for a hole in a body or a query; `src/derive/roles-view.ts` is
  413 lines; `roles-record.ts`, `roles-replay.ts` and `roles-scenarios.ts` drive no agent
  and live in `src/agent/`, beside `rolesPlay` and the plumbing they use; `gate-checked`
  there still says role `builder`; the comment over `rolesRecord` mixes prose into its
  example; `roles replay` reads the credentials before the start, for the actors' names,
  and again after the seed.

## Backlog

- **The first check, with no target.** Two evidences of a fixture that differ by one
  timestamp: the noise marked; a third copy compared with the reference answers no
  difference; the same key for the judgement. `src/derive/noise.ts` and
  `src/derive/compare.ts` rest on `answersOf` only: an `answersOf` over an evidence's
  exchanges — a flat list, each with its `when` — may be all they need.

- **A roles' evidence replays.**
  - **Seen.** The evidence of Petclinic played again from a reset: 333 of 333 scenarios
    answer the same statuses, 190 the same to the character, a timestamp differing in the
    other 143. No `roles replay`, no noise kept beside the evidence.
  - **Settled.** By the user: the evidence becomes a reference, and a judgement is
    attached to it.
  - **Source.** `docs/branches/spike-three-roles.md` at `d88b471`, "Three whole targets
    through the tool".

- **An evidence older than its scenario counts as done** (a finding of the review of the
  roles, from the backlog's "Loose ends of the roles"): the builder is skipped when every
  scenario has an evidence, whatever it is of.
