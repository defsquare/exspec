# Synthesis S1

## Citation key

**Dossier:** [R] `README.md`; [L] `docs/dsl.md`; [I] ADR index; [J] recorded-cases spike journal; [K] Fineract clock report; [M] metamodel; [T] rules README.  
**Debate:** [A], [B], [C], [E] and [F] refer to the named participants.

## Agreements

- **Replay is evidence about scenarios, not proof of a universal rule.** A, B and E agree that a rule condition classes a scenario and does not predict its outcome. A wrong condition can misclassify without making replay red. Passing generated tests also does not prove a rule for every input. [A, B, E; T; J §10]
- **The comparison preserves some relations, not just literal snapshots.** A, B and C accept E’s correction: equality-class noise can check that values remain equal or differ within a scenario, and API readings detect effects absent from the immediate response. These remain relations observed in selected scenarios. [A, B, C, E; J §§6–8]
- **First-match classification is inadequate for some overlapping obligations.** A, B and E agree that an update affecting independent fields can satisfy multiple conditions, while first-match assigns it to only one; the Conduit image-update rule illustrates the problem. [A, B, E; J §11]
- **A database restore is not necessarily a world restore.** A, C and E accept Fineract’s surviving JVM ID pool and the unchecked risk of writes outside its six watched tables. [A, C, E; K, “Recording”]
- **Clock control is shared infrastructure work.** A and E agree that `.spec`’s `--now` reproduces the draw, not the target’s clock. Fineract’s recorded references also depend on the business date. [A, E; L, `now`; K, “Verdict”]
- **Coverage and selected mutants have limited evidential force.** The participants distinguish reached code from judged behavior: Conduit’s services, DTOs, controllers and validators had no unreached lines, yet an executed-line mutant survived until a distinguishing scenario was added. The per-rule campaign did not move boundaries. [A, B, C, E; J §§3–4, 11]

## Disagreements

### 1. Is replacing the generative contract justified?

- **A:** Recorded scenarios remove real extraction friction, but give up explicit postconditions tested across generated worlds and supported edges. A proposes repairing generation while retaining recordings as evidence. [A; L, “Named states,” “ensure phrases”; J, “Result”]
- **B:** The distinction is stronger: a transition model can state required behavior independently of a stored trace; the pivot’s classifier has no post-state obligation to refute. B accepts that recordings avoid reimplementing computed outputs. [B; M; J §§2, 10]
- **C:** The preceding extraction’s 9 of 19 Conduit operations, 23 inexpressible clauses and 33 grammar/generator commits justify leaving that route. C favors recorded scenarios plus existing testing tools over either custom language. [C; J, opening and “Result”]
- **E:** Both paths characterize the target; the comparison is not simply independent requirements versus a mirror. The pivot reached 19 operations with concrete scenarios, but E concedes that it does not produce general executable postconditions. [E; J §§2, 10; I, ADR-0094]

**Measurement:** A proposes two frozen implementations on equal operation scope and run budgets, tested against independently selected boundary and relational mutants, with equivalent mutants, false reds and build cost reported. A predicts a ten-point kill-rate advantage for repaired `.spec`; E accepts the experiment with explicit accounting for inexpressible clauses and cost. Neither result is in the dossier. [A, E; J §11]

### 2. Is the specification layer useful without judging outcomes?

- **A and B:** Provenance and “guarded” labels do not validate the rule sentence or its boundary. A scenario can be green while classified under the wrong sentence. [A, B; J §§10–11]
- **E:** The layer’s contribution is classification and provenance, not a verdict: it exposes missing or suspect scenarios and confronts declarations with observations. [E; J §§9–11, 15–18]
- **C:** A custom rule and structure vocabulary incurs continuing language-engineering costs; existing contract validation, coverage and mutation tools are an alternative. C accepts that classification surfaced gaps missed by line coverage. [C; J §§3, 10–11; K, “The spec layer”]

**Measurement:** C proposes equal-budget scenario-expansion loops: one guided by coverage, mutation survivors and contract validation; the other by frozen classification and structure checks. An independent blind mutant set and a count of detected contract discrepancies would compare their contributions. PIT has not been run in the spike. [C; F; J, “Next”]

### 3. Is observed behavior enough when intent differs?

- **A and B:** An independently sourced desired assertion must be able to disagree with the target; B places it in a required transition or invariant. [A, B; J §§14–15, 18]
- **C:** Treating recordings as the contract locks in observed defects; targeted assertions and a published interface contract are C’s proposed location for intent. [C; J §§5, 14, 18]
- **E:** A characterization is expected to change when a target is fixed; the relevant distinction is between the recorded observation and a separately sourced demanded behavior. E disputes that the preceding extraction was automatically independent of the target. [E; I, ADR-0094 and ADR-0103; J §15]

**Measurement:** No debate participant specifies a completed intent workflow. A concrete test is whether the system can retain both Petclinic’s observed 204 response and its stated 200-with-entity contract, show their conflict, and separately judge an approved change. The dossier records the discrepancy, not that workflow. [A, C, E; J §18]

### 4. What does the clock experiment rule out?

- **B’s initial position:** Holding a reference at one day leaves date behavior frozen; B predicted a +7-day widened future-date check would survive. [B, Round 1; K]
- **E’s correction, accepted by B:** Existing “tomorrow” inputs can test the other side of a future-date boundary even with the clock held. Whether a particular mutant is killed remains an experiment. A stored due date can also detect a changed schedule at the recorded inputs without stating the calendar rule. [E; B, Round 3; K, “D + 1” and “Masked leaves by kind”]
- **Remaining disagreement:** A and B distinguish detecting a changed date at sampled inputs from stating and testing a calendar relation. E stresses that the observed reference is intended to be replayed on its named day, not asserted valid on arbitrary days. [A, B, E; K, “What would make (b) and (c) hold”; J, Backlog 12]

**Measurement:** Run widened *and narrowed* boundary mutants at the held date, then test scenarios that advance the target clock and check calendar relations. The first experiment measures selected boundary detection; the second tests behavior across time, which fixed-day replay alone does not establish. [A, B, E; K; J §11]

## Claims to check

### Corrections and unsupported citations

- **B:** Only **two** of Conduit’s five remaining inexpressible rules required a target-computed slug or hash check; three required walking lists. B accepts the correction. [F; B, Round 3; J §10]
- **C:** Fineract had 17 refuted structure claims, **15** involving dates or amounts; the other two concerned instalment identity and `Loan.transactions`. C accepts the correction. [F; C, Round 3; K, “The spec layer”]
- **C:** The listed rule vocabulary has **20**, not 15, operators when the five arithmetic operators are included. C revises its prediction. [F; C, Round 3; T, “Terms”]
- **C:** PIT results do not exist in the spike; PIT is proposed as future work. A predicted PIT kill score is not an observed result. [F; C, Round 3; J, “Next”]
- **C:** Petclinic’s nondeterministic pet-order scenario was **replaced**, not deleted; that case is absent from the reference. [F; C, Round 3; J §14]
- **E:** Quotations and decision details attributed to ADR-0093, ADR-0094 and ADR-0117 are not verifiable from the supplied ADR index, which gives titles and statuses, not those texts. The index supports that ADR-0094 is titled “An extraction characterizes the target,” but not E’s quoted wording or asserted fixed-case intent mechanism. [A, B, Round 3; E; I]

### Other claims not established by the dossier

- **B’s revised mutant count:** The eight Fineract “tomorrow” cases include client creation, rejection and write-off as well as submit, approve, disburse and repay. The report does not establish that mutating only the latter four checks makes **at least eight** scenarios red. [B, Round 3; K, “D + 1”]
- **E’s and B’s due-date mutant expectations:** Unmasked business dates and recorded schedule readings support a testable prediction, not a measured kill of the proposed +2-month mutant. [E; B, Round 3; K]
- **C’s claim of three genuine omissions among four unclassed Conduit rules:** The dossier establishes four rules without a classed case and identifies image-update first-match interference; it does not establish from the supplied evidence that each of the other three is a genuine missing scenario. [C, Round 3; J §§10–11]
- **C’s Fineract fraction, 15/48:** The journal states “33 rules and 15 inexpressible,” while the clock report also describes 33 rules and 15 inexpressible rules. The supplied counts do not unambiguously establish that 48 is the correct denominator. [C; J §20; K, “The spec layer”]
- **E’s claim that no `.spec` was ever run against Fineract:** The supplied material does not establish that history. It does establish no controlled comparison between the two approaches in the reported clock experiment. [E; K]
- **C’s universal claims that generation fails whenever behavior involves hashes, slugs or pagination, and that repair requires reimplementing each algorithm:** The Conduit extraction experienced those difficulties; the dossier does not establish the universal or necessity claims. [C; J §§2, 20]
- **External tool and model claims:** Assertions about what standard OpenAPI validators, approval frameworks, host-language runners, PIT operators or a transition model can do are outside the supplied dossier unless separately demonstrated there. The proposed comparative experiments remain predictions, not results. [B, C; F; J, “Next”]

### Evidence chronology

The spike’s **Result** section says the rule layer was “not built” and lists a clock test as future work, but later journal entries describe a rule layer and the Fineract clock experiment. The later entries bound the current evidence. Fineract’s same-day result was 48–49 green of 52, with three unstable scenarios—not deterministic replay of all 52. [J §§9–11, 20 and “Result”; K, “Replays”]

## Open questions

- How are demanded behavior, observed behavior, human approval and intentional departures represented and reviewed without conflating their verdicts? [A, B, C, E; J §§15, 18]
- How can rule conditions be checked for correct classification and boundaries, including simultaneous obligations, rather than merely labeled by first match? [A, B, E; J §§10–11]
- How are clocks named, controlled and advanced across the application, JVM and database; how are calendar relations judged without masking the rule? [B, E; K; J, Backlog 12]
- How are unordered results, asynchronous effects, caches, ID pools, credentials and unwatched writes brought within the reproducibility boundary? [A, C, E; J §§5, 14, 20; K]
- How are changes to large references reviewed below the scenario level, and how are response headers, prepared-call effects and unobservable effects handled? [C; J §§5, 12–13, 15, 17]
- Does the approach transfer to a rewrite with a different schema, and do independently generated boundary mutants or tool-guided loops alter the comparative results? Those experiments are not in the dossier. [A, C, E; J, “Frame” and “Next”]
