# feat/play

## Frame

**Goal.** A scenario played against a running target and what it answered written down;
a reference from two executions on two fresh stacks, its noise in classes; a replay
compared with the reference. Five commands: `up`, `down`, `play`, `record`, `replay`.
The lifecycle is the target's own commands (ADR-0004); the noise is kept beside the copy
(ADR-0005). Conduit's fixture becomes playable, with a live test apart from `bun test`.

**Non-goals.** `assert` and the readings before and after the judged call; side effects
and any observable; the verdicts; the agent.

## Journal

## Backlog

### Playing a scenario against a target

- **Seen.** The spike recorded 167 scenarios of Conduit in 36 s and replayed them in 18 s,
  restoring the database between two scenarios; a pool of ids held in the target's memory
  survived the restore on Fineract.
- **Settled.** An execution fills a copy of the scenario and adds `:run` (target, version,
  when, the clock it was started with). Only what the interfaces expose is compared.
- **Next.** Start Conduit from its compose file, play the two scenarios of item 2, write
  their played copies. Decide what the starting state holds besides the database, and how
  a scenario starts from it (an ADR).
- **Source.** `docs/brief/spike-journal.md` › Journal 1, 6, 20; `docs/brief/framing.md` ›
  "To settle before the first line" (the world's boundary).

### The reference, the noise, the replay

- **Seen.** Noise as a wildcard per leaf let 3 mutants of 8 survive; as classes of equal
  values it did not. A value that differs every time with no equal elsewhere (a token)
  needs a mark with no equality.
- **Settled.** Two executions; one copy kept; equal noisy values, equal marks. A replay is
  one more played copy compared with the reference.
- **Next.** Record the two scenarios twice, mark the noise, replay green; turn one red by
  hand and show where it differs.
- **Source.** `docs/brief/spike-journal.md` › Journal 6; `docs/brief/fit-conduit.md`.
