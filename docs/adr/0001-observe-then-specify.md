# ADR-0001 — Observe, then specify

Status: Accepted (2026-11-12)

## Context

specy, the project this one comes from, judged a specification by generating worlds and
predicting the system's answers. On a real target (Conduit) four campaigns proved 9
operations of 19 and left 23 clauses inexpressible: building a world from a predicate and
predicting an answer (a password hash, a slug, a page, a filtered count) were the two
things it could not do in general.

A spike reversed the order — record what the system answers, then write the specification
on top — and held on three targets. A challenger and a debate between three model families
bounded what it proves (`docs/brief/`).

## Decision

1. **A scenario is what was observed.** It is written with holes — the answers, the side
   effects, what is seen before and after the judged call — and an execution of the target
   fills them. Nothing is predicted. Played twice, it gives a reference: one copy kept, what
   differs between the two marked as noise, equal noisy values keeping equal marks.
2. **The specification is declared whole and hung on the scenarios.** Operations and their
   rules, facts, structures and their fields. A scenario names the rules it tries to prove;
   an execution verifies or refutes them. Every claim has a provenance: derived, declared
   then verified, declared only, refuted.
3. **Only what the target's interfaces expose is compared.** An observable — the database,
   a trace of the code — detects and explains; it is never the reference.
4. **The bindings are apart.** What ties an interface or an observable of the target to the
   specification (projection, trigger, detects) is the only part that knows both sides, and
   the part a rewrite replaces.
5. **Nothing derivable is stored.**

## Alternatives

- **Repair the generative specification.** Keeps general statements judged on drawn worlds.
  Predicted, by its advocate in the debate, to kill ten points more of bound mutants; not
  measured. Rejected for the two frictions above, which four campaigns did not remove. What
  it did best is kept another way: a rule is written whole, with its bounds, and decides
  which scenarios to record.
- **An explicit state machine, checked by model-based testing.** Must predict answers too.
  The transitions are instead to be derived from the facts an operation requires and
  changes.
- **Existing tools only** (approval tests, mutation testing, OpenAPI validation). Enough to
  detect that a behaviour changed; they do not say which business rule a red touches. They
  are used where they fit: mutants and traces come from them.

## Consequences

- A green replay proves that scenarios reproduce, not that a general rule is true: a rule
  is as good as the scenarios on each side of its conditions, and mutants are the measure.
- A bug of the system is recorded as it is. A declared rule that a scenario refutes is the
  place where intent and behaviour part; deciding which is wrong is a human's.
- A reference depends on the day it was taken as soon as the target has a clock: the
  target's clock is held, and is part of what an execution records.
- Data generation applies to an operation's inputs only. A situation is reached by calls.
