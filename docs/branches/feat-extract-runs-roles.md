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
