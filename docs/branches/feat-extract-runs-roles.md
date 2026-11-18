# feat/extract-runs-roles

## Frame

**Goal.** `specimen extract <dir>` runs the three roles: after the phases that say how the
target starts and what its interfaces are, the structures and the rules are read, the
scenarios built, their evidence recorded as references, and the judge concludes — what
`roles read`, `roles build`, `roles record` and `roles judge` do today, one after the
other, as phases of the one command. The phases that wrote the computed specification and
its scenarios are no longer run by `extract`.

It is the fourth of four decisions the user settled (`docs/backlog.md` › "Two
specifications side by side"); the second — the evidence as a reference — is done
(ADR-0013).

**Non-goals.** Folding the reader's rules into `operations/*.yaml` (the first decision).
Removing the derived verdicts, the facts' conditions, the projections, the triggers, the
commands that read them (the third, and the deprecations). The roles drawn as columns in
the terminal. Changing a default model or effort. Reading Petclinic again with the reads
held.

**How it is judged.** With no target and no agent: the phases, their order, what skips and
what fails one, on the events of fakes. Then one whole `extract` on a small target from a
checkout that holds only its code — the user's to launch: it spends on the agent.

**The merge is the user's.** The branch is brought to the point where it can be merged,
with the challenger's verdict; it is not merged without being asked.

## Journal

- **Design, challenger (opus): the direction kept, two points to change before the ADR.**
  - "Done" must have one definition. Each role's body already decides alone what it
    skips, interface by interface; the gaps of `roles-view.ts` are weaker than those
    predicates (a rule without a scenario is a problem there, not a gap; nothing tells an
    evidence that is no longer of its scenario as written; the builder's check is run with
    other actors). A pure module in `derive` — what is left to do, by role and by
    interface — read by the bodies' skips, by `phasesOf`, later by the page. The pure
    functions over the files now in `src/agent/roles*.ts` move there.
  - What `--phase` forces must be decided: ADR-0006 runs a phase asked for "done or not",
    and a role's body plays a done interface again only when `only` is set.
  - Calling the bodies is not a call: they are closures given to `rolesCommand`; they are
    exported, and the `RolesRun` built in `src/cli/roles.ts` is shared, not copied.
  - `rolesBuild` and `rolesRecord` start the target even when nothing is left to do.
  - `test/agent/instructions.test.ts` parses the examples of `system.md` and expects seven
    files of the computed notation: the assertion changes, in a commit of its own.
  - The flow counts rounds and cost on events that carry `phase`; the roles' carry `role`:
    the four boxes would show no cost, and a role's failed gate would not show.
  - The key `record` of `status` keeps its name and changes meaning.
  - Agreed: the phases' names; the order 4, 3, 1 — `parseExtraction` ignores `roles/`, and
    folding into `operations/` before `operationSchema` is deprecated makes two schemas for
    one path.
- **The user, on the design.** The three roles may change how `extract` works today: its
  phases are to be thought again for them, not the four commands of `roles` put in a row.
  A reading is not launched again while the code has not changed. And the roles become
  the default *if their results are convincing*.
  - Taken: the phases by what they produce — `target`, `interfaces`, `reading`,
    `evidence` (the scenarios built and recorded), `judgement` — each doing only what is
    missing, interface by interface; nothing is forced, `--phase` chooses a phase and
    plays what is left of it. To read an interface again on purpose: `roles read --only`.
  - Not in this branch, by the user: telling that the code changed since a reading. It
    belongs with comparing two versions of a target; written there in the backlog.
  - So the order: the results first — one whole reading by the roles as they are, the
    reads held, looked at with the user — then the phases of `extract`.
- **The results: Petclinic read whole by the roles as they are, the reads held** (the
  user's go; default model, no effort, 4 jobs). A clone of the checkout at `afc8fc1`
  holding the code and, from the extraction made the same day by `extract`, its
  `target.yaml`, its 37 interfaces and its lifecycle files — not that checkout itself: a
  reader may read all of a checkout outside `specimen/`, and it held earlier extractions
  at its root. The target runs without security, as that extraction's did.

  | | sessions | USD | what came out |
  |---|---|---|---|
  | `roles read` | 43 | 4.49 | 8 structures, the common reading, 37 interfaces, 336 rules; 4 gates failed once, on `hints.yaml` |
  | `roles build` | 37 | 2.95 | 364 scenarios, every gate passed at once |
  | `roles record` | none | 0 | 364 references on one stack, none unstable |
  | `roles judge` | 37 | 1.54 | 364 judgements |

  8.98 USD. By judgement: 328 hold, 11 contradicted, 2 refused unexpectedly, 23 not
  shown. By rule, on the page: 308 hold, 11 contradicted, 2 refused unexpectedly, 14 not
  shown, 1 with no scenario; no problem, no gap, no stale judgement. Beside it, `extract`
  on the same target and interfaces the same day: 23 operations, 140 rules, 103 verified,
  none refuted, 37 declared only — 23 of them effects in a sentence, never judged.
  - *The 13 that do not hold are answers of the target*, read in the judgements, not
    checked against the code by hand: deleting an owner with pets, or a specialty, is
    refused 404 on a constraint (4); a creation given an existing id overwrites it (2); a
    page size of 101 answers 500 where 400 is read (2); an update without the id in its
    body is accepted (2); a visit with no date keeps none; a 204 with no body where one is
    read; a user's answer shows the password.
  - *The 23 not shown*: 7 are a `Location` header the evidence does not record; 8 a
    scenario that is not its rule's case (an id `abc` answered 500 for "does not exist");
    the others a situation not reached or a 204 that shows nothing.
  - *The reader of the structures read no code.* Its first search ran from the
    checkout's root, which the hook refuses since it runs through `specimen/`; it wrote
    the 8 structures from `interfaces.yaml` alone, in 7 seconds, saying so in its last
    sentence; its gate passed — it checks a form. 36 of 37 operations are filed under a
    structure all the same. Not read again: 37 readings name its fields.
  - The page: `targets/pages/petclinic-roles-2026-11-18.html`; the events of the four
    commands are in the session's scratchpad, not kept.
- **ADR-0014 written, by the user's go on the results.**
- **What is left for each role, one definition** (`e5c251d` refactor, `7a11248`):
  implementer (opus), reviewer. Two findings, taken in the thread: the judge skipped while
  scenarios wait for their evidence or its second play says so; a reference whose actor
  the credentials no longer hold stands — assumed, said in the code and in the ADR. Said
  in the ADR too, as the code now does: only a reference is judged, so `roles build` then
  `roles judge` with no `roles record` between judges nothing.
- **`extract` runs the roles in five phases** (`28d3a47` refactor, `ebf6dad`, `1f0209e`):
  implementer (opus), reviewer conformance approved. Taken in the thread: `target` and
  `interfaces` asked for by name run done or not — kept, said in the ADR. Decided by the
  implementer, kept, in its commit bodies: after a builder fails the other interfaces'
  references are still recorded and the phase fails; `--effort` reaches the roles'
  sessions only; `claude` is looked up on every `extract`.
- **The flow, and readers that search where they may** (`f7bea55`, `a899382`): implementer
  (sonnet), reviewer approved both, Minor only. `extract` no longer yields the counts of
  the computed files, which read "0 operations" for "not looked at".
- **Not seen: a real `extract` through the five phases, nor the readers' new paragraph on
  a real run.** Both spend on the agent: the user's to launch.
- For the challenger (reviewers' Minor, and the main thread's):
  - the page's gaps (`src/derive/roles-view.ts`) are weaker than `leftOf` and disagree
    with it on an evidence played once, an evidence no longer of its scenario as written,
    a reading that fails its check;
  - `status` still prints the counts and verdicts of the computed files beside the five
    phases; with only a computed specification it shows three phases to do and 140 rules;
  - `status` shows `reading` to do while `target` is, though `roles read` needs no target
    that starts;
  - the judge judges an interface's references while its builder's check fails;
  - the two agent phases may write anywhere under `specimen/` but `references/`: their
    confinement says nothing of `roles/`, their instructions do;
  - `src/cli/flow.ts`: `round` computed twice in `gate-checked`; `written` holds `""` for
    two phases; the three counts add up outside a running phase, harmless while `extract`
    alone draws the flow; the `interfaces` box shows no count any more; "1 references";
  - `phase-target.md`: "every trial of the system" is vague to a session that has not
    heard of scenarios;
  - `test/cli/flow.test.ts`: a role's failed gate not adding to `round` shows only at
    round 1.

## Backlog

- **`extract` runs the roles** (the fourth decision).
  - **Seen.** `extract` is five phases with gates (ADR-0006): `target`, `interfaces`,
    `specification`, `scenarios`, `record`. The roles need `target.yaml` and
    `interfaces.yaml` and nothing else of the extraction; `roles read` writes
    `structures.yaml` itself. A reading by the roles is four commands typed one after the
    other.
  - **Settled.** By the user: `extract` runs the roles, and the phases and gates of the
    computed path go.
  - **Source.** `docs/adr/0006-extract-in-phases.md`,
    `docs/adr/0010-three-roles-a-judged-reading.md`,
    `docs/adr/0013-a-roles-evidence-is-a-reference.md`.

- **The design, before the code — the phases are an event's shape and ADR-0006 is
  superseded: an ADR and the challenger first, then the user.**
  - The phases and their names; what tells each is done from the files alone.
  - What `--phase`, `--model` take; where `--jobs`, `--effort`, `--only` of the roles go.
  - What `status` says of the phases; what happens in a checkout that holds a computed
    specification.
  - What of the agent's instructions is left standing: the phases of the specification and
    of the scenarios, and the part of the system prompt that teaches their notation.
  - The order of the decisions left: this one, then the third, then the first — or as
    written in the backlog.
