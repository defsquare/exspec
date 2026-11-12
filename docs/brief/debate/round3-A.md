# Round 3 — A: the generative specification

## What the defence answered

E is right that the pivot’s classification conditions do not predict outcomes, that first-match rules misfit independent update fields, and that Fineract exposes incomplete restore and observation. Those are defects of the implemented spike, not hypothetical objections. (docs/branches/spike-recorded-cases.md, Journal 10–11 and 20; dev/spike/fineract/clock.md, “Recording”)

E also answers the claim that recorded comparison is merely byte matching. Equality-class noise checks relations such as a password remaining equal before and after an update; API readings caught changes invisible in the original response. That is more useful than wildcard snapshots. It still checks relations **in the recorded scenario**, not a general requirement over other worlds. (docs/branches/spike-recorded-cases.md, Journal 6–8)

Finally, E is right that `.spec`’s `--now` replays the generator’s clock, not the target’s. Controlling the target clock is work for either approach. (docs/dsl.md, “`otherwise`,” `now`)

## What it did not answer

**Characterization does not erase the value of a general contract.** The dossier identifies the existing extraction as characterizing the target; it also describes `.spec` postconditions, generatable named states, and deterministic boundary cases. A clause can state an explicit relation and judge multiple drawn worlds. A recording judges the concrete outcomes retained for its scenario. Neither passing run proves the statement for all inputs, and either characterization can encode a bug. The distinction remains: the general statement exposes *what is being claimed*, beyond the examples used to test it. (docs/adr/README.md, ADR-0094; docs/dsl.md, “Named states,” “`ensure` phrases” and “`otherwise`”; docs/branches/spike-recorded-cases.md, “Result”)

E’s quotations about ADR-0093 and ADR-0117 go beyond the supplied ADR index; their claimed wording and the alleged fixed-case intent mechanism are **[outside the dossier]**. The index supports the ADR titles, not those quotations. (docs/adr/README.md, ADR-0093 and ADR-0117)

**Detection is not the same as stating a rule.** A held-day recording of a repayment schedule may detect a changed due date. It does not state “due one month after disbursement,” distinguish that rule from another formula producing the same date in that scenario, or judge it for a new disbursement date. Fineract’s date representations, calendar arithmetic and moving business date remain unresolved in the spike’s rule vocabulary. (dev/spike/fineract/clock.md, “What would make (b) and (c) hold” and “Can facts.edn say…”)

**Provenance does not validate the business sentence.** “Guarded” means a selected mutant turned a classed scenario red; it does not establish that the condition’s boundary is right or that the sentence is the rule actually exercised. The campaign did not move boundaries, and first-match classification left an image-update rule without a classed case despite scenarios sending that field. (docs/branches/spike-recorded-cases.md, Journal 10–11)

**Intent needs a separate authority.** Petclinic’s observed 204 responses contradict its stated 200-with-entity contract. Preserve both as evidence: an independently sourced desired assertion should be allowed to fail against the target, while a characterization says what the target currently does. A red after a bug fix then signals a changed characterization, not necessarily a violation of intent. The spike explicitly leaves that distinction unresolved; `.spec` already provides executable `ensure` clauses and explicitly unjudged statements. (docs/branches/spike-recorded-cases.md, Journal 15 and 18; docs/dsl.md, “`ensure` phrases” and “`inexpressible`”)

## Where another attacker is wrong

B’s proposed **+7-day future-date mutant** does not demonstrate that holding the clock hides the bound. Fineract’s existing “dated tomorrow” scenarios are refused at D and accepted at D+1; widening the check at D could make those same inputs acceptable and turn their recordings red. That mutant has not been run, so this is a prediction, not a measured kill. A narrower bound and cases at its precise edge must also be tested. (dev/spike/fineract/clock.md, “D + 1: every red scenario classed”; docs/branches/spike-recorded-cases.md, Journal 11)

C’s claim that the specification layer contributes nothing beyond replay overstates the evidence. Its classifications identify missing or suspect cases, and confronting declarations with observations exposed Petclinic’s contract/implementation response discrepancy. Those findings do not make its conditions an executable oracle; they do make deleting the layer a choice requiring comparison, not a demonstrated improvement. (docs/branches/spike-recorded-cases.md, Journal 9, 11 and 18)

## Your prediction

**Kept, with the protocol clarified.** On Conduit and the Fineract loan slice, freeze both implementations before an independent selection of 30 boundary and relational mutants per target. Use equal operation scope and run budgets, controlled target clocks, and independent equivalent-mutant labels. Count an `inexpressible` clause as no kill; report build cost and false reds separately. Predict that repaired `.spec` kills at least **10 percentage points more non-equivalent mutants** than recorded scenarios, without more false reds on unchanged targets. This numerical prediction is **[outside the dossier]**; the dossier establishes the unresolved boundary, clock and relational gaps it tests. (docs/branches/spike-recorded-cases.md, Journal 6, 11 and 20; docs/dsl.md, “Named states” and “`otherwise`”)

A smaller margin or more false reds withdraws the prediction. Even a successful result would not by itself settle cost-effectiveness: the dossier’s preceding Conduit extraction reached 9 of 19 operations after four benches and $52, while the recording spike reached all 19 with concrete scenarios. Repair must retain the pivot’s recordings, API readings and equality-class noise as evidence, while restoring general executable claims as the contract. (docs/branches/spike-recorded-cases.md, opening, Journal 6–8 and “Result”)
