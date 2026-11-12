# Backlog

The only backlog. An item is written to be picked up cold: *Seen* (the evidence), *Settled*
(what is decided), *Next* (the first step), *Source* (where to read more). A done item is
deleted, never ticked: its commit says which item it closes. Order is the order to take
them in; each of the first five is a branch of its own.

## 5 — The verdicts, derived

- **Seen.** On the spike's data every requirement verified (30 of 30 on each of two
  targets); no effect could be verified, none having a `:then`. Distinct refusals answer one
  status on both targets (401, 404): the fact evaluated before the call says which one.
- **Settled.** A rule's verdict from a played copy and the operation; a binding's from the
  answer and the trigger; the provenance of a rule from all its verdicts. Two kinds of gap:
  the rule refuted, or the binding refuted.
- **Next.** Derive both verdicts for the scenarios of item 4, including Conduit's unknown
  article (401 where 404 is declared), and show them in the terminal.
- **Source.** `docs/brief/shapes.edn` › "DÉRIVÉ"; `docs/brief/fit-*.md` › the verdict test.

## 6 — What the two targets need that the shapes do not say yet

- **Seen.** 78 of 167 scenarios of Conduit and 111 of 183 of Petclinic fitted the shapes
  as first drawn; the list of what did not, with counts, is in the fit reports.
- **Settled.** These are terms to add, not concepts: `:assert` on a list (membership,
  count, order), on an instance that appears or vanishes, on a field of a list's element; a
  `:then` for each effect; an accepted answer with no body; an actor a prepared call
  creates, a value taken from an earlier answer, a raw token; a fact that counts; an
  optional key in an interface's schema.
- **Next.** Take them in the order of their counts, each with the scenario that needs it.
  Measure the fit again once inputs have their place: the reports predate it.
- **Source.** `docs/brief/fit-conduit.md`, `docs/brief/fit-petclinic.md`,
  `docs/brief/framing.md` › "The shapes, redrawn by instances and tested for fit".

## 7 — Scenarios derived from a rule, and values at the bounds

- **Seen.** No mutant of the spike moved a bound; its scenarios were written far from them.
  Conduit already has one pair at a bound: a password of seven characters refused, of eight
  accepted.
- **Settled.** A rule is written whole; each condition denied alone gives a scenario, each
  bound two. Generation applies to an operation's inputs only: a valid value, and the
  values on each side of a constraint of a field.
- **Next.** From the `:takes` of `register`, produce the missing scenarios as planned
  copies, play them, and count what thirty bound mutants do before and after.
- **Source.** `docs/brief/framing.md` › "Experiments left"; ADR-0001.

## 8 — The agent writes the scenarios and the specification

- **Seen.** In the spike one agent session wrote Conduit's 167 scenarios in 14 minutes;
  the rules, facts and structures were written by agents from the target's code.
- **Settled.** The agent is driven by the CLI and reports through the event stream; its
  instructions cite nothing of this project.
- **Next.** Frame it once items 2 to 5 exist: what the agent is asked for (a specification
  from the code, then scenarios for the rules no scenario points at), and how a refuted
  claim comes back to it or to a human.
- **Source.** `docs/brief/spike-journal.md` › Journal 2, 9, 14.

## 9 — The target's clock

- **Seen.** On Fineract a reference holds only on the day it was taken: 20 scenarios of 49
  red one business day later; 15 rules cannot be written without a term for today.
- **Settled.** The clock the target is started with is part of what an execution records;
  a scenario may move it as an arranged step.
- **Also.** A value fixed by the day (a date with no time) is stable on two stacks started
  the same day and red the next: two recordings do not show it (ADR-0005).
- **Next.** Not before a target with a clock is taken. Then: holding the clock of a target
  that offers nothing for it, a date type, calendar arithmetic in a rule.
- **Source.** `docs/brief/clock.md`.

## 10 — A rule is checked: the trace and the mutants

- **Seen.** In the spike one mutant per rule, written from the rules themselves, none moving
  a bound; line coverage neither classes scenarios nor says a rule is judged.
- **Settled.** The two scenarios on each side of a condition differ by a branch of the
  trace; a mutant of that branch must turn them red. Trace and mutants come from existing
  tools and belong to the target.
- **Next.** After item 7. One rule of Conduit, end to end, with JaCoCo and PIT.
- **Source.** `docs/brief/framing.md` › "Settled with the user".

## The reset is checked, through the interfaces

- **Seen.** A reset that restores too little is invisible to the two recordings: both
  stacks accumulate the same changes in the same order, and the result is stable and wrong.
- **Settled.** specimen holds no driver (ADR-0004); the check uses the interfaces alone.
- **Next.** Once a projection can be read: read every projection that takes no input, play
  a scenario that writes, reset, read again, compare. Make it the last step of `up`.
- **Source.** ADR-0004 › Consequences; `docs/branches/feat-play.md` at `f8bd037`.

## What a reference leaves free is measured

- **Seen.** Where two executions do not have the same form at a place (two lists of
  different lengths, a body that is not JSON once), the whole value there is one noisy
  place: `reference-written` counts 1, and a whole body or list is free. Lists are walked
  by index: two elements swapped become two crossed classes, and a replay that duplicates
  one element can pass.
- **Settled.** Noise is derived from two executions, in classes (ADR-0005); a reference
  where most of the answer is noisy compares little, and that is to show.
- **Next.** Count the leaves a noisy place frees, show it in `reference-written` and in
  `status`. Then pair the elements of a list by the identity of the structure a projection
  says it shows, instead of by index — it needs the projection, so after the readings.
- **Source.** ADR-0005 › Consequences; `docs/brief/spike-journal.md` › Journal 6;
  `docs/branches/feat-play.md` at `f8bd037`.

## A forced recording that changes the class of a status says so

- **Seen.** `record --force` rewrites a reference whose judged call answered 200 with one
  that answers 401, without a word. In the spike nothing stopped a recording from changing
  its class of status either.
- **Settled.** A reference is kept unless forced, and replaced when its scenario was
  rewritten.
- **Next.** When a reference is replaced and the status of its judged call changes, emit
  it as an event of its own; decide whether `--force` alone may do it.
- **Source.** `docs/brief/spike-journal.md` › Journal 5; `src/run/record.ts`.

## Open questions, no item yet

- A fact evaluated for another actor than the caller: does its name take the actor as a
  parameter?
- Who chooses what `:assert` looks at: the scenario, or the facts its operation cites?
- A fact the interfaces do not show ("the email is not registered yet").
- A constraint between two inputs ("the end is after the start").
- The decision on a refuted claim — the claim was wrong, or the target has a bug — and how
  a wanted deviation is named.
