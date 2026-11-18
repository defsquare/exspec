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

## Backlog

- **The design, before the code — keys added to stored shapes, so an ADR and the
  challenger first.** It extends ADR-0005 (a reference is a played copy, its noise beside
  it) and amends ADR-0010 (the evidence is played once; a judgement's hash is of what the
  judge was given).
  - Where the noise lives: a key of the evidence file, as a reference carries it, or a
    file beside it.
  - What a judgement's hash covers. Today `src/derive/judge-task.ts` hashes the raw
    exchanges, so a timestamp in an error body makes every judgement stale at each replay.
    The hash on the reference with its noisy places set aside — and what the judge is
    then given to read at those places.
  - The hash also covers what the operation's rules share: one rule changed makes every
    judgement of the operation stale. Kept or cut down.
  - The commands: `roles build` records twice, or a `roles record` apart; a `roles
    replay`, or `replay` reading both forms.
  - An evidence older than its scenario counts as done today: a reference cannot.

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
