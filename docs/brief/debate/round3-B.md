# Round 3 — B: a model, checked

## What the defence answered

E conceded the load-bearing claim: a `Rule` is not a transition, a wrong condition cannot go red, and nothing refutes a guard on a state never recorded (E, “What holds”; `docs/branches/spike-recorded-cases.md`, Journal 10; `dev/spike/metamodel.edn`, concept `Rule`). Three corrections stand.

“Byte-level mismatch” was too crude. Journal 6 records noise as equality classes, so “the password after equals the password before” is checked. Journals 7–8 judge the response and the readings, not the rows, and move kills from 17 to 22 of 24 (Journal 8 table). The comparison is richer than a dump diff. It is still a comparison with a stored observation (`dev/spike/metamodel.edn`, path “replay”).

Of the five `:inexpressible` rules, two need a computed value; three need a walk over a list (`docs/branches/spike-recorded-cases.md`, Journal 10, “The five left”). I over-attributed all five. Journal 10 then says a quantifier would write the three, “and the vocabulary would then be a query language.” That refusal is the refusal of a semantics.

The +7-day prediction is wrong, and E’s deduction needs no run. `dev/spike/fineract/clock.md`, “D + 1”, class (c): eight “tomorrow” scenarios are refused at D (400/403) and accepted when the business date moves. “Remedy 2 tried” shows the scenarios store absolute `2026-11-dd` dates. At D those dates are one day ahead. A check widened to “not after today + 7” accepts them; the reference expects 400/403. “Branches flip only when the clock moves” (`clock.md`, “Replays”) describes the unmutated target, not a bound moved across a date already sent.

Detection without statement also holds. `clock.md`, “Masked leaves by kind”: business dates masked = 0, amounts masked = 0. A mutant that rewrites due dates changes leaves the verdict reads (`dueDate` / `fromDate` in “Remedy 2 tried”). I concede a red at D. I do not concede that the red is a failed invariant.

## What it did not answer

A wrong condition stays green. Journal 10: “A wrong condition does not make a false red (the recording judges, not the rule): it misclasses a case.” A status mismatch on a stored scenario is not a refuted rule. Delete the eight “tomorrow” scenarios, re-record, and the widened check is green. `dev/spike/metamodel.edn`, path “specified”: claims are “declared from the code or derived from the observation.” No concept is a required post-state.

Journal 5: 23 of 167 carry a “not found” or “forbidden” sentence and are one recording — 401, no body, no effect — and “Nothing checks a `:rule`’s text.” A rewrite that swaps two of those rules is green (Journal 2). Equality-class noise does not separate them.

E concedes `PUT /user › image` has no case because a sibling field wins (Journal 11). The model still says the first condition that holds applies (`dev/spike/metamodel.edn`, `Rule`; `dev/spike/conduit/rules.README.md`, opening). Overlapping field constraints are not alternatives. No transition relation is offered in which both are obligations.

Backlog item 12 holds the clock on the recorded day. `clock.md`, remedy 1: a branch that crosses today is then “checked on one side only, forever.” The pairs E names (`repay today` / `repay dated tomorrow`, class (b) and class (c)) check two sent dates, not a relation. Remedy 4: “Nov 5 + 1 month and Dec 5 + 1 month are 30 and 31 days.” No `[:today]`, no date term, no calendar arithmetic (`clock.md`, “Can facts.edn say…”). `StartingWorldState` is “database rows” and “twin state” (`dev/spike/metamodel.edn`). A target that has always computed due = disbursed + 2 months records +2 months and stays green. E’s detection argument cannot see that case: there is no diff against the reference.

Journal 15: the observation “says what the system does (Petclinic’s bugs are recorded as rules), and has no place yet for what it should do.” Those bugs include an add that overwrites a row with 201, a path owner ignored, and a password replaced (Journal 14). E answers with decision text from ADR-0093, ADR-0094 and ADR-0117. Those files are not in the dossier; the index gives titles only (`docs/adr/README.md`). The quotation is not granted. The dossier shows “what a software must do” (`README.md`, opening) beside a specified layer hung on observation (`dev/spike/metamodel.edn`, paths “observed” and “specified”). E did not place a demanded transition anywhere the recording cannot reach.

The seven unguarded rules (Journal 11) are equivalent mutants of one 401. The API shows nothing; that is conceded. A model can still write “anonymous ⇒ rejected as anonymous” and mark it uncheckable. The pivot writes seven sentences nothing ties to the recording (Journal 5).

## Where another attacker is wrong

A treats `ensure` as an independent requirement. The index does not support that independence: ADR-0103 is “A red rewrites the spec”; ADR-0094 is “An extraction characterizes the target” (`docs/adr/README.md`). `docs/dsl.md`, “The HTTP surface”: a `::` note “states a fact … and never an advice.” Named states remain the right checker — generatable (`docs/dsl.md`, “Named states”; ADR-0030), edges on every run (ADR-0058) — only if the postcondition is not rewritten to the target’s answer. A understates that slide.

C is wrong that a non-judging layer justifies deleting the model. No PIT run exists; C’s “kill score” is not in the Result table (`docs/branches/spike-recorded-cases.md`, “Next”, “Result”). Of 17 refuted Fineract claims, 15 are a date or an amount; the other two are the instalment’s identity and `Loan.transactions` (`clock.md`, “The spec layer”). “From 15” operators is not stated (`dev/spike/conduit/rules.README.md`, “Terms”). Journal 18 is the layer working: Petclinic’s contract says 200 and the entity; the recording says 204 and no body, 12 operations. OpenAPI held that claim and did not judge the transition. Dropping `rules.edn` removes “this rule has no scenario” (Journal 9; Journal 11, nine with no scenario). JaCoCo did not list them: “No line of a service, a DTO, a controller or a validator is unreached” (Journal 3). Coverage and mutants do not state “submittedOn > today ⇒ rejected” as an obligation on states not yet recorded.

## Your prediction

Withdrawn. The +7-day mutant at D does not leave all 52 green. `clock.md` class (c) already records eight refusals of a date one day after D. I treated “clock held” as “bound untested.” It is untested only past the dates the scenarios send.

Revised, clock held at D, the existing 52, no new cases:

1. Widen “not after today” to “not after today + 7 days” on submit, approve, disburse and repay. At least the eight class-(c) scenarios go red on status. Fewer than eight refutes this.
2. Change only the schedule from disbursement + 1 month to + 2 months. At least one scenario whose reading includes `dueDate` or `fromDate` goes red (0 business dates masked). All green refutes the concession above.

Neither red is a judged rule. Re-record after deleting the eight, and (1) is green. Record a target that has always used +2 months, and (2) is green. A machine with time in the state, transition “date > today ⇒ rejected”, and invariant “due = disbursed + 1 month”, drawing both sides of the bound (`docs/dsl.md`, `now`; ADR-0058), fails both without a prior recording of the bug. Until the pivot has that failure mode, it is a regression mirror with labels (Journal 5; “Result”: “not yet as a proof that the rules are exercised”).
