# Recorded cases — framing a rebuild from zero

Written 2026-11-12, at the end of `spike/recorded-cases`. It assumes the pivot is adopted
and rebuilt in another repository; the adoption itself is not decided here. The evidence
is the branch's working file (`docs/branches/spike-recorded-cases.md`, Journal 1–21), the
three targets under `dev/spike/` and the debate under `docs/debate-recorded-cases/`.

## What the rebuild may claim

| claim | standing |
|---|---|
| A scenario recorded on the old system is reproduced, or the difference is shown | holds on three targets; on a target with a clock, only on the day of the recording |
| A recording says what a generated world could not predict (a hash, a slug, a page, a count) | holds |
| A rule's condition classes the scenarios that exercise it | holds as a classing, not as a proof: a wrong condition misclasses and nothing turns red |
| A rule is checked | not established: one mutant per rule, written from the rules themselves, none moving a bound |
| The rules are complete | not measured |
| The system does what it should | out of reach by construction: a bug is recorded green |

The promise to write on the new repository's first page is the first two lines. The
others are named as what the specification layer works towards, each with its provenance.

## Kept

- **Observe, then specify.** A scenario is what was observed; operations, rules, facts,
  structures and fields are specification hung on it, derived from the observation with
  as little inference as possible.
- **Only what the API exposes is compared.** The database detects that something
  changed and triggers the readings; it is never the reference.
- **Two recordings on two fresh stacks**; noise as equality classes inside a scenario;
  a scrubber list for what two recordings do not show.
- **The interfaces stated once**, from the target's contract, each a trigger, a
  projection, or neither.
- **A prepared call's response is kept**, observed and not judged.
- **The metamodel** (`metamodel.edn`, 14 concepts) in four groups — the proof by
  simulation, the specification, the bindings, the target — and four provenances for
  every claim: derived, declared then verified, declared only, refuted. Its data shapes,
  one instance each: `shapes.draft.edn`.
- **A field's type is a claim confronted with observed values**, shown with examples; the
  answer of a writing operation may show a structure.
- **A rule cites named facts**; a fact may be about the caller.
- **Mutants, not line coverage**, as the measure of a rule — and the loop that hands a
  survivor to the agent.
- **A page generated from the data files** to inspect a target.

## Dropped

- Building a world from predicates, predicting an answer, `ensure`: the generator, the
  construction and the oracle of the previous approach.
- The row-level difference as the thing compared.
- Noise as a wildcard per leaf (3 mutants of 8 survived it).
- Line coverage as a class of scenarios or as a sign that a rule is judged.
- A structure with no projection (a favourite, a follow: these are facts).
- Dates written relative to today (37 scenarios of 52 red on echoed dates).
- The word "guarded" as the spike gives it.
- The spike's code: `dev/spike/*.clj` was a probe, read by one thread and never reviewed.

## Settled with the user, 2026-11-12

Going through the debate's ten points. None of it is built in the spike.

- **A rule is written whole, and the scenarios are derived from it.** Start from the
  accepted case with its complete condition ("deleting is permitted to a signed-in caller,
  on an article that exists, of which they are the author"). Each condition denied alone
  gives one refusal scenario; each bound gives two, one on each side. The scenarios are
  recorded, never predicted. A condition with no scenario denying it is named missing:
  that is the measure of completeness, for what the rule states.
- **Two kinds of rules.** Outcome: which answer; a scenario exercises one. Effect: what a
  field becomes when the call is accepted ("the slug is derived from the title"); a
  scenario exercises every one whose condition holds. Which refusal wins when two
  conditions are denied is observed, not encoded in an order.
- **A rule is still written where its answer cannot be predicted.** It is a claim
  confronted with the recordings, not their source. Where a formula can be written, it
  may be checked on drawn values against the live target; where it cannot, the rule stays
  declared only and blocks nothing.
- **What "a rule is checked" means.** The two scenarios on each side of a condition
  differ by a branch of the code's trace; a mutant of that branch must turn them red.
  The trace and the mutants come from existing tools (JaCoCo, PIT on a JVM target) and
  belong to the target: they validate the extraction, are never extracted and never
  compared. What they do not see: a constraint held by the database, a condition the
  rule forgot — the branches no scenario reaches and the surviving mutants show the
  latter.
- **Three groups in the metamodel.** The target (target, starting state, run, interfaces,
  observables, the trace among them), the specification (operations, rules, facts,
  structures, fields), the proof by simulation (scenarios, calls, side effects,
  observations, reference, report). Open: a trigger and a projection are part of the
  contract and may belong to the specification.
- **A run** is what is kept of one execution of the target — a log, not a judgement: the
  target's version, its start parameters (the clock it is set to among them), the seed
  applied, when. The target is what is started; the run records it.
- **Recording creates the reference**: the scenario is run twice, in two runs; one
  observation is kept, and what differs between the two is its noise. A reference is
  replayed on a target started with the parameters of those runs — that is where the
  day it holds on is stated.
- **An operation establishes facts**, derived by evaluating the facts before and after the
  judged call. With the facts a rule requires, the transitions follow and no state
  machine is written; an operation never tried in a situation is a scenario to write.
  Invariants are to be expressed and always applied to what is observed, in a sequence
  or not; they may be facts that hold in every observation — open.
- **Intent has a place: a declared claim.** A refuted one is a gap between intent and
  behaviour (Petclinic's contract answers 200 with the entity on an update, its code
  204). To build: the decision on that gap — the claim was wrong, or the target has a bug
  and the new system deviates from the recording there, a deviation that is named.
- **What the metamodel adds is meaning, not proof.** The proof is the replay and the
  mutants; the specification says which rule a red touches and what is missing.

## The shapes, redrawn by instances and tested for fit

After the ten points, the user redrew the data one instance at a time (`shapes.draft.edn`,
its comments in French; the metamodel's page). Where this section and the one above
disagree, this one holds: it is later.

- **The specification is declared whole, with no hole.** An operation says what it takes,
  what must hold, what its accepted answer shows and what it changes. A rule is a condition
  and its consequence, named so that a scenario can point at it, in three places: on an
  input, a requirement, an effect. A refusal is a required fact denied, named in business
  terms; the negation has no name of its own. Effects are independent: no "otherwise" rule.
- **The form of a value belongs to the field of the structure**, said once: format, length,
  bounds. It is checked twice — a value that violates it is refused as an input, and every
  value a projection shows respects it. A field may be never shown (a password). A
  condition on what a call sends is therefore no fact. This is where data generation
  applies, and only here: a valid value, and the values on each side of a bound. Reaching
  a situation where a fact holds stays a matter of arranged calls.
- **A scenario is written with holes and an execution fills them.** It names the rules it
  tries to prove (`:proves`, declared, no longer derived by a classing) and what it looks
  at before and after the judged call (`:assert`: a fact, or a shown field). One shape,
  three states: planned, played, reference.
- **The bindings are the only shapes that know both sides**: a projection says which
  structures an interface claims to show, a trigger which operation an interface triggers,
  where each input travels and how each refusal is translated, a detector which structure
  or fact a change at a place of an observable concerns. A structure does not know its
  projections; an operation knows no route, no status. They are what a rewrite with
  another API replaces.
- **An interface has a schema**, from the OpenAPI or from the code: the shape on the wire,
  which is not the structure.
- **Nothing derivable is stored**: the verdict of a rule, of a binding, of a replay; the
  provenance of a rule or a field. A played copy holds what was seen.
- **No longer shapes of their own**: the run (a map in a played scenario: target, version,
  when, the clock it was started with), the observation and the reference (states of a
  scenario), the report (derived), the readings (the before and after of `:assert`), the
  starting state (the target's seed, and what `:assert` found before), the actors (keys
  of the target's credentials).
- **Two kinds of gap**, seen on Conduit: an unknown article answers 401 where 404 was
  declared — the business rule is verified, the binding refuted. Either the system does
  not do what the rule says, or it does and says it otherwise.

**The fit, on the spike's files** (`<target>/shapes/fit.md`; Journal 22), measured before
the inputs were given their place: every requirement verifies (30 of 30 on each target);
78 of 167 scenarios of Conduit and 111 of 183 of Petclinic fit as they were. What the
user judged adjustments inside this metamodel, to write and not to redesign: `:assert` on
a list (membership, count, order), on an instance that appears or vanishes, on a field of
a list's element; a `:then` for each effect, where the spike holds a sentence; an accepted
answer with no body; an actor a prepared call creates, a value taken from an earlier
answer, a raw token; a fact that counts; a noise with no equality; an optional key in an
interface's schema. Left as questions: a fact evaluated for another actor than the
caller; who chooses what `:assert` looks at; a fact the API does not show; distinct
refusals that answer one status, which is the norm on both targets (401, 404). Not done:
the fit measured again with the inputs in place; anything run against a target.

## To settle before the first line

Five decisions, the challenger's list. The first column of "proposed" is a recommendation,
not a ruling; the third and fourth are answered in part by the section above.

| decision | why it comes first | proposed |
|---|---|---|
| **The classing's evidence** | the readings a condition is evaluated on come from a third, live run; they are not in the reference | the readings are recorded with the scenario, in the same run, and the classing is computed from the reference alone |
| **Time** | 20 scenarios of 49 turn red one business day later; 15 rules of Fineract cannot be written | ruled by the user: the day is part of the starting world and the harness holds the target's clock; a scenario may move it as a prepared step. To design with it: a `today` term, a date type, calendar arithmetic; a target that offers no clock to hold |
| **One condition language** | `rules.edn` is a second predicate language next to the `.spec` grammar; first-match misfits fields that are not alternatives | decide once: its terms (dates, counts, quantifiers, an absent body — the conditions listed inexpressible on the three targets are the requirements), and rules per independent field rather than first-match |
| **What "a rule is checked" means** | one mutant per rule from the same file proves little | a mutant source independent of the rules, mutants that move bounds, a measure of completeness, and a name for each level reached |
| **The world's boundary** | an id pool in the JVM survives the restore; 280 tables cost 16 min a pass, 6 watched tables miss a write elsewhere; identities that are no sequence are untested | what the starting world holds besides the database, how a write outside the watched tables is detected, one reference per scenario |

## Experiments left, cheapest first

1. **Bound mutants.** Thirty mutants that move a bound, chosen blind, on Conduit and
   Petclinic, against the scenarios as they are. It is the number both the challenger and
   the debate ask for, and the starting figure for experiment 2.
2. **Scenarios derived from the whole rule.** One refusal per condition denied, two
   scenarios per bound, recorded; experiment 1 again, and the difference of traces
   between the two sides of a condition — does it name one branch?
3. **Fineract with the clock held.** A bound widened, a bound tightened, a due date at
   two months for one; and mutants, which Fineract never ran.
4. **A fourth target whose identities are UUIDs.** Predicted to break the readings;
   inferred from the code, not run.
5. **Recorded cases against a repaired generative spec**, both frozen on one perimeter,
   judged on the mutants of experiment 1. Only if the choice between the two approaches
   is still open after 1 and 2.

## Known and left open

- Two fact names are not honest ("the caller can read the article", "the email given is
  the caller's"); a fact that counts a list has no field to be about.
- The metamodel has no "detects a change of a fact".
- Three references by identity stay declared only: the values come from the seed.
- Petclinic's contract answers 200 with the entity on an update; the code answers 204.
- Asynchronous writes, an audit table, a cache: not met on any target.
- Intent: where a statement of what the system should do lives, and how it is told apart
  from what was recorded.
