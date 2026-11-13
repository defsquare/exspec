# Backlog

The only backlog. An item is written to be picked up cold: *Seen* (the evidence), *Settled*
(what is decided), *Next* (the first step), *Source* (where to read more). A done item is
deleted, never ticked: its commit says which item it closes. Order is the order to take
them in; each of the first five is a branch of its own.

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
  Cheaper, and with what exists: `record` plays the second stack's scenarios in reverse
  order — identifiers that drift then differ between the two executions and the scenario
  is unstable. On Petclinic the gate of the target passed although the agent had not
  confirmed that a reset gives the same identifiers back.
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

## Conditions that say "the caller's" and "already taken"

- **Seen.** Six facts of ten on Conduit and four of eleven on Petclinic are written with an
  empty condition: the caller wrote the article, the caller is an owner administrator, the
  email is not used by another user, some owner matches the search. The terms have no
  value for the caller (a `where` or a `must-be` that names who is calling) and no way to
  say that no instance has a value. The agent's instructions even show such a fact with
  an empty condition.
- **Settled.** A fact is evaluated for an actor (ADR-0007); a fact with no condition is
  unknown, and makes ambiguous the rules of its operation that answer the same status
  (ADR-0008).
- **Next.** An ADR for two terms, each with the scenario of each target that needs it: the
  caller as a value (what of the caller — the actor's name is not its username), and
  absence over a list a projection shows. Then extract both targets again and count the
  facts left empty.
- **Source.** `targets/*/specimen/facts.yaml` of the two extractions;
  `docs/branches/feat-extract.md` at `c1c9ef0`.

## Effects in terms: something appears, something goes

- **Seen.** Every effect of both extractions is a sentence (`then: {says: …}`): the terms
  say a fact becoming true and a field moving by a number, and what these targets do is
  create and delete. A rule whose effect is a sentence is never judged.
- **Settled.** An effect written as a sentence stays declared only (ADR-0008).
- **Next.** Terms for an instance that appears (shown by a projection after, absent
  before) and one that goes; a field that takes the value of an input. With the scenario
  that needs each, one target at a time.
- **Source.** `docs/brief/fit-conduit.md`, `docs/brief/fit-petclinic.md` (a `:then` for
  each effect); `docs/branches/feat-extract.md` at `c1c9ef0`.

## What the agent could not explain has a place, and comes back to a human

- **Seen.** On both targets the agent reported real contradictions and bent nothing: 401
  where the code raises 404 and 403 (Conduit); 500 for a wrong role, 200 in the contract
  where the code answers 201 and 204, a cascade that fails (Petclinic). They are told in
  its last message of each phase, which lives on the event stream alone. One was written
  as contract instead: a server error declared as a refusal's status (`role-missing: 500`).
- **Settled.** A declaration the target contradicts is left as the code says and decided
  by a human (ADR-0001, ADR-0006).
- **Next.** Decide where a contradiction is declared (beside the claim it contradicts, with
  the line of code read) and how the decision on it — the claim was wrong, or the target
  has a bug — is recorded and named. A refuted verdict is the same thing seen from the
  other side: one place for both.
- **Source.** `targets/*-extract.jsonl` (`agent-said`); the backlog's open
  question on a refuted claim; `docs/branches/feat-extract.md` at `c1c9ef0`.

## Loose ends of `extract`

- **Seen.** The gate of the target catches any error, a bug of specimen's included, and
  hands it to the agent as a finding. In the scenarios phase a `stop` that fails hides the
  session's error. `bun run build` does not produce a working binary (an optional
  dependency of Ink), so the compiled path of the command line given to the agent is
  untested. The examples of the agent's instructions parse one by one and do not make one
  consistent extraction: copied literally, the tool flags them.
- **Settled.** The instructions' examples are parsed by a test.
- **Next.** Each is small and independent: let through what is not a failure of the
  target's own commands; keep the first error; make the build work or drop the script;
  make the examples one extraction the checks pass.
- **Source.** `docs/branches/feat-extract.md` at `c1c9ef0`.

## A form the tool can compute: a pattern, not a name

- **Seen.** On Petclinic the agent wrote `format: person-name`, `digits-only`,
  `not-in-the-future-and-at-most-50-years-ago`: names of its own, where the code holds a
  regular expression or a date rule. Only `email` is computed; any other format is not,
  and makes ambiguous the sibling rules that answer the same status — 22 rules there, and
  13 more unjudged on their own format.
- **Settled.** The form of a value is said once, on the field; a form that is not computed
  is never taken as respected (ADR-0008).
- **Next.** A `pattern` (the regular expression the code holds) beside `format`, computed;
  say in the agent's instructions that a format is a pattern when the code has one. A date
  rule relative to today waits for the clock.
- **Source.** `targets/petclinic/specimen/structures.yaml`;
  `docs/branches/feat-verdicts.md` at `591b23f`.

## Loose ends of the verdicts

- **Seen.** `play` judges a copy without knowing its noise: a date in a reading refutes
  `nothing-changes` during the agent's scenarios phase, until a reference exists. A
  reading keeps the answer and not the request made: a fact whose `where` is rewritten, or
  whose terms are reordered, is judged on the answer of another instance with no sign —
  ADR-0007 says to record again, nothing checks it. `binding-judged` carries the refusal's
  name inside a text. `fact-blocks` gives the reason of the first reference only, and does
  not name a fact unknown only in an effect's `then`. Petclinic's references predate the
  readings: 17 of its rules wait for a new recording.
- **Settled.** A reading is kept whole and the truth derived (ADR-0007); a claim that is
  not verified is shown with its reason (ADR-0008).
- **Next.** Each is small: `play` reuses the reference's noise when one exists; a reading
  keeps what was asked, and a reference whose readings no longer match what would be asked
  is stale; `{refusal, declared, observed}` as fields; then record Petclinic again.
- **Source.** `docs/branches/feat-verdicts.md` at `591b23f`.

## What the seed created has a name a scenario can use

- **Seen.** On Kadai (third target, 93 interfaces, 18 operations, 99 rules, 94 scenarios)
  the seed creates its tasks, workbaskets and classifications through the API and the
  target draws their ids at random. 67 scenarios of 94 hold such an id as a literal, read
  by the agent on the stack it had up: on the two fresh stacks of `record` the instance
  is unknown, and 12 of the 16 accepted paths are recorded as a 404 or a 400. The
  references are stable, so nothing is red; `status` shows them as
  `not-exercised: refused`. Conduit and Petclinic have ids one can predict (a slug, a
  serial number) and never met it.
- **Settled.** A scenario is written with holes and an execution fills them; the seed is a
  command of the target and writes the credentials file (ADR-0004).
- **Next.** An ADR, through the challenger: a way for a scenario to name what the seed
  created — the seed writing its ids beside the credentials, a scenario citing one by
  name — against the alternative of arranging the instance in the scenario and using the
  value an earlier call answered. Then the gate below, then extract Kadai again.
- **Source.** `specimen/` of the Kadai extraction (copied flat under `targets/kadai/`);
  `scenarios/claim-task/accepted.yaml` and its reference.

## A scenario that proves an effect and is refused fails the gate

- **Seen.** The gate of the `scenarios` phase asks that every scenario plays, not that it
  is answered as its rule needs: on Kadai twelve scenarios said to prove an effect were
  refused and the phase passed. A session of the agent that ends on an error of the API
  (a 403 at the start of a phase) fails the phase at once, where a failed gate is given
  three more rounds. The terminal renderer prints the whole history again at every event
  once the output is taller than the window.
- **Settled.** A gate is a check the tool runs and whose findings go back to the same
  session (ADR-0006).
- **Next.** In the gate, a scenario whose proved rule is an effect and whose judged call
  is refused is a finding; useless before a scenario can name a seeded instance. Retry a
  session that ended on an API error. Render past events once (Ink's `Static`).
- **Source.** The run on Kadai of 2026-11-13; `src/agent/extract.ts`,
  `src/cli/render-terminal.tsx`.

## Open questions, no item yet

- A fact the interfaces do not show ("the email is not registered yet").
- A constraint between two inputs ("the end is after the start").
- The decision on a refuted claim — the claim was wrong, or the target has a bug — and how
  a wanted deviation is named.
