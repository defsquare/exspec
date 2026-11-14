# spike/three-roles

## Frame

**Goal.** Find out whether specimen can be a *reading* — what a software is supposed to
do, how it is observed, and a judgement of the match with its degree of confidence —
produced by three roles kept apart, instead of a language of predicates that grows until
every rule is computable.

Said by the user, and what this spike starts from:

- specimen is not another test system: the target's repository has its tests. A
  language of assertions that grows is a test framework, and becomes code itself.
- Nobody is judge and party. **The reader** reads the code and gives the rules to
  observe, with how the repository's tests reach each situation; it never touches the
  target. **The scenario builder** tries to exercise each rule through the target's
  interfaces and collects the evidence of its scenario; it may not change, reword or
  drop a rule, and never reads the code. **The judge** concludes on the match from the
  rule and the evidence alone.
- The specification keeps its shape — operations, rules, facts, structures: bounded
  concepts for a human reader. It is to be filled; a rule may be a sentence.
- The specification is declared first, the scenarios after: the order does not change.

**Non-goals.** Merging anything into `main`: this is a spike, and what it keeps is
decided item by item, with its ADRs. Taking up the terms of `spike/proof-completeness`
(closed without a merge). Deciding what becomes of the existing terms before the trials
say which are still used. A new assertion language, in any form.

**How a step is judged.** Generic: the same roles, briefs and judge on at least two
targets, nothing written for one. Coherent with the three rules of the design — a
judgement that is not reproducible touches "nothing derivable is stored", and that is the
user's to decide through the challenger. Proportionate: its cost in tokens is measured
beside what it proves. Forbidden: a builder that bends or drops a rule, a judge that
reads the code or the builder's comments, an example in a brief taken from a target.

**Measure.** Per operation: the rules the reader gives; the recordings the builder
reaches; the judgements by word and by confidence; the contradictions, read by hand; the
tokens spent. And from one run to the next: which rules, which names, which judgements
move.

## Journal

- Opened from `main` at `c76a696`, after `spike/proof-completeness` was closed without a
  merge (`e73729b`: its record, measures and trials stay on that branch).
- **What is known before any code**, from the trials run by hand on that branch (files
  under `targets/spike-snapshots/5-judge-trial/` and `6-roles-trial/`, not versioned):
  - Kadai's `claim-task`: the reader gave 13 rules; the builder reached 17 of 18
    situations through the HTTP interface alone; an agent judge said "holds" for 17. The
    closed spike's extraction proves 3 of its 11 rules for that operation — the others
    are permissions, states and effects.
  - A blind set of the same recordings, 19 of them changed so the rule no longer holds:
    the agent judge found 19, a decision model 18.
  - Petclinic's `delete-owner`: 7 rules, 7 recordings; deleting an owner who has a pet
    is refused (404) where the code cascades, and the builder recorded it — the closed
    spike's gate had made the agent delete that scenario. A role no interface shows is
    told only by what the calls do; the judge says so and lowers its confidence.
  - A judge is as good as what it is sent: on references whose readings were derived
    from terms, a decision model agreed with the tool on 83 % of 973 cases and took a
    scenario that is not a case of the rule for a contradiction half the time.
- **A second run of each role, to see what moves** (files under
  `targets/spike-snapshots/6-roles-trial/run2/` and `petclinic/run2/`; fresh agents, the
  same briefs; the builder and the judge given the first run's rules and recordings, so
  that what moves is theirs).
  - *The reader.* Petclinic's `delete-owner`: the same 7 rules, same names, same
    cutting. Kadai's `claim-task`: the same five requirements in the same order with the
    same refusals and the same effects on the same lines of code — but 5 names of 13 the
    same, one rule cut in two (claimed time, modified time), two made one (the owner's
    long name), and two written that the first run had seen and not written (an
    administrator passes the permission checks; a claim again by the owner is accepted).
    What a rule says is steady; its name and its cutting are not. The lines of code it
    cites nearly coincide: an anchor in the code identifies a rule better than its name.
  - *The builder.* Petclinic: the same 7 situations reached and the same observed, the
    refused cascade (404) in the three scenarios with a pet. Kadai: the same 12 rules
    reached and the same one not (a setting no interface shows), in 21 recordings where
    the first run made 18 — it tried the three end states and both ways a task is held.
    The recordings differ in detail (how many pets, which route reads a visit), not in
    what they show.
  - *The judge.* Kadai, 18 recordings: the same word for all 18 (17 "holds", 1 "not
    shown"); the confidence moves by up to a tenth — 14 at 0.9 or more, then 10: a sharp
    threshold would turn four cases on no change of judgement. Petclinic, 7 recordings:
    the same word for 6; the seventh, "contradicted" at 0.55 then "holds" at 0.7, is the
    rule the reader itself wrote as unsure (a 500 with an exception's name near the one
    it guessed).
  - *Read.* Steady enough in substance on two operations; names are what does not
    compare. A rule the reader is unsure of gives a judgement that flips: unsure is to be
    said by the reader as such, not left to the judge. main's tool does not read the
    extractions under `targets/` (keys of the closed spike): the targets were started
    with the commands of their `target.yaml`.
- **A whole target, begun and stopped: Petclinic's 36 interfaces, one reader each** (files
  under `targets/spike-snapshots/7-whole-petclinic/`). Briefs made generic — they name
  no target and no operation — with three things the trials asked for: the reader's doubts
  in a list of their own (`unsure`), a refusal that says only what is expected, and a
  fourth word for the judge, `refused-unexpectedly`. Stopped by the user after 24 readers;
  no builder, no judge.
  - 24 readers, about 75 000 tokens each, 1.8 million in all. 281 rules on the 23 files
    that parse — 151 requirements, 130 effects — from 5 rules for a plain read to 32 for a
    creation with a constraint per field. 169 doubts, 7 per operation.
  - One rule every operation shares is named `signed-in` by 21 readers of 22: the name in
    the brief's example aligns the names.
  - What they found by reading, before any call: the contract and the code differ nearly
    everywhere (200 said, 201 or 204 answered; an error body promised, an empty 404; a 404
    on an empty list the contract does not list; an ETag and a 304 never built); two
    operations never check that the pet is the owner's of the path; deleting a pet may
    delete its type and the other pets of that type; a visit with no date would hit a
    database constraint answered 404.
  - **Two problems.** Nothing checks what a reader writes: a checker written after the
    fact (`check.ts` there) finds 33 problems in 19 of the 24 folders — 7 files that are
    not YAML, doubts and hints naming a rule that is not one, a status written "unsure".
    And what holds for the whole target — the security setting, how an error becomes an
    answer, the contract's habits — is read again and doubted again by each reader: most
    of the 169 doubts and of the cost.

## Backlog

- **What identifies a rule from one run to the next, and from one version to the next.**
  Its name moves (5 of 13 the same on one operation); the lines of code it cites nearly
  do not. An anchor in the code as the identity, the name free for the reader? A version
  that moves the code moves the anchor.
- **A rule the reader is unsure of.** It made the one judgement that flipped. A place to
  say "unsure, and why" that the judge reads as such.
- **A whole target.** One operation cost about 250 000 tokens across the three roles.
  What does a target of 80 operations cost, and does the tool walk the interfaces one by
  one — the perimeter fixed by the tool, not by a session?
- **A word for an effect whose call is refused where no requirement says so.** One
  judge said "contradicted", another "not shown"; it is the case a human most wants to
  see, and it must not depend on the judge.
- **How the reader writes a refusal.** What is expected, apart from what the contract or
  the code says elsewhere: a sentence mixing both made a judge refute the plainest case.
- **Which judge.** A decision model is nearly free and right on plain cases; an agent
  that reasons compares exactly and names its evidence — the exchange, the field, the
  values — which a human reading needs. One, or the first as a filter for the second.
- **Is the judgement stored?** It is not reproducible: stored with what produced it (the
  rule, the evidence, the model), or made again at each reading. One of the three rules
  of the design: to the user, through the challenger, with an ADR.
- **What the builder records, and whether it replays.** The trials recorded raw
  exchanges — before, the call, after — outside the scenario and reference shapes, with a
  fresh instance per scenario because the reset was not allowed to the agent. A
  comparison of two versions needs a recording that plays again.
- **Where the reader's hints live.** Passed from one role to the next and not kept, or a
  place in the files — then a key and an ADR. The specification points at nothing below
  it.
- **What the reader misses.** A rule that is not on the operation's path in the code (a
  caller not signed in) was missed on one target and found on the other. The repository's
  tests helped to reach situations; they said nothing of roles nor of a cascade.
- **Showing that a situation was reached**, without taking the builder's word: what a
  caller sees before the call was enough on one target; where a setting or a role is
  shown by no interface, the reading must say the evidence is indirect.
- **Who the caller is for the target.** The actor's name in a scenario is not the
  target's user; a judge inferred it from the bodies of refusals.
- **What becomes of the terms.** If the judge concludes, a fact's condition and an
  effect in terms are optional, perhaps unused. No concept is kept because it exists:
  decided after the trials, each removal with its ADR marked `Deprecated`.
- **The page.** The reading is for a human: the rule, the evidence beside it, the
  judgement and what it rests on. `view` is where it shows.
