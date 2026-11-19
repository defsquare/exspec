# Backlog

The only backlog. An item is written to be picked up cold: *Seen* (the evidence), *Settled*
(what is decided), *Next* (the first step), *Source* (where to read more). A done item is
deleted, never ticked: its commit says which item it closes. Order is the order to take
them in; each of the first five is a branch of its own.

## 6 — What the two targets need that the shapes do not say yet

- **Seen.** 78 of 167 scenarios of Conduit and 111 of 183 of Petclinic fitted the shapes
  as first drawn; the list of what did not, with counts, is in the fit reports.
- **Settled.** These are terms to add, not concepts: `:assert` on a list (membership,
  count, order), on an instance that appears or vanishes, on a field of a list's element; a
  `:then` for each effect; an accepted answer with no body; an actor a prepared call
  creates, a value taken from an earlier answer, a raw token; a fact that counts; an
  optional key in an interface's schema.
- **Next.** Take them in the order of their counts, each with the scenario that needs it.
  Measure the fit again once inputs have their place: the reports predate it.
- **Source.** `docs/brief/fit-conduit.md`, `docs/brief/fit-petclinic.md`,
  `docs/brief/framing.md` › "The shapes, redrawn by instances and tested for fit".

## 7 — Scenarios derived from a rule, and values at the bounds

- **Seen.** No mutant of the spike moved a bound; its scenarios were written far from them.
  Conduit already has one pair at a bound: a password of seven characters refused, of eight
  accepted.
- **Settled.** A rule is written whole; each condition denied alone gives a scenario, each
  bound two. Generation applies to an operation's inputs only: a valid value, and the
  values on each side of a constraint of a field.
- **Next.** From the `:takes` of `register`, produce the missing scenarios as planned
  copies, play them, and count what thirty bound mutants do before and after.
- **Source.** `docs/brief/framing.md` › "Experiments left"; ADR-0001.

## 9 — The target's clock

- **Seen.** On Fineract a reference holds only on the day it was taken: 20 scenarios of 49
  red one business day later; 15 rules cannot be written without a term for today.
- **Settled.** The clock the target is started with is part of what an execution records;
  a scenario may move it as an arranged step.
- **Also.** A value fixed by the day (a date with no time) is stable on two stacks started
  the same day and red the next: two recordings do not show it (ADR-0005).
- **Next.** Not before a target with a clock is taken. Then: holding the clock of a target
  that offers nothing for it, a date type, calendar arithmetic in a rule.
- **Source.** `docs/brief/clock.md`.

## 10 — A rule is checked: the trace and the mutants

- **Seen.** In the spike one mutant per rule, written from the rules themselves, none moving
  a bound; line coverage neither classes scenarios nor says a rule is judged.
- **Settled.** The two scenarios on each side of a condition differ by a branch of the
  trace; a mutant of that branch must turn them red. Trace and mutants come from existing
  tools and belong to the target.
- **Next.** After item 7. One rule of Conduit, end to end, with JaCoCo and PIT.
- **Source.** `docs/brief/framing.md` › "Settled with the user".

## The reset is checked, through the interfaces

- **Seen.** A reset that restores too little is invisible to the two recordings: both
  stacks accumulate the same changes in the same order, and the result is stable and wrong.
- **Settled.** specimen holds no driver (ADR-0004); the check uses the interfaces alone.
- **Next.** Once a projection can be read: read every projection that takes no input, play
  a scenario that writes, reset, read again, compare. Make it the last step of `up`.
  Cheaper, and with what exists: `record` plays the second stack's scenarios in reverse
  order — identifiers that drift then differ between the two executions and the scenario
  is unstable. On Petclinic the gate of the target passed although the agent had not
  confirmed that a reset gives the same identifiers back.
- **Source.** ADR-0004 › Consequences; `docs/branches/feat-play.md` at `f8bd037`.

## What a reference leaves free is measured

- **Seen.** Where two executions do not have the same form at a place (two lists of
  different lengths, a body that is not JSON once), the whole value there is one noisy
  place: `reference-written` counts 1, and a whole body or list is free. Lists are walked
  by index: two elements swapped become two crossed classes, and a replay that duplicates
  one element can pass.
- **Seen.** A class holds by the grain of its values. On Conduit a token carries its
  expiry to the second: two tokens issued in the same second are equal, a second apart
  they are not. Two noisy places were one class in both recordings and two values in a
  replay; two classes in the recordings were one value in a replay — 2 of 224 references
  told different, none the target's (`roles replay`; the rule is the same for `replay`).
- **Settled.** Noise is derived from two executions, in classes (ADR-0005); a reference
  where most of the answer is noisy compares little, and that is to show.
- **Next.** Count the leaves a noisy place frees, show it in `reference-written` and in
  `status`. Then pair the elements of a list by the identity of the structure a projection
  says it shows, instead of by index — it needs the projection, so after the readings.
- **Source.** ADR-0005 › Consequences; `docs/brief/spike-journal.md` › Journal 6;
  `docs/branches/feat-play.md` at `f8bd037`.

## A forced recording that changes the class of a status says so

- **Seen.** `record --force` rewrites a reference whose judged call answered 200 with one
  that answers 401, without a word. In the spike nothing stopped a recording from changing
  its class of status either.
- **Settled.** A reference is kept unless forced, and replaced when its scenario was
  rewritten.
- **Next.** When a reference is replaced and the status of its judged call changes, emit
  it as an event of its own; decide whether `--force` alone may do it.
- **Source.** `docs/brief/spike-journal.md` › Journal 5; `src/run/record.ts`.

## Conditions that say "the caller's" and "already taken"

- **Seen.** Six facts of ten on Conduit and four of eleven on Petclinic are written with an
  empty condition: the caller wrote the article, the caller is an owner administrator, the
  email is not used by another user, some owner matches the search. The terms have no
  value for the caller (a `where` or a `must-be` that names who is calling) and no way to
  say that no instance has a value. The agent's instructions even show such a fact with
  an empty condition.
- **Settled.** A fact is evaluated for an actor (ADR-0007); a fact with no condition is
  unknown, and makes ambiguous the rules of its operation that answer the same status
  (ADR-0008).
- **Next.** An ADR for two terms, each with the scenario of each target that needs it: the
  caller as a value (what of the caller — the actor's name is not its username), and
  absence over a list a projection shows. Then extract both targets again and count the
  facts left empty.
- **Source.** `targets/*/specimen/facts.yaml` of the two extractions;
  `docs/branches/feat-extract.md` at `c1c9ef0`.
- **Tried.** On a closed spike: a fact compares a value read with another value read —
  "the caller wrote it" through the instance the target shows as the caller's own. Used
  by one fact on each of two targets; "already taken" needs a list read whole, left. A
  seed that says what each actor is was rejected by the challenger: a role is a state of
  the target, to be read. Source: `docs/branches/spike-proof-completeness.md` at `e73729b` (branch `spike/proof-completeness`, closed without a merge).

## Effects in terms: something appears, something goes

- **Seen.** Every effect of both extractions is a sentence (`then: {says: …}`): the terms
  say a fact becoming true and a field moving by a number, and what these targets do is
  create and delete. A rule whose effect is a sentence is never judged.
- **Settled.** An effect written as a sentence stays declared only (ADR-0008).
- **Next.** Terms for an instance that appears (shown by a projection after, absent
  before) and one that goes; a field that takes the value of an input. With the scenario
  that needs each, one target at a time.
- **Source.** `docs/brief/fit-conduit.md`, `docs/brief/fit-petclinic.md` (a `:then` for
  each effect); `docs/branches/feat-extract.md` at `c1c9ef0`.
- **Tried.** On a closed spike: an effect says which instance (`where`), takes a value
  from an input, sees an instance appear, read by the identity the answer gives. Written
  by the agent on three targets; on the largest, 111 effects stayed sentences. Source:
  `docs/branches/spike-proof-completeness.md` at `e73729b` (branch `spike/proof-completeness`, closed without a merge).

## What the agent could not explain has a place, and comes back to a human

- **Seen.** On both targets the agent reported real contradictions and bent nothing: 401
  where the code raises 404 and 403 (Conduit); 500 for a wrong role, 200 in the contract
  where the code answers 201 and 204, a cascade that fails (Petclinic). They are told in
  its last message of each phase, which lives on the event stream alone. One was written
  as contract instead: a server error declared as a refusal's status (`role-missing: 500`).
- **Settled.** A declaration the target contradicts is left as the code says and decided
  by a human (ADR-0001, ADR-0006).
- **Next.** Decide where a contradiction is declared (beside the claim it contradicts, with
  the line of code read) and how the decision on it — the claim was wrong, or the target
  has a bug — is recorded and named. A refuted verdict is the same thing seen from the
  other side: one place for both.
- **Source.** `targets/*-extract.jsonl` (`agent-said`); the backlog's open
  question on a refuted claim; `docs/branches/feat-extract.md` at `c1c9ef0`.

## Loose ends of `extract`

- **Seen.** The gate of the target catches any error, a bug of specimen's included, and
  hands it to the agent as a finding. In the scenarios phase a `stop` that fails hides the
  session's error. `extract` has not run whole from the compiled binary: the agent calling
  the binary's own path is untried, and nothing says which version of `claude` the binary
  found on the PATH, older or newer than the one the SDK pins. The examples of the agent's instructions parse one by one and do not
  make one consistent extraction: copied literally, the tool flags them.
- **Settled.** The instructions' examples are parsed by a test.
- **Next.** Each is small and independent: let through what is not a failure of the
  target's own commands; keep the first error; run `extract` from the binary and show the version found;
  make the examples one extraction the checks pass.
- **Source.** `docs/branches/feat-extract.md` at `c1c9ef0`.

## Loose ends of the verdicts

- **Seen.** `play` judges a copy without knowing its noise: a date in a reading refutes
  `nothing-changes` during the agent's scenarios phase, until a reference exists. A
  reading keeps the answer and not the request made: a fact whose `where` is rewritten, or
  whose terms are reordered, is judged on the answer of another instance with no sign —
  ADR-0007 says to record again, nothing checks it. `binding-judged` carries the refusal's
  name inside a text. `fact-blocks` gives the reason of the first reference only, and does
  not name a fact unknown only in an effect's `then`. Petclinic's references predate the
  readings: 17 of its rules wait for a new recording.
- **Settled.** A reading is kept whole and the truth derived (ADR-0007); a claim that is
  not verified is shown with its reason (ADR-0008).
- **Next.** Each is small: `play` reuses the reference's noise when one exists; a reading
  keeps what was asked, and a reference whose readings no longer match what would be asked
  is stale; `{refusal, declared, observed}` as fields; then record Petclinic again.
- **Source.** `docs/branches/feat-verdicts.md` at `591b23f`.

## What the seed created has a name a scenario can use

- **Seen.** On Kadai (third target, 93 interfaces, 18 operations, 99 rules, 94 scenarios)
  the seed creates its tasks, workbaskets and classifications through the API and the
  target draws their ids at random. 67 scenarios of 94 hold such an id as a literal, read
  by the agent on the stack it had up: on the two fresh stacks of `record` the instance
  is unknown, and 12 of the 16 accepted paths are recorded as a 404 or a 400. The
  references are stable, so nothing is red; `status` shows them as
  `not-exercised: refused`. Conduit and Petclinic have ids one can predict (a slug, a
  serial number) and never met it.
- **Settled.** A scenario is written with holes and an execution fills them; the seed is a
  command of the target and writes the credentials file (ADR-0004).
- **Next.** An ADR, through the challenger: a way for a scenario to name what the seed
  created — the seed writing its ids beside the credentials, a scenario citing one by
  name — against the alternative of arranging the instance in the scenario and using the
  value an earlier call answered. Then the gate below, then extract Kadai again.
- **Source.** `specimen/` of the Kadai extraction (copied flat under `targets/kadai/`);
  `scenarios/claim-task/accepted.yaml` and its reference.
- **Tried.** On a closed spike, with no new term: the target phase asks for a starting
  state identical on every fresh start — a snapshot kept as a file where the target draws
  its identifiers. Twelve accepted paths recorded as 404 on one target went away. Source:
  `docs/branches/spike-proof-completeness.md` at `e73729b` (branch `spike/proof-completeness`, closed without a merge).

## A scenario that proves an effect and is refused fails the gate

- **Seen.** The gate of the `scenarios` phase asks that every scenario plays, not that it
  is answered as its rule needs: on Kadai twelve scenarios said to prove an effect were
  refused and the phase passed. A session of the agent that ends on an error of the API
  (a 403 at the start of a phase) fails the phase at once, where a failed gate is given
  three more rounds.
- **Settled.** A gate is a check the tool runs and whose findings go back to the same
  session (ADR-0006).
- **Next.** In the gate, a scenario whose proved rule is an effect and whose judged call
  is refused is a finding; useless before a scenario can name a seeded instance. Retry a
  session that ended on an API error.
- **Source.** The run on Kadai of 2026-11-13; `src/agent/extract.ts`.
- **Tried.** On a closed spike: the gate was built, then removed. On one target it met a
  real contradiction — the target refuses what its code accepts — and the agent, told the
  gate had failed, deleted the scenario. The tool cannot tell a scenario that misses its
  situation from a target that contradicts its code. Source: `docs/branches/spike-proof-completeness.md` at `e73729b` (branch `spike/proof-completeness`, closed without a merge).

## An extraction kept apart from the target's checkout

- **Seen.** The user gathered the three extractions under `targets/` of this repository,
  and copied Kadai's there flat, without the `specimen/` level: no command reads it.
- **Settled.** An extraction is `<dir>/specimen/`, in the target's checkout (ADR-0003).
- **Next.** If the need holds: an option naming where the extraction is read and written,
  the code still read in `<dir>`; the agent's writes confined to that place. It amends
  ADR-0003.
- **Source.** `targets/kadai/`; ADR-0003 › Alternatives, "Outside the target's checkout".

## A fact's condition says "one of", "holds", "or"

- **Seen.** After `spike/proof-completeness`, a fact with no condition is the first cause
  of a rule not judged on the three targets. On Kadai extracted whole (80 operations, 597
  rules) the agent left 74 facts empty: about 25 rules wait on "the task is one of several
  states" (`must-be` has `eq` only), about 30 on a role the target shows as a list on the
  caller's own instance (the administrator, the monitor), several on "the caller owns it
  or is an administrator". Conduit has one disjunction, Petclinic none of the three.
- **Settled.** A condition reads through a projection and nothing else (ADR-0007); what an
  actor is comes from an interface or stays unknown — a seed that says it was reviewed and
  dropped (a role is a state of the target; the specification would name a file of the
  target group).
- **Next.** An ADR for `[in, [v…]]`, `[has, v]` on a field that is a list, and a
  condition's term that is one of several (`any-of`); then Kadai's facts revised and its
  references recorded again — no new extraction is needed to measure it.
- **Source.** `docs/branches/spike-proof-completeness.md` at its last commit on the
  branch; `src/derive/truth.ts`.

## Roles and permissions no interface shows

- **Seen.** Petclinic: 3 facts, 35 rules, no interface shows a user or a role, and a wrong
  role answers 500. Kadai: the permissions of a workbasket (read, append, edit its tasks)
  block about 45 rules; access items are readable by an administrator only.
- **Settled.** Declared only, and `status` says the fact has no condition.
- **Next.** Decide what `status` says of a fact the interfaces cannot show at all — today
  it reads like a fact the agent did not write — and whether a reading may be taken as
  another actor than the caller (an administrator reading the caller's permissions).
- **Source.** `docs/brief/fit-petclinic.md` › "Blind spots"; `docs/branches/spike-proof-completeness.md` at `e73729b` (branch `spike/proof-completeness`, closed without a merge).

## How much of a target an extraction covers, and how steady it is

- **Seen.** Three extractions of Kadai by the agent on Sonnet bound 18, 10 and 8
  operations of 93 interfaces; one on Opus bound 80 (20 USD). The rate of rules verified
  was 36 %, 50 %, 52 %, 49 %: it says nothing of the surface. On the third Sonnet run
  facts the terms say since the first day were left empty.
  Why, read in the code: `interface-not-bound` is not among the gaps the specification
  phase must close (`closedBySpecification`, `src/derive/phases.ts`), so its gate passes
  with one operation and the phase is done for good; the list of interfaces itself did
  not move (one `interfaces.yaml`, byte for byte, under the three Sonnet runs). On a
  smaller target writes are covered each run and reads are not (16, 15, 14 operations of
  19 interfaces): the brief says "one per read that takes inputs worth a rule". Names
  move too: an operation's name differs from its interface's on 10 of 14 operations of one
  target, and from a run to the next (`follow-profile`, `follow-user`) — at an equal
  count, two extractions still do not compare.
- **Settled.** The specification is declared whole. The challenger, on a wider design:
  no group of interfaces walked by the tool — the gate's loop already sends the unbound
  interfaces back to the agent; no "reason" key for an interface left unbound; no slice
  of code per interface handed to the agent (tried with `codegraph`: 91 of 93 interfaces
  joined to their entry point by the contract's `operationId` on one target, 16 of 37 on
  another; the 80-operation run needed none). A gate strict on every interface would make
  the agent pad the reads no structure carries (configuration reads, a list of tags).
- **Next.** (1) `status` shows the surface beside the rate: interfaces bound of
  interfaces declared. (2) The specification's gate closes `interface-not-bound` for
  every interface whose method is not `get` — each has a trigger; reads stay gaps to look
  at. A short ADR amends ADR-0006 ("a gate is not made stricter with heuristics"). A
  test on a fixture extraction with a `post` interface and no trigger. (3) One Sonnet run
  on the largest target: the count, the cost, facts duplicated under two names. For the
  user: whether an operation is named after its interface when it has one — steady names,
  but it ties the specification to the API.
- **Since.** `specimen roles` walks the interface list — one reader, one builder, one
  judge per interface (ADR-0010): 93 of 93 on Kadai, 36 of 36 and 19 of 19 on the two
  others. What is above holds for `extract` only; a rule's name still moves from a run
  to the next (see "A rule's identity from one run to the next").
- **Source.** `docs/branches/spike-proof-completeness.md` at `e73729b` (branch `spike/proof-completeness`, closed without a merge), "Why the count of operations moves" ;
  `targets/spike-snapshots/`, and `4-codegraph-trial/` there for the design and the
  slice script.

## Comparing two versions of a target: extract once, replay, revise

- **Seen.** The user wants a differential between two versions. Extracting each version
  from nothing gives two specifications that do not compare (see the item above).
  Replaying recorded scenarios against a fresh stack involves no agent
  (`src/run/replay.ts`). Not exercised between two versions of a target.
- **Settled.** By the user: where the list of routes comes from — the OpenAPI contract
  first, then `codegraph`, then the code read ad hoc when both fail. `codegraph` gives no
  verb or path today (annotations come out empty) and crashes on one checkout's root.
- **Next.** (1) Carry the `specimen/` of version 1 into version 2's checkout — not
  tooled. (2) See what version 2 adds: the interfaces phase is done as soon as its file
  is not empty, so a new route is never seen. A check of `interfaces.yaml` against the
  contract's `(method, path)` set — the contract's place a key of `target.yaml`, or the
  running target serving it — puts the phase back to do; the specification's gate then
  sends the agent only what is new. An ADR and the key. Prefer the comparison of the two
  sets to generating `interfaces.yaml` from the contract in code (a converter of schemas,
  of unknown size).
- **Since.** With the roles: the evidence of Petclinic replayed to the same status on
  333 of 333 scenarios (190 identical; a timestamp differs in 143). `roles replay`
  compares a play with a reference outside its noise (ADR-0013); a reference is kept
  whatever version it was taken on. Not exercised between two versions of a target. A
  reading that follows a change of the code is to design
  (`docs/branches/spike-three-roles.md` at `d88b471`).
- **Since, by the user.** A reading is not launched again while the code has not changed;
  telling that it changed belongs here. Of the three things the roles store, two know
  what they were made from — an evidence its scenario as written (ADR-0013), a judgement
  the hash of what the judge was given — and a reading does not: each rule cites its
  place in the code, nothing says at which version. A way, not challenged: the tool notes
  the checkout's version when a reading passes its gate, as it does for an evidence; the
  code changed for an interface when a file its rules cite differs between that version
  and the current one. It misses a rule that would come from a file the reading did not
  cite; an interface added is the interfaces' list's to tell. A key added to a stored
  shape: an ADR.
- **Source.** `docs/branches/spike-proof-completeness.md` at `e73729b` (branch `spike/proof-completeness`, closed without a merge), same entry .

## What an agent takes from the running target while it specifies

- **Seen.** In the specification phase the agent starts the target to read the exact
  message of each refusal, and writes it as the refusal's `body`; on Petclinic it declared
  `forbidden` with the status 500 it observed. It left the target up (the scenarios phase
  now stops it first).
- **Settled.** A declaration is read in the code or the contract; the target contradicting
  it is reported, not copied (ADR-0001, ADR-0006). A 500 is never a refusal: the triggers
  were refuted all the same.
- **Next.** Decide whether a refusal's body value may come from an answer — a library's
  message is in no file of the target — and say so in the instructions either way; a check
  for a refusal declared with a status of the 500s.
- **Source.** `docs/branches/spike-proof-completeness.md` at `e73729b` (branch `spike/proof-completeness`, closed without a merge); `src/agent/instructions/phase-specification.md`.

## What a read answers, and an instance shown only in a list

- **Seen.** Conduit: 9 rules of its two lists are `nothing-changes` with nothing read
  around them, their real claim — newest first, filtered, paged — in the rule's name; 4
  rules on a comment, shown only in its article's list. Petclinic and Kadai: the paged
  searches.
- **Settled.** Only what the interfaces expose is compared; a reference already holds the
  whole answer of a read.
- **Next.** Terms on the judged answer itself (an order, every element has a value, a
  count), each with the scenario that needs it; reading one element of a list by its
  identity needs the parent's locator, which is no field of the element.
- **Source.** `docs/brief/fit-conduit.md`; `docs/branches/spike-proof-completeness.md` at `e73729b` (branch `spike/proof-completeness`, closed without a merge).

## Three changes of a closed spike that do not depend on its terms

- **Seen.** `spike/proof-completeness` was closed without a merge; three of its changes
  are corrections or instructions, whatever becomes of the terms it added.
- **Settled.** Nothing of that branch is on `main`.
- **Next.** Take each on its own, from its commit: the scenarios phase stops the target
  before starting it — a specification session that leaves the target up made the seed
  play twice (`cb52059`); a starting state identical on every fresh start, in the target
  phase's brief (`814c947`, without the gate of the same commit); a projection that shows
  one instance locates every path parameter of its interface — 13 rules of one target
  were unreadable and `check` said nothing (`d73043e`, `908a7de`). `bun test` is bound
  to `test/` since (`bunfig.toml`): `bun run live` was not checked after it.
- **Source.** `docs/branches/spike-proof-completeness.md` at `e73729b` (branch `spike/proof-completeness`, closed without a merge).

## Two specifications side by side: the extraction's terms and the roles' reading

- **Seen.** `specimen roles` writes its own files under `specimen/roles/` — rules as
  sentences, scenarios as raw calls, evidence, judgements — beside `operations/`, the
  facts' terms, the projections and the triggers, which serve nothing in the roles' path.
  Only `structures.yaml` is shared. `target up` and `status` refuse a checkout whose old
  files no longer parse while `roles` runs on it. Three whole targets through the roles:
  Petclinic 36 of 36 interfaces, Conduit 19 of 19, Kadai 93 of 93.
- **Settled.** The three roles are kept (ADR-0010). By the user: the specification keeps
  bounded concepts for a human reader — operations, rules, facts, structures — and a rule
  may be a sentence. By the user, the challenger agreeing on the direction: the
  specification takes the roles' form —
  (1) the reader's rules become `operations/*.yaml`;
  (2) the roles' evidence becomes a reference, two executions and the noise beside, and a
  judgement is attached to it;
  (3) the judgement replaces the derived verdicts as the conclusion;
  (4) `extract` runs the roles, and the phases and gates of the computed path go.
  Set aside: computed rules kept beside the judge — a rule is `verified` only once every
  fact of its operation is readable and its trigger translates the status, so keeping
  them keeps the facts' conditions, the projections and the triggers; and switching the
  default before the evidence replays — `replay` exists on the computed path only.
- **Done.** (2): `roles record` makes a reference of an evidence, `roles replay` plays it
  again with no agent (ADR-0013). On Conduit, 224 evidences made references by one more
  play each, no judgement stale; 222 equal at a replay, the two others a token told to
  the second.
- **Done.** (4): `extract` runs the roles in five phases named for what they produce —
  target, interfaces, reading, evidence, judgement — each doing what is left of it
  (ADR-0014, ADR-0006 superseded). Before it, Petclinic read whole by the roles with the
  reads held: 336 rules on 37 interfaces for 8.98 USD, 308 hold, 13 contradicted or
  refused by the target, 14 not shown, where `extract` the same day wrote 140 rules and
  verified 103.
- **Next.** In this order. (3) and the deprecations, concept
  by concept —
  ADR-0007 and ADR-0008, the facts' conditions, the projections, the triggers, an input
  rule's `violates`; and the items of this backlog that grow the computed terms are
  dropped with them, each with its reason. `status` goes with them: it prints the
  counts and the verdicts of the computed files beside the five phases — "0 operations"
  for "not looked at" in a checkout the roles read, 140 rules beside three phases to do in
  one that holds a computed specification. Then (1), with its ADR: ADR-0010's first
  alternative is taken up — after (3), since `operations/` is read with the computed
  path's schema until it is deprecated. `on` (ADR-0011) is kept: the roles' shape has
  it.
- **Tried, not merged.** A field's `pattern`, the code's regular expression computed
  against the whole value (`feat/field-pattern`, closed without a merge): on Petclinic,
  the same scenarios, 40 then 95 of 140 rules verified, no false verdict seen; the agent
  writes the expression when told to. A term of the computed path: not added.
- **Source.** `docs/branches/spike-three-roles.md` at `d88b471`, "Three whole targets through
  the tool" and "Read against the Frame"; `docs/adr/0010-three-roles-a-judged-reading.md`;
  `docs/branches/feat-field-pattern.md` at `1dbc595` (branch `feat/field-pattern`, closed
  without a merge), its Journal.

## Which model reads a whole target

- **Seen.** Petclinic read by the stronger model: 504 rules, 11 contradictions, all the
  target's, 31 USD of which 23 for the readers; by the default model before that, 263
  rules for 9 USD. On three operations, one run per cell, rules written: default 9, 8, 4;
  default at high effort 18, 10, 5; default with the reader told the contract is not the
  code 11, 10, 5; both 18, 11, 8; stronger model 24, 16, 5 at about six times the price.
  What the stronger model has alone: effects on what an answer shows (paging, totals) and
  edge cases of a value. Conduit whole with both: 215 rules, 6.8 USD.
- **Settled.** `--model` and `--effort` are options of `roles`; the default model with no
  effort is the default. The strict paragraph is in the reader's instructions. Every count
  here was made before a reader's reads were held (see "The runs were made before the
  reads were held").
- **Next.** Read Conduit once with the stronger model and compare rule by rule with the
  run at high effort before changing a default; one run per cell says little — repeat
  the three operations.
- **Source.** `docs/branches/spike-three-roles.md` at `d88b471`, "Why the default model read
  less" and "Conduit read again"; the runs under `targets/spike-snapshots/8-tool-petclinic/`
  and `9-tool-conduit/` (not in the repository).

## A contradiction that is the reader's, and a family with one cause

- **Seen.** One line of the common reading made 29 contradictions on Petclinic; corrected
  by hand, the count went from 44 to 12. On Conduit 21 of 22 contradictions are one fact
  (401 answered where the common reading says 404 or 403) that the common reader had
  written as a doubt under `unsure` and kept as a rule all the same. `view` lists them one
  by one and does not tell a misreading from a bug of the target.
- **Settled.** A gate checks a form; a wrong rule shows only at the judge. The judge is
  given a rule's doubt and told it is no evidence.
- **Next.** Decide who corrects: the reader sent back with the evidence that contradicts
  it (it then sees what the target answers — say what that does to the separation), or a
  person. A shared rule carries its own doubt, so that its contradictions read as the
  doubt settled. `view` groups the contradictions of one shared rule into one line.
- **Source.** `docs/branches/spike-three-roles.md` at `d88b471`, "Three whole targets through
  the tool" and "Conduit read again".

## A rule's identity from one run to the next

- **Seen.** Two runs of a reader on one operation write the same rules in substance under
  different names; the lines of code a rule cites nearly do not move. Nothing in the tool
  matches a rule of one run, or of one version of the target, with a rule of another.
- **Settled.** Nothing.
- **Next.** Try `source` as the key on two runs of one target already kept: how many rules
  pair, how many split or merge. Needed before a reading can follow a change of the code.
- **Source.** `docs/branches/spike-three-roles.md` at `d88b471`, "A second run of each role".

## A judge that says the same twice

- **Seen.** The judge run twice on the same evidence of Petclinic: 321 of 333 judgements
  have the same word. The 12 that move are near-matches of a text and `contradicted`
  against `refused-unexpectedly`; a confidence moves by a tenth. The judge costs 1.3 to
  2.7 USD on the two small targets and 17.9 on Kadai, a third of that run.
- **Settled.** A judgement is stored with a hash of what the judge was given (ADR-0010);
  no threshold on a confidence. A decision model as the judge was tried by hand — 18 of
  19 planted contradictions, no evidence named — and the user did not take up measuring
  it as a filter.
- **Next.** Two judges and their disagreement shown; or the text of a body judged apart
  from its status.
- **Source.** `docs/branches/spike-three-roles.md` at `d88b471`, "Three whole targets through
  the tool"; `targets/spike-snapshots/8-tool-petclinic/run2-judge/` (not in the
  repository).

## Loose ends of the roles

- **Seen.**
  - *The evidence* records no header of an answer and no body other than JSON.
  - *"Not shown" on Kadai: 135 of 1 255.* 99 scenarios say their situation was not
    reached; the rest is not read: a setting no interface shows, or a rule no caller can
    reach.
  - *The structures can still be written from memory.* The reader of the structures has
    the code alone, and its gate checks the file's form: on a target the model knows, a
    file written without opening the code would pass. Not seen. A `source` per structure,
    as a rule has, would show it; that is a key added to a shape.
  - *The readings were not read again with the structures read from the code* (one
    target): whether a reader files an input under a link (`owner`) when the interface
    shows an identifier (`ownerId`) is not seen.
  - *A structure nothing is filed under.* A structure no operation takes or answers has
    no operation in `view`; nothing says a structure is shown, where the terms had a
    projection. Derivable: shown when an operation that answers it has `answers` judged
    to hold.
  - *Two findings of the review left open:* an unreadable evidence file fails the whole
    command; `roles play` drops the events of the reset.
  - *Commands of the roles that drive no agent live in `src/agent/`*: `roles-record.ts`,
    `roles-replay.ts`, `roles-scenarios.ts`, beside `rolesPlay`, the builder's check
    (`builtOf`), `evidenceAt` and `rolesCommand` they use. Their layer is `run`: move the
    check and the plumbing that needs no agent there first, then the three.
  - *`gate-checked` says role `builder` where no builder runs*: `roles record` and
    `roles replay` tell an interface whose check fails with the builder's event. Another
    event, or a role less, changes an event's shape: an ADR.
  - *`roles replay` says nothing of a scenario with no reference* unless its interface is
    asked for: it is passed over and the command is ok; the page shows it
    (`evidence-played-once`). And it reads the credentials before it starts the target, for
    the actors' names: in a checkout no stack has run in, the file is not there.
  - *`isAsWritten` has no test* for an unnamed step a hole cites, nor for a hole in a body
    or a query; wrong, it has a scenario played again.
  - *The page has a definition of its own of what is left.* `src/derive/roles-view.ts`
    derives gaps weaker than `leftOf` (`src/derive/roles-left.ts`), which the roles,
    `extract` and `status` read: an evidence played once is "not judged" there, one no
    longer of its scenario as written has no gap, a reading that fails its check is not
    "not read". The page reads `leftOf`.
  - *The judge is started by a reference and reads everything.* Once one reference of an
    interface waits, the judge is given every evidence of the folder — played once, no
    longer of its scenario — and judges while the builder's check of the interface fails.
    Give it the references only.
  - *The two agent phases of `extract` keep a shell.* The hook holds each to its own
    files — `target.yaml`, `.gitignore`, `target/` for the first, `interfaces.yaml` for
    the second — through the file tools only: a redirection in a shell writes anywhere.
  - *Names the challenger left:* `RolesSetting` for `{target, interfaces}` and `declaredIn`
    returning an `Examined` — `Declared` would say both; `recordReferences(…, false)`, a
    positional boolean — `{force: false}`.
  - *One stale judgement, and the whole interface is judged again*: the judge is skipped
    only when every evidence of the interface is fresh, and otherwise reads them all and
    writes the whole file — verdicts that had not to move may. With the shared part of the
    hash (every requirement of the operation), one rule reworded costs the operation.
  - *Names the challenger left:* the stored key `of` holds a hash (`given-hash` would
    say so; renaming it rewrites every judgements file); the parameter `bound` of the
    judge's task is an interface. `src/derive/roles-view.ts` is past 400 lines: ask which
    step it is doing.
  - *The page's column:* which stop a scenario exits by is computed in the page's own
    script, which no test runs. A scenario that exits by the stop of the inputs shows the
    status answered, not the refusal's name. The word of a mark is the rule's name without
    its input's, found by turning the input's name to dashes: an input in capitals keeps
    the whole name.
  - *`view`:* a builder's finding about an unknown actor is not seen (the page reads no
    credentials). Kadai's reading is in the first form — no structure, `takes` and
    `answers` as sentences — and does not draw until read again (about 56 USD the first
    time).
- **Settled.** Nothing: each is to take on its own.
- **Next.** The two findings first, each with its test.
- **Source.** `docs/branches/spike-three-roles.md` at `d88b471`, its Backlog.

## The runs were made before the reads were held

- **Seen.** Until a hook held every call, a session's reads were held by a callback the SDK
  calls only for what it would ask a person: nothing inside the checkout. Read in the
  transcripts of the three targets: none of the 205 builder sessions read or searched
  outside its own files; nearly every reader searched from the checkout's root at least
  once, and 2 such searches on Conduit, 14 on Petclinic, 21 on Kadai came back naming
  files of the earlier extraction or of the evidence. Conduit read again with the hook,
  one run: 46 requirements as before, 85 effects against 108, 3 contradictions against 22
  — the 21 with one cause are gone, the readers wrote the 401 the target answers. Counts
  only: nothing says whether fewer effects come from the reads now held or from the run.
  The judgements stored under Petclinic's and Kadai's checkouts read as stale.
- **Settled.** The separation is built (ADR-0010): a hook on every call, not a brief.
- **Next.** In the transcripts of Conduit's new run, count the searches refused at the
  root; set the rules the new run no longer has against the files the earlier searches
  named: does a reader that cannot search from the root read less, did a rule of the kept
  run come from a file it should not have seen. Then Petclinic and Kadai: read again, or
  drop what is kept.
- **Source.** `docs/branches/feat-input-rules-in-view.md` at `45c9087`, "Conduit read
  again"; the run kept before under `targets/spike-snapshots/9-tool-conduit/run2-effort-high/`
  and the transcripts under `~/.claude/projects/` of the machine that ran them, neither in
  the repository.

## Open questions, no item yet

- A fact the interfaces do not show ("the email is not registered yet").
- A constraint between two inputs ("the end is after the start").
- The decision on a refuted claim — the claim was wrong, or the target has a bug — and how
  a wanted deviation is named.

## The roles drawn as a flow

- **Seen.** `specimen extract` on a terminal draws its five phases as a flow of boxes with
  a panel for the running phase; the roles' sessions of a phase add their turns and cost
  to its box, a role's failed gate shows in the panel, and a box counts what the phase did
  in this run (read, references, judged) — the `interfaces` box counts nothing any more.
  The commands of `roles` still print one line per event, the sessions of several
  interfaces interleaved under a `[interface]` prefix. The flow of `extract` has been
  watched on hand-written events only, not on a real extraction.
- **Settled.** A drawing is a reading of the event stream: a pure fold into a state, an Ink
  component that draws it, chosen when the output is a terminal; no event is added for it.
- **Next.** Watch a real extraction through the flow and adjust the drawing. Then the same
  for the roles: the roles as columns (reader, builder, judge), one row per interface, the
  sessions running side by side — a fold of the events that carry `role` and `interface`.
- **Source.** `docs/branches/feat-extract-flow.md` at `b8300ed`; `src/cli/flow.ts`,
  `src/cli/render-flow.tsx`.
