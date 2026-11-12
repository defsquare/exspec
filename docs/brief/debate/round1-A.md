# Round 1 — A: the generative specification

## Position

**Repair the generative specification rather than replace it with recorded cases.** A general rule states what must hold beyond the examples observed; a recording states what happened in one scenario. Neither approach proves correctness merely by passing tests: generated worlds also sample a domain, and a wrong `.spec` can faithfully judge the wrong requirement. The difference is that the `.spec` makes the requirement explicit and executable. (docs/dsl.md, “Named states” and “`ensure` phrases”; docs/branches/spike-recorded-cases.md, “Result”)

## The three strongest arguments against the current direction

### 1. Recordings reproduce outcomes; they do not establish general rules

**Claim.** A scenario’s reference judges a particular response and readings, not the business sentence attached to it. The pivot’s rule conditions classify scenarios; they do not predict or assert their consequences. (dev/spike/conduit/rules.README.md, opening and “Keep in mind”)

**Evidence.** On Conduit, 25 of 167 scenarios were indistinguishable from another by both recording and coverage. The rule layer initially misclassified cases, and even after vocabulary expansion, five rules remained inexpressible. First-match classification also misfit an update whose fields were not alternatives. One-mutant-per-rule testing guarded 79 rules, but did not test whether conditions’ boundaries were right. (docs/branches/spike-recorded-cases.md, Journal 6, 10–11)

**Consequence.** A green replay cannot mean “the rule holds.” A condition can be wrong while the recording remains green, and a mutant can survive because the chosen world does not distinguish it. The `.spec` instead states conditions and postconditions together, draws cases from them, and plays deterministic edges where supported. Those runs remain tests, not exhaustive proofs, but their failures are tied to an explicit general claim. (docs/dsl.md, “Named states,” “`ensure` phrases” and “`otherwise`”)

### 2. Characterizing the target is not specifying the desired system

**Claim.** The pivot needs a separate, executable place for intent. Naming a recorded outcome “the rule” does not supply one. (dev/spike/metamodel.edn, paths “observed” and “specified”; dev/spike/conduit/rules.README.md, opening)

**Evidence.** Petclinic recordings showed an add overwriting an existing row, an ignored owner in a path, and an existing user’s password being replaced. Its published contract said some updates return 200 with an entity; the code and recordings returned 204 without a body. The spike explicitly leaves open where to put what the system *should* do. (docs/branches/spike-recorded-cases.md, Journal 14–15 and 18)

**Consequence.** Observation is valuable evidence for a human deciding whether to preserve or change behavior. It must not automatically become the normative oracle: an approved requirement should be an independently stated postcondition, with the recording linked as supporting or contradicting evidence. The existing `.spec` has such postconditions and can separately mark behavior as stated but not judged. Repair its expressiveness rather than make reference recordings the sole verdict. (docs/dsl.md, “The HTTP surface,” “`ensure` phrases” and “`inexpressible`”)

### 3. Determinism requires control of the world, not just two recordings

**Claim.** The pivot’s reproducibility is conditional on controlling clocks, state, ordering, credentials, and observation boundaries. Two recordings cannot establish those conditions. (docs/branches/spike-recorded-cases.md, Journal 1–2, 5 and 20)

**Evidence.** In Fineract, same-day replays had 48–49 green of 52, with three unstable scenarios; one business day later, 20 were red, and 35 days later, 32 were red. Eight changed branches as dates crossed today; others changed business-derived values. Relative inputs restored the eight branches at D+1 but produced 37 reds from echoed dates. An in-memory ID pool survived database restore, and restricting observation from 280 tables to six left undetected-write leakage possible. (dev/spike/fineract/clock.md, “Replays,” “Remedy 2 tried” and “The schema is too big to restore and read whole”)

**Consequence.** Holding and recording the target’s clock is a necessary first constraint, not evidence that date rules hold across time. Moving the clock within scenarios and comparing date relations are separate work. The existing `.spec`’s `now` is taken once and replayable for the *draw*, but does **not** control the target clock; repairing that gap is necessary for either direction. (docs/branches/spike-recorded-cases.md, “Backlog,” item 12; docs/dsl.md, “`otherwise`,” `now`)

## What the pivot does that your approach does not

The pivot records concrete outcomes without expressing or generating their governing formula. On Conduit it captured login with a registered password, slug calculation, paging, counts and omitted-field behavior that the preceding `.spec` work had marked inexpressible. The preceding four benches proved 9 of 19 operations after $52, with 23 inexpressible clauses; the spike produced 167 scenarios across 19 operations. These are different claims—not 167 general proofs—but the extraction friction is real. (docs/branches/spike-recorded-cases.md, opening, Journal 2 and “Result”)

The API-reading design also exposed effects without making database rows the judged contract: on the final Conduit comparison, response plus readings killed 22 of 24 selected mutants, with C1 and C7 surviving. Petclinic’s experiment nevertheless had 33 rules without a classed scenario and one mutant guarded only by rows. (docs/branches/spike-recorded-cases.md, Journal 8 and 14)

## A falsifiable prediction

On Conduit and the Fineract loan slice, rebuild both approaches to the same operation scope and scenario/run budget. Before inspecting either suite, independently select **30 rule-boundary and relational mutants per target**, including date movement, omitted fields and unchanged-state relations. Run with controlled clocks and independently label equivalent mutants.

**Prediction:** the repaired generative oracle kills at least **10 percentage points more non-equivalent mutants** than the recorded-case oracle, while producing no more false reds on unchanged targets. A result below that margin, or more false reds, disproves this prediction. The experiment tests the dossier’s unresolved boundary-mutant and clock problems rather than extrapolating from its hand-picked mutants. (docs/branches/spike-recorded-cases.md, Journal 11 and 20; dev/spike/fineract/clock.md, “Verdict”)

## What would change my mind

I would support the pivot if a blind, independent campaign shows comparable boundary-mutant detection to the repaired `.spec`, **and** demonstrates an executable, human-approved intent layer separate from observations, plus repeatable clock and non-database-state control on Fineract. A green recording alone does not satisfy those conditions. (docs/branches/spike-recorded-cases.md, Journal 11, 15 and 20)

For a rebuild, settle those semantics first. Keep recorded scenarios as evidence, API readings, equality-class noise, explicit provenance and mutant-guided gaps. Drop automatic promotion of recordings into requirements, first-match classification as the only model for overlapping rules, and database-only restore as an assumed complete world. These choices address the observed M5 gap, overlapping update rules, noisy equality, and Fineract’s surviving JVM state. (docs/branches/spike-recorded-cases.md, Journal 4, 6, 10, 15 and 20)
