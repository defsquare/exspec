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
- **The two problems, corrected in the briefs and checked on three operations** (same
  folder, `v2/`).
  - *A check before the hand-over.* The reader runs the checker on its own folder and is
    done when it reports nothing — as a phase of the tool is done when `check` is silent.
    The list of facts, which repeated the fact of each requirement, is gone from the form.
  - *What holds for the whole target is read once.* One reader before the others writes
    `common.yaml`: how the target under trial is started, who a caller is, how an error
    becomes an answer, where the contract and the code differ as a habit. It may read how
    the target is started (`specimen/target.yaml`, `specimen/target/`). On Petclinic: 5
    settings, 6 shared rules each with the operations it applies to, 5 kinds of error, 6
    habits of the contract, 4 doubts; 76 000 tokens. It settles what the 24 readers each
    doubted — security is on in what runs, off in what ships — and names the three actors
    and their roles, which the trials only found by crossing answers.
  - *Three operations read again with it* (`create-owner`, `list-owners-page`,
    `delete-pet`): the checker silent on the three, where the first pass left one file
    that was not YAML; doubts 23 → 14; tokens 230 000 → 192 000, a sixth less; each names
    the shared rules that apply (`signed-in`, `owner-admin-role`) instead of writing them.
    One reader corrected the shared file on its own operation — an empty page answers 200,
    not the 404 said of an empty list — rather than follow it.
  - *Left.* The shared reader wrote "not settled, see unsure" in the body of four
    refusals: the checker reads a form, not a sentence. The saving in tokens is small:
    most of a reader's cost is not what the shared file spares. The checker is a script of
    the trial; in the tool it is a schema for what the reader writes — shapes, so the
    challenger and an ADR.

- **What a reader's tokens go to, measured on the 27 transcripts of the readers run by
  hand.** A reader's context is 43 000 tokens before it reads anything — the harness's
  system prompt, its tools, the project's instructions; it then reads 13 000 tokens of the
  target in 15 turns and writes 11 000. Two thirds of "75 000 tokens per reader" is the
  harness, not the target: nothing to gain by cutting the reading further, everything by
  running the roles in the tool, whose sessions have a prompt of their own.
- **The three roles run by the tool** (`3f0358a`, ADR-0010 Proposed; the challenger's
  verdict on the design: keep for a spike, three corrections, all taken — the folder is
  `roles/`, not `reading/`, a name ADR-0007 already uses; the reader is refused the other
  roles' files; a judgement carries a hash of what the judge was given). `specimen roles
  read | build | judge | play | page`: the tool walks `interfaces.yaml`, one reader, one
  builder, one judge per interface, several at once. The separation is built: the reader's
  target is not started; the builder has no shell and one tool, `play` (steps in, the
  target reset, the answers out), so the evidence is the tool's recording; the judge has no
  tool and is never given the builder's words. The reviewer: no leak found, two Important
  left open (an unreadable evidence file fails the whole command; the reset's events are
  dropped inside a play), and Minors for the pre-merge challenger: `Bun.hash` and
  `Bun.YAML` inside `derive`, `eventSchema` a plain union, the target started before
  deciding what is skipped, a symlink leaves the confinement.
- **Three whole targets through the tool, default model** (files under each checkout's
  `specimen/roles/`; events, scripts and the first run kept under
  `targets/spike-snapshots/8-tool-petclinic/`; the pages under `targets/pages/roles-*.html`).

  | | interfaces judged | rules | scenarios | holds | contradicted | refused unexpectedly | not shown | USD |
  |---|---|---|---|---|---|---|---|---|
  | Petclinic | 36 of 36 | 263 | 333 | 267 | 44 | 2 | 20 | 9 |
  | Conduit | 19 of 19 | 182 | 231 | 181 | 32 | 0 | 18 | 5 |
  | Kadai | 93 of 93 | 946 | 1 255 | 1 037 | 79 | 4 | 135 | 56 |

  - *The perimeter is the interface list.* Kadai: 93 of 93, where three runs of one session
    had declared 18, 10 and 8 operations. Every gate that failed (a file that is not YAML,
    a hole that resolves to nothing, a verdict outside the four words) was repaired in the
    same session; one interface failed on Petclinic — a builder wrote a scenario for what
    the call answers, which the check refused: fixed in the same commit, a scenario may name
    `answers`.
  - *An operation costs about 0.25 USD on Petclinic and Conduit, 0.60 on Kadai* (a third
    each role there: the evidence of a list is long). By hand it was 250 000 tokens.
  - *The contradictions come in families.* Petclinic: 29 of 44 are one line of the common
    reading — the exception's name in a refusal's body, read `AccessDenied…`, answered
    `AuthorizationDenied…`. Conduit: all 32 are one fact — an unknown thing or a forbidden
    act is answered 401 where the code reads 404 or 403. Kadai: an error key paraphrased by
    the reader (judged at 0.5–0.6, the judge saying "may be a loose paraphrase"), and what
    a human wants to see: page 0 and page size 0 accepted, an export answered 200 and
    empty to a caller without the role.
  - *One line of the reading corrected, then `roles judge` again*: the hashes tell which
    judgements are stale; Petclinic goes to 301 holds, 12 contradicted, 4 refused
    unexpectedly, 16 not shown. The 16 are the target's: paging bounds answered 500 (7), a
    malformed date 500 (3), an empty name 500, an id sent in a creation 500 (2), a valid
    update of an owner 500, a specialty still used refused.
  - *The evidence replays.* Petclinic, every scenario played again from a reset: 333 of
    333 answer the same statuses, 190 the same to the character (the rest: a timestamp in
    an error body).
  - *The judge twice on the same evidence* (Petclinic, 333): the same word for 321; of the
    12 that move, 5 cross between "holds" and a contradiction, all on the misread exception
    name or a bound, none above 0.85; 3 go between "contradicted" and "refused
    unexpectedly"; 25 cross 0.9 with no change of word.
  - *The builder writes more than it explores*: one or two `play` before writing for 31
    builders of 35; the gate's play is where a scenario meets the target. 6 scenarios say
    "not reached" on Petclinic, 19 on Conduit, 99 on Kadai. The bodies it chose were read
    on Petclinic: names of things (`neurology`, `Zed Zorn`), no comment in disguise.
  - *The reader is as deep as its model.* On three operations of Petclinic the default
    model gives 7, 6 and 4 rules for 0.08 USD each; a stronger one 19, 10 and 6 for 0.6 to
    1 USD — as the readers run by hand did — and it finds what explains a contradiction
    left open above: the entity wants exactly ten digits where the contract allows twenty.
    The shallow reader folds "present, short enough, well formed" into one rule per field;
    the builder makes up for it with a scenario per bound.
  - *What the evidence lacks*: the headers of an answer (6 "not shown" on a `Location`),
    a body that is not JSON (an upload is refused 415: 4 "refused unexpectedly" on Kadai
    are the tool's).
- **Read against the Frame.** Generic: the same code, briefs and judge on three targets of
  two stacks, nothing written for one. Coherent: nothing predicted (a scenario has no
  place for an answer, the evidence is the tool's); only the interfaces are compared; a
  judgement is stored, as what a judge said once — ADR-0010, the user's to accept.
  Proportionate: under a dollar an operation, and the perimeter no longer moves. What it
  does not give: a verdict that is the same twice in every case (96 % of words), a rule's
  name that holds from one run of the reader to the next, and a reader that reads
  everything at the default model.

- **The reading walked in `view`, from the structures** (`c736d3d`; the user asked why the
  roles had a page of their own). Cause: `view` files an operation under the structure it
  answers or its inputs name, and the readers wrote no structure. The challenger's verdict
  on the design: keep, three changes, all taken — a reader of the structures in a session
  of its own, before the others; structures without bounds, a bound stays a rule; the
  judgements projected in `derive` onto the data the page already draws, the extraction's
  gaps hidden in that mode. A reader now says the field each input is and the structure
  the answer shows; `roles page` is deleted. ADR-0010 amended.
- **Petclinic again, the readers on the stronger model** (the earlier run kept under
  `targets/spike-snapshots/8-tool-petclinic/run3-corrected`, the closed spike's files under
  `old-extraction`; the page at `targets/pages/petclinic.html`). 8 structures; 36 of 36
  interfaces; 504 rules where the default model gave 263; 598 scenarios; 557 hold, 11
  contradicted, none refused unexpectedly, 30 not shown; about 31 USD, 23 of them the
  readers. 34 operations are filed under a structure, 2 are transverse. No contradiction is
  a misreading this time: the role refusals are read as the target answers them. The 11:
  an `id` the contract requires in a body and the target does not (8), a null list
  accepted, an unknown pet answered 500 where a constraint was read, and a search by
  prefix where `%` matches every owner. The reader's hints failed their gate once on 17
  operations (`reachable` not in its three forms) and were repaired in the session.

- **Why the default model read less, tried on three operations** (results under
  `targets/spike-snapshots/8-tool-petclinic/reader-*`; one run per cell, the same structures
  and common reading for all). The traces: at the default model the reader of a creation
  opened the contract and searched once; the stronger one opened the request's type, the
  entity, the mapping, the schema. Rules written (requirements + effects), for the creation,
  the paged list, the deletion:

  | reader | rules | finds the ten-digit phone | finds the type cascade | USD for the three |
  |---|---|---|---|---|
  | default model | 9, 8, 4 | in a doubt | no | 0.33 |
  | default, high effort (`--effort high`, new) | 18, 10, 5 | yes | yes | 0.46 |
  | default, the instruction made strict | 11, 10, 5 | yes | yes | 0.34 |
  | default, both | 18, 11, 8 | yes | yes | 0.88 |
  | stronger model | 24, 16, 5 | yes | yes | about 2.2 |

  The instruction now says the contract is not the code and names what must have been
  opened before writing: the entry point, the request's type, the stored thing, what is
  between them, what goes with a removal. Kept: it costs nothing and finds both. The effort
  is a flag, not a default. The readers run by hand were deep at the default model: the
  harness's own prompt and effort were doing what these two do.

- **Conduit read again with its structures, the readers on the default model at high
  effort with the strict instruction** (the first pass kept under
  `targets/spike-snapshots/9-tool-conduit/`; the page at `targets/pages/conduit.html`).
  4 structures (`User`, `Tag`, `Article`, `Comment`); 19 of 19 interfaces; 215 rules where
  the first pass gave 182 — the same requirements (46 for 45), the effects from 65 to 108;
  276 scenarios; 236 hold, 22 contradicted, 18 not shown; 6.8 USD, 3.2 of them the readers
  (0.17 an operation). 21 of the 22 contradictions are the one fact of the first pass: an
  unknown article, profile or comment, or an act on someone else's, is answered 401 where
  the code raises 404 or 403 — the common reader wrote it as a doubt ("sent through the
  container's error page") and kept 404 and 403 as the rule. One builder's session fell on
  a `get` written with a body, which the platform refuses to send: fixed, such a step is
  unplayable and goes back to the builder as a finding. No stronger model was run on
  Conduit: what this reader misses there is not measured.
- **ADR-0010 accepted by the user** (2026-11-15), with the stored judgement and the
  builder's own tool where ADR-0006 gave a shell; the branch is to be merged, which the
  Frame had set aside while it was a spike.
- **The challenger before the merge: merge after fixes.** Two Important findings fixed,
  one renamed, the Minor ones taken or sent to the backlog.
  - *The separation was asked, not built, inside the checkout.* A session's reads were
    held by `canUseTool`, which the SDK puts only what it would ask a person: a read or a
    search inside the working directory never reached it (tried: a session whose every
    read is refused read, searched and listed freely). Now a `PreToolUse` hook, which sees
    every call; the same trial is refused three times, and a reader on a copy of Conduit,
    refused its searches from the root, narrows them and ends in 14 turns.
    What the runs kept here were worth, read in the 205 builder and 223 reader
    transcripts of the three targets: no builder read or searched anything but its own
    files (its calls to a shell answered "no such tool"); nearly every reader searched
    from the checkout's root at least once, and 2 such searches on Conduit, 14 on
    Petclinic, 21 on Kadai came back naming files of the earlier extraction or of the
    evidence — names, and for a text search the lines matched. The counts of rules and
    judgements above were made with that leak open for the readers.
  - *A judgement's hash left out what every recording is judged with* — the operation,
    what the target runs with, every requirement: a requirement changed and no judgement
    was stale. The hash now covers both, and is SHA-256 rather than a hash the runtime
    does not promise to keep. The judgements kept under the checkouts read as stale until
    judged again.

## Backlog

- **The two specifications.** The roles' files live beside `operations/`, facts' terms,
  projections and triggers, which serve nothing in the roles' path; `target up` and
  `status` refuse a checkout whose old files no longer parse while `roles` runs on it.
  Fold the reader's sentences into the operation shape, or let the roles' form be the
  specification — and deprecate what no target uses any more. The user's, with its ADRs.
- **Which reader for a whole target.** On three operations the default model at high
  effort with the strict instruction writes three quarters of the stronger model's rules
  and finds the same two things, at a fifth to a third of its price. One run per cell: to
  confirm on a whole target (Conduit, not yet read with its structures) before it becomes
  the default.
- **A structure with nothing under it, and one nothing shows.** `Role` has no operation;
  nothing says a structure is shown, where the terms had a projection. Derivable: a
  structure is shown when an operation that answers it has its `answers` judged to hold.
- **A contradiction that is the reader's.** One line of the common reading made 29
  contradictions; corrected by hand here. Who corrects — the reader, sent back with the
  evidence? — and how the page tells a misreading from a bug of the target. A family of
  contradictions with one cause should read as one.
- **What identifies a rule from one run to the next, and from one version to the next.**
  Its name moves; the lines of code it cites nearly do not. Not touched by the tool.
- **Comparing two versions.** The evidence replays to the status (333 of 333); no
  `roles replay` yet, no noise beside the evidence (a timestamp differs in 143), and a
  reading that follows the code's change is to design.
- **A judge that says the same twice.** 96 % of words on the same evidence; the moves are
  near-matches of a text and "contradicted" against "refused unexpectedly". Two judges
  and their disagreement shown; or the text of a body judged apart from its status.
- **What the evidence records.** No header of an answer, no body other than JSON.
- **"Not shown" on Kadai: 135.** Read which are the builder's (a situation not reached:
  99 scenarios say so), which the interface's (a setting nothing shows), which the
  reader's (a rule no caller can reach).
- **The reviewer's open findings** on `3f0358a`: an unreadable evidence file fails the
  whole command; a play drops the reset's events; evidence older than its scenario counts
  as done.
- **The page.** `view` does not group the contradictions by cause; a builder's finding
  about an unknown actor is not seen there (the page reads no credentials). Conduit and
  Kadai are still in the first form (no structure, `takes` and `answers` as sentences) and
  do not draw until read again.
