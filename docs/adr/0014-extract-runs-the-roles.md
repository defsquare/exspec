# ADR-0014 — `extract` runs the three roles, in phases named for what they produce

Status: Accepted (2026-11-18) — by the user, after one whole target was read by the roles
with their reads held; the challenger's review of the design taken. Supersedes ADR-0006.

## Context

`extract` was four agent phases and a recording (ADR-0006): one session wrote the
specification in computable terms, the scenarios meant to prove it, and chose what to
cover. The three roles (ADR-0010) were four commands typed one after the other, beside it.

Read the same day, the same target, the same 37 interfaces: `extract` declared 23
operations and 140 rules, verified 103, refuted none, and left 37 declared only — 23 of
them effects written as sentences, which nothing judges. The roles wrote 336 rules on the
37 interfaces: 308 hold, 13 are contradicted or refused by the target, 14 are not shown;
8.98 USD. Since ADR-0013 their evidence is a reference and replays.

## Decision

- **Five phases, in order, each named for what it leaves in the files**:

  ```
  target      how the target starts, its starting state, its reset      one session, in the checkout
  interfaces  the list of its interfaces                                 one session, in the checkout
  reading     the structures, what holds for every operation, the rules  the readers (ADR-0010)
  evidence    the scenarios, played, recorded as references (ADR-0013)   the builders, then no agent
  judgement   the judge's word on each rule and its reference            the judges
  ```

  The first two are as they were. The phases that wrote the computed specification, its
  scenarios and its references are no longer run.
- **A phase does what is left of it, and nothing else.** What is left is told from the
  files alone, by role and by interface: an interface not read or whose reading does not
  pass its check; a rule without a scenario, a scenario without an evidence of it as
  written, an evidence that is not a reference; a reference not judged or whose judgement
  is stale. Only a reference that waits for its judgement starts the judge of its
  interface; once started, the judge reads every evidence of that interface, as it did. A phase with nothing left is skipped; `reading`, `evidence` or `judgement`
  asked for by name plays what is left of it — it forces nothing. Reading an interface
  again on purpose is `roles read --only`. `target` and `interfaces` asked for by name
  run their one session, done or not: nothing else writes those two files again.
- **The reader of the structures reads the code alone** — an amendment to ADR-0010, by
  the user. Of `specimen/` it reads its own file only, and it names the fields as the code
  names them. Given the interfaces' description, it wrote the structures from it without
  opening the code, three runs out of three; without it, an identifier the interface
  shows bare is read as the link it is (`ownerId: int` -> `owner: {structure: Owner, by:
  identity}`). How an interface shows a structure is the operation's reader's to say —
  each input the field it carries, whatever the interface calls it, the answer the
  structure it shows.
- **One definition of "left"**, in one pure module: the roles' own skips, the phases of
  `extract` and what `status` shows of them read it. It is told without the target: the
  check of a scenario's actors against the credentials is the builder's gate, at run time.
- **The roles' commands stay** — `roles read`, `build`, `record`, `judge`, `play`,
  `replay` — for one interface or one step. `extract` runs what they run, not the commands.
  `roles build` and `roles record` start the target only when something is left for it.
- **Kept from ADR-0006**: phases with gates the CLI runs, a failed gate's findings sent
  back to the same session; the files are the state and nothing records progress; the
  agent never writes what the tool records; its instructions cite nothing of specimen's.
  The agent's tools being the CLI's own commands through a shell holds for `target` and
  `interfaces` only: in the three other phases a session's tools and reads are ADR-0010's.
- **`status` shows the five phases.** The keys of its `extraction-phases` event change with
  them: `specification`, `scenarios` and `record` go, `reading`, `evidence` and `judgement`
  come.
- `extract` takes `--jobs` and `--effort` for the roles' sessions, with the roles'
  defaults.

## Alternatives

- **The four commands of the roles put in a row** — `read`, `build`, `record`, `judge` as
  phases. The names of commands, not of what `extract` produces; building a scenario and
  recording it are one product seen from `extract`; `record` would have kept its name in
  `status` and changed its meaning.
- **A phase asked for by name runs done or not**, as ADR-0006 had it. Asking for the
  reading of a target already read would launch every reader again, on code that has not
  changed.
- **"Done" told from the gaps the page shows.** Weaker than what each role checks before
  it skips: two definitions of one word.
- **Telling that the code changed since a reading**, so that `extract` reads again what
  changed. A reading does not say which version of the code it was made on; that belongs
  with comparing two versions of a target, and is not built.
- **Both paths kept, a flag choosing.** Two specifications side by side is what this ends.

## Consequences

- A checkout that holds a computed specification and no reading shows three phases to do;
  `extract` ignores its `operations/`, `facts.yaml`, `bindings.yaml`, `scenarios/` and
  `references/` and leaves them as they are. `check`, `verdicts`, `record`, `replay` and
  `target play` still read them, until the derived verdicts are deprecated.
- `extract` no longer reads again on its own, even when the code has changed.
- `roles build` then `roles judge`, with no `roles record` between them, judges nothing:
  the judge says what waits.
- The page still derives gaps of its own, weaker than what is left: an evidence played
  once reads "not judged" there, one no longer of its scenario as written has no gap. Two
  definitions of one word stay in the product until the page reads the one.
- A reference stands when the credentials have changed since it was taken — an actor the
  target no longer has: nothing is left for the builder, and it is a replay that tells
  the step can no longer be played.
- The agent's instructions lose the phases of the specification and of the scenarios, and
  what taught their notation.
- The gate of the reader of the structures checks a form (ADR-0010): a file written from
  memory of a well-known target, the code not opened, would still pass.
- A reading made again names its rules anew. A scenario file whose name starts with no
  rule of the reading can never pass its check, and a builder writes files, it removes
  none: the tool removes it, and its evidence with it. A rule that only changed its name
  loses its scenario, its reference and its judgement, and costs a builder's round.
- The cost of an extraction is the roles': a dollar a quarter per interface on the targets
  read, and three sessions an interface.
