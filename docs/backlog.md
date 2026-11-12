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

## Open questions, no item yet

- A fact evaluated for another actor than the caller: does its name take the actor as a
  parameter?
- Who chooses what `:assert` looks at: the scenario, or the facts its operation cites?
- A fact the interfaces do not show ("the email is not registered yet").
- A constraint between two inputs ("the end is after the start").
- The decision on a refuted claim — the claim was wrong, or the target has a bug — and how
  a wanted deviation is named.
