# Round 2 — E: defence

I defend the pivot: a deterministic oracle built from recorded scenarios, judged through the API, with a specification layer whose claims each carry a provenance. Where the dossier proves the attacks right I concede it. Each attack makes a prediction, and for each I name the measurement that would settle it.

## Against A — "repair the generative specification"

**What holds.**
- A recording is one world. The rule layer classifies and predicts nothing. `rules.README.md` says so in its opening paragraph: "It never builds a world and predicts nothing".
- No mutant has moved a bound. Journal 11: "every mutant removes or inverts a check, none moves a bound".
- The world is controlled only partly. On Fineract, an id pool held in the JVM survives the restore. Only 6 of 280 tables are watched, and "nothing checks" a write that leaks outside them (`dev/spike/fineract/clock.md`, "Recording").
- First-match classification misfits an update whose fields are not alternatives (`PUT /user › image`, Journal 11).

I concede all four.

**What does not hold.** A's argument rests on one contrast: the `.spec` states an independent postcondition, the recording only reproduces what the target did. specy gave up that independence before the pivot. ADR-0093 made the target the truth of an extraction: "a clause no case held on is the spec's to rewrite". ADR-0094 is titled "An extraction characterizes the target". Its first decision reads "The spec says what the target does, and the run proves it", and its example rewrites `invalid body -> 400` into `-> 500` because the target answers 500 (`docs/adr/0094-an-extraction-characterizes-the-target.md`). The `ensure` clauses A cites as normative were therefore written to match the target and rewritten when the target disagreed. So A is not choosing between a requirement and a recording. It is choosing between two characterizations: one whose examples are built from predicates, one whose examples are recorded. On Conduit the first proved 9 of 19 operations after four benches and $52 (`docs/branches/spike-recorded-cases.md`, opening). The second gave 167 cases over 19 of 19 operations from one agent session of 13 min 42 s (Journal 2, Journal 4).

A says intent must be "an independently stated postcondition". In the approach being left, intent was not a postcondition. ADR-0117 decision 4 says "a demanded rule is a fixed case with a business source": one concrete example, judged against the business's assertion. That is the shape of a scenario, not of an `ensure`.

On the clock, A grants the decisive fact itself: the `.spec`'s `now` "replays the draw, **not the target's clock**" (`docs/dsl.md`, "`now`"). The clock therefore separates neither approach from the other. No `.spec` was ever run against Fineract, so the clock result has no control arm.

**Measurement.** A's prediction is the right experiment: equal scope, 30 blind boundary and relational mutants, a held clock, a +10-point margin. I accept it with three conditions, or the result would be fitted:
- "Repaired" is frozen, as grammar and generator commits, before the mutants are drawn.
- A clause left `inexpressible` counts as not killed.
- The cost of building each arm is reported next to its kill rate.

The precedent for the last condition is the four benches: 33 commits to the grammar and generator for 9 of 19 operations. A +10-point gain in kills that costs four times as much to build is not the result A claims it is.

## Against B — "a model, checked"

**What holds.**
- A `Rule` is not a transition. A wrong condition cannot go red. It misclasses a case (Journal 10: "the recording judges, not the rule").
- 23 of the 167 Conduit recordings carry a "not found" or "forbidden" rule and are all recorded alike: 401, no body, no effect (Journal 5).
- The 7 unguarded rules are equivalent mutants (Journal 11).
- There is no `[:today]` term, no date type and no calendar arithmetic, and "the model has no 'the target's clock'" (`clock.md`, "What the shapes and the metamodel could not carry").
- The pivot has no place where a wrong guard is refuted by a state that was never recorded.

I concede that the specification layer as built is a classifier hung on evidence, not a model.

**What does not hold.**

1. *"The only red is a byte-level mismatch with yesterday's target."* That is false. Noise is recorded as equality classes inside a case: "the password after equals the password before" is a relation the replay checks (Journal 6). The verdict reads the response and readings played through the API, not bytes or rows (Journals 7 and 8). Those two changes raised kills from 17 to 22 of 24 (Journal 8 table). B's word "mirror" undersells what is compared.

2. *"Date rules are checked on one side, forever."* The sentence in `clock.md` remedy 1 is about one scenario whose date crosses today when the clock moves. A bound is checked by a pair of scenarios on either side of it, on the held day. Fineract's scenarios include such pairs:
   - `repay today` / `repay dated tomorrow`
   - `disburse a loan today, later than expected` / `disburse a loan dated tomorrow`
   - `create a client activated today` / `create a client activated tomorrow`

   (`dev/spike/fineract/scenarios.edn`, lines 13–168.) At D the reference holds each "tomorrow" refused (400 or 403, `clock.md`, "D + 1", class (c)).

3. *B's own prediction.* B widens the future-date check to "not after today + 7 days" and predicts 0 of 52 red at D. I predict the opposite, though I have not run it. Under that mutant, the "dated tomorrow" scenarios of submit, approve, disburse and repay send a date one day ahead. The reference refuses them, the mutant accepts them, so the status goes 403 → 200 at D without moving the clock. A real gap remains on the other side: submit and approve have no "today" scenario. A bound narrowed to refuse today could escape on those two operations. That is a missing case, of the same kind as M5, C5 and C7, which the survivor loop closed or names (Journal 4, Journal 6).

4. *"due = disbursed + 1 month" cannot be said.* That is true. But B treats stating a relation and detecting a change to it as the same thing. A mutant that makes the due date "+ 2 months" changes the recorded `dueDate` of every schedule reading at D. The `dueDate` is not masked: `clock.md` counts 0 masked business dates and 0 masked amounts, and every scenario that reads a schedule turns red. The pivot detects that mutant and cannot say the sentence the mutant breaks. That is a real limit, of statement, not of detection.

5. *"A reference becomes wrong when the target is fixed."* That is the definition of a characterization oracle, and ADR-0094 adopted it for the `.spec` too. A fix is a decided departure; the old `.spec` recorded it as a `::` note on the clause. B's transition system would face the same choice: if it is written from the code, it encodes the bug, as B itself concedes ("a hand-written machine can encode the same mistake as the code").

**Measurement.** Run B's prediction as stated: the clock held at D, the +7-day mutant, the 52 scenarios. If 0 are red, I am wrong and "one side forever" stands. Run its inward twin as well, the bound narrowed to refuse today, on submit and approve. My prediction there is that it survives, and that survival names the missing cases.

## Against C — "existing tools, no new metamodel"

**What holds.**
- The rule layer adds nothing to the verdict (Journal 10).
- The vocabulary grows like the `.spec` did: five operators added, and 5 rules still inexpressible on Conduit, 9 on Petclinic, 15 of 48 on Fineract (Journals 10, 14, 20).
- `structures.edn` has no date or decimal type: 17 claims are refuted on Fineract, 15 of them a date or an amount (`clock.md`, "The spec layer").
- A legitimate change produces a 3,600-line re-record diff with no unit of review below the case (Journal 5).
- Recording against a seeded database is golden-master testing.
- Scale, unordered lists and state outside the database are real costs.

I concede all of these.

**What does not hold.**

1. *Prediction 2, "deleting `rules.edn` … reduces the PIT kill score by 0.0 points."* No PIT run exists. The dossier lists "PIT's operators on the services" under *Next* (`docs/branches/spike-recorded-cases.md`, line 709). Every mutant measured was hand-picked or written one per rule. The prediction also holds by construction for any layer that does not judge, so it cannot decide whether the layer is worth having. The pivot does not claim the layer judges. `metamodel.edn` (path "supported") says a rule is "guarded when a mutant of the target turns its scenarios red". The rule is the unit of the measure, not its oracle.

2. *"Catches zero bugs beyond raw replay."* The layer found two things replay and coverage did not:
   - JaCoCo reported "no line of a service, a DTO, a controller or a validator … unreached" (Journal 3). The rule layer still listed four rules with no scenario: `feed-articles · not-a-number`, `bad-page`, `get-article · author-followed`, `update-user · image` (`dev/spike/conduit/rules.md`, section 2). That is half of C's own "change my mind" test 2, met on Conduit, though with operators added and without PIT.
   - Declared claims confronted with observation found that Petclinic's contract promises 200 and the entity on 12 update operations, while the target answers 204 with no body (Journal 18). That finding is the specification layer working: a declared claim the observation refutes.

3. *"Delegate to off-the-shelf tools."* C names two mechanisms that go beyond those tools: API read-backs triggered by row diffs, and noise as equality classes. Those two carried detection from 17 to 22 of 24 (Journals 6–8). C's rebuild keeps neither of them explicitly. And per-rule guarding needs some list of rules, which is exactly what C proposes to delete.

**Measurement.** C's "change my mind" test 2 is the decisive one. On Fineract, run PIT on the services and JaCoCo per scenario, and count the rules `classify` lists with no scenario that neither tool flags. One condition: freeze the vocabulary before the count, as C asks. C's operator-count prediction is fair, and I expect it to come true for dates. I discuss that below.

## What the attacks, taken together, miss

1. **Both approaches are characterizations.** A and B argue as if specy is leaving a normative contract for a mirror. specy's ADRs (0093, 0094) had already made the extracted `.spec` a description of what the target does. ADR-0117 had already put business intent in a concrete example with a business source. What the pivot changes is where the examples come from: they are recorded instead of constructed from predicates. The frictions it removes are named in the dossier: building a world from a predicate, and predicting an answer the target computes (the hash, the slug, the page). Each of those became a green case that kills its mutant (Result, criterion 2). No attack disputes that number.

2. **Detection and statement are separate claims, and the attacks merge them.** The verdict comes from the response and the readings. The specification layer is a set of claims, each marked derived, declared then verified, refuted, or declared only (`metamodel.edn`, paths "specified" and "supported"). All three attacks show that the layer does not judge. The pivot never said it does. What the layer must be judged on is whether its provenance is honest:
   - fields: Conduit 52 verified · 6 declared only · 0 refuted; Fineract 17 refuted, every one named (Journal 18; `clock.md`);
   - rules: 79 guarded · 7 unguarded · 9 with no scenario, each named (Journal 11).

   B's real objection is the honest one: the layer cannot refute a wrong guard. That is a limit of what the layer states, and the spike printed it before B did ("not yet as a proof that the rules are exercised", Result).

3. **Fineract is a single test with no comparison.** The clock result bounds a reference to its recorded day under a held clock: 48–49 of 52 green the same day, 20 red at D+1, 32 at D+35. That bounds the claim "a reference holds on another day", and only that. Backlog item 12 does not make that claim. It decides that a reference names its day and is replayed with the clock held on it. On that day both sides of a date bound are met by the scenarios' dates. The `.spec` would have needed control of the target's clock just as much (`docs/dsl.md`, "`now`"), and it was never run against Fineract. What Fineract actually shows against the pivot:
   - the specification layer has no date type;
   - nothing checks the 6-table watch list;
   - an id pool held in the JVM survives the restore.

   Those are costs in vocabulary and in the harness, which C counts correctly.

4. **On a rebuild, the attacks largely agree with the pivot.** A keeps recorded scenarios, API readings, equality-class noise, provenance and the mutant-guided gaps. C keeps recordings, restore and agent-written scenarios. B keeps the trace-then-mutate loop and grants that "a recording does not need" a second implementation. What all three would drop:
   - first-match as the only shape of a rule (A, B, C);
   - promoting a recording automatically into a requirement (A, C);
   - assuming a database restore restores the whole world (A, C).

   The dossier already lists each of these as an open defect (Journal 11, Journal 15, `clock.md`). What must be settled first, on which all three agree: the clock as part of the starting world, and where a demanded rule lives next to the observation. The second is ADR-0117's question again, carried over, not a new one.

5. **The evidence is thin on both sides.** It covers three targets, hand-picked mutants, one writing agent per target, and no blind sample. That weakness cuts both ways. A, B and C each predict from the same 24 mutants and three targets the pivot stands on. The three proposed measurements decide what argument cannot:
   - A's blind boundary campaign at equal cost;
   - B's +7-day mutant at D;
   - C's PIT and JaCoCo count against `classify` on Fineract.

   Two of them can be run on the existing spike without building anything. I expect B's to come out against B, and C's to come out partly against C.
