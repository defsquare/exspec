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
- **Source.** `docs/brief/fit-conduit.md` at `5aec9f7`, `docs/brief/fit-petclinic.md` at `5aec9f7`,
  `docs/brief/framing.md` at `5aec9f7` › "The shapes, redrawn by instances and tested for fit".

## 7 — Scenarios derived from a rule, and values at the bounds

- **Seen.** No mutant of the spike moved a bound; its scenarios were written far from them.
  Conduit already has one pair at a bound: a password of seven characters refused, of eight
  accepted.
- **Settled.** A rule is written whole; each condition denied alone gives a scenario, each
  bound two. Generation applies to an operation's inputs only: a valid value, and the
  values on each side of a constraint of a field.
- **Next.** From the `:takes` of `register`, produce the missing scenarios as planned
  copies, play them, and count what thirty bound mutants do before and after.
- **Source.** `docs/brief/framing.md` at `5aec9f7` › "Experiments left"; ADR-0001.

## 9 — The target's clock

- **Seen.** On Fineract a reference holds only on the day it was taken: 20 scenarios of 49
  red one business day later; 15 rules cannot be written without a term for today.
- **Settled.** The clock the target is started with is part of what an execution records;
  a scenario may move it as an arranged step.
- **Also.** A value fixed by the day (a date with no time) is stable on two stacks started
  the same day and red the next: two recordings do not show it (ADR-0005).
- **Next.** Not before a target with a clock is taken. Then: holding the clock of a target
  that offers nothing for it, a date type, calendar arithmetic in a rule.
- **Source.** `docs/brief/clock.md` at `5aec9f7`.

## 10 — A rule is checked: the trace and the mutants

- **Seen.** In the spike one mutant per rule, written from the rules themselves, none moving
  a bound; line coverage neither classes scenarios nor says a rule is judged.
- **Settled.** The two scenarios on each side of a condition differ by a branch of the
  trace; a mutant of that branch must turn them red. Trace and mutants come from existing
  tools and belong to the target.
- **Next.** After item 7. One rule of Conduit, end to end, with JaCoCo and PIT.
- **Source.** `docs/brief/framing.md` at `5aec9f7` › "Settled with the user".

## The reset is checked, through the interfaces

- **Seen.** A reset that restores too little is invisible to the two recordings: both
  stacks accumulate the same changes in the same order, and the result is stable and wrong.
- **Settled.** exspec holds no driver (ADR-0004); the check uses the interfaces alone.
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
- **Source.** ADR-0005 › Consequences; `docs/brief/spike-journal.md` at `5aec9f7` › Journal 6;
  `docs/branches/feat-play.md` at `f8bd037`.

## A forced recording that changes the class of a status says so

- **Seen.** `record --force` rewrites a reference whose judged call answered 200 with one
  that answers 401, without a word. In the spike nothing stopped a recording from changing
  its class of status either.
- **Settled.** A reference is kept unless forced, and replaced when its scenario was
  rewritten.
- **Next.** When a reference is replaced and the status of its judged call changes, emit
  it as an event of its own; decide whether `--force` alone may do it.
- **Source.** `docs/brief/spike-journal.md` at `5aec9f7` › Journal 5; `src/run/record.ts`.

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
- **Source.** `targets/*/exspec/facts.yaml` of the two extractions;
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
- **Source.** `docs/brief/fit-conduit.md` at `5aec9f7`, `docs/brief/fit-petclinic.md` at `5aec9f7` (a `:then` for
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

- **Seen.** The gate of the target catches any error, a bug of exspec's included, and
  hands it to the agent as a finding. In the scenarios phase a `stop` that fails hides the
  session's error. The examples of the agent's instructions parse one by one and do not
  make one consistent extraction: copied literally, the tool flags them. An interruption
  that arrives while the proxy and the twins are being stood finds nothing to stop yet:
  what was started stays (`src/cli/main.ts`, every command that plays).
- **Settled.** The instructions' examples are parsed by a test.
- **Next.** Each is small and independent: let through what is not a failure of the
  target's own commands; keep the first error; make the examples one extraction the
  checks pass.
- **Source.** `docs/branches/feat-extract.md` at `c1c9ef0`.

## A target's command that never returns stops the run

- **Seen.** On Plane, `extract` waited 1h28 on `reset.sh`: its
  `docker compose exec plane-mq rabbitmqctl purge_queue` never returned, started during a
  RabbitMQ `system_memory_high_watermark` alarm. RabbitMQ answered again minutes later;
  the `exec` did not, ignored SIGTERM (forwarded to the stuck `rabbitmqctl`), and gave way
  only to a SIGKILL of the `docker-compose` plugin, after which the run went on. Nothing
  was emitted while it waited: the run looked alive. `src/io/shell.ts` spawns the
  target's commands (start, seed, reset, stop) with no deadline.
- **Settled.** Nothing.
- **Next.** A deadline on each of the target's commands, as the providers' and the twins'
  calls already have; past it, kill the process group (SIGTERM, then SIGKILL) and fail
  with the command line and what it printed — an error the run shows, not a wait. Whether
  the deadline is one value or set per command in the target's description is the
  choice to make.
- **Source.** The Plane extraction of 2026-11-24, `d0062ec`.

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
  On `trainings`, a whole extraction: the seed created two clients through the API at
  each start, 115 mentions of one client's identifier in the scenarios, 59 scenarios of
  223 unstable — 200 then 404 on the two stacks — and the proof failed with no judgement
  written.
- **Settled.** A scenario is written with holes and an execution fills them; the seed is a
  command of the target and writes the credentials file (ADR-0004).
  The target's session is now asked for the same starting state on every start from
  nothing, identifiers included: its seed loads the snapshot when there is one, and the
  snapshot is kept. A brief, checked by no gate.
- **Next.** An ADR, through the challenger: a way for a scenario to name what the seed
  created — the seed writing its ids beside the credentials, a scenario citing one by
  name — against the alternative of arranging the instance in the scenario and using the
  value an earlier call answered. Then the gate below, then extract Kadai again.
- **Source.** `exspec/` of the Kadai extraction (copied flat under `targets/kadai/`);
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
  and copied Kadai's there flat, without the `exspec/` level: no command reads it.
- **Settled.** An extraction is `<dir>/exspec/`, in the target's checkout (ADR-0003, ADR-0015).
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
- **Source.** `docs/brief/fit-petclinic.md` at `5aec9f7` › "Blind spots"; `docs/branches/spike-proof-completeness.md` at `e73729b` (branch `spike/proof-completeness`, closed without a merge).

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
- **Since.** `exspec roles` walks the interface list — one reader, one builder, one
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
- **Next.** (1) Carry the `exspec/` of version 1 into version 2's checkout — not
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
- **Since, by the user (2026-11-19): a reading made again names its rules anew.** Seen
  on one target: its 37 interfaces read a second time, the code unchanged — the rules of
  28 came back under other names (`location-header` -> `location-given`), and 82 scenario
  files were left that no rule could own. The tool now removes such a file and its
  evidence, and the builder writes the scenario again: a rule that only changed its name
  costs a builder's round and loses its reference and its judgement. That a reading made
  twice gives the same rules, or that two names are told to be one rule, belongs here:
  it is what comparing two versions needs first.

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
- **Source.** `docs/brief/fit-conduit.md` at `5aec9f7`; `docs/branches/spike-proof-completeness.md` at `e73729b` (branch `spike/proof-completeness`, closed without a merge).

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

- **Seen.** `exspec roles` writes its own files under `exspec/operations/<op>/`
  (ADR-0027) — rules as sentences, scenarios whose steps call an operation (ADR-0024),
  evidence, judgements — beside the computed path's `operations/<op>.yaml`, `facts.yaml`
  and `bindings.yaml`, which serve nothing in the roles' path. The trigger serves both: a roles' reading writes one per interface
  (ADR-0023).
  Only `structures.yaml` is shared. `target up` and `status` refuse a checkout whose old
  files no longer parse while `roles` runs on it. Three whole targets through the roles:
  Petclinic 36 of 36 interfaces, Conduit 19 of 19, Kadai 93 of 93.
- **Settled.** The three roles are kept (ADR-0010). By the user: the specification keeps
  bounded concepts for a human reader — operations, rules, facts, structures — and a rule
  may be a sentence. By the user, the challenger agreeing on the direction: the
  specification takes the roles' form —
  (1) the reader's rules become the operation's one file — its folder is `operations/<op>/`
  since ADR-0027, beside the computed path's `operations/<op>.yaml`;
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
  (ADR-0014, ADR-0006 superseded; three phases since ADR-0029). Before it, Petclinic read whole by the roles with the
  reads held: 336 rules on 37 interfaces for 8.98 USD, 308 hold, 13 contradicted or
  refused by the target, 14 not shown, where `extract` the same day wrote 140 rules and
  verified 103.
- **Next.** In this order. (3) and the deprecations, concept
  by concept —
  ADR-0007 and ADR-0008, the facts' conditions, the projections, an input rule's
  `violates` — not the triggers, nor `sends` and `shows`, which the roles' path rests on
  since ADR-0024; the older path's own call (`{operation, with, caller}`) and its
  judging by status go; and the items of this backlog that grow the computed terms are
  dropped with them, each with its reason. `status` goes with them: it prints the
  counts and the verdicts of the computed files beside the phases — "0 operations"
  for "not looked at" in a checkout the roles read, 140 rules beside phases to do in
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

## How many of a target's rules a reader misses

- **Seen.** A reading is measured by its count of rules alone: Petclinic 263 with the
  default model, 504 with the stronger one. Nothing says how many rules of the target a
  reader misses, nor how many it writes that the target does not have before a judge
  costs a scenario to say so. A paper that extracts rules from legacy code with an agent
  (AgentModernize) measures exactly that, against a list of rules reviewed by hand: 90 %
  precision, 92 % recall on eight programs written for it, 195 to 310 lines and 12 to 15
  rules each, some of them implicit — in the code, in no document. Its list is one
  annotator's and its programs are synthetic; its own way to keep a rule in the list:
  one "a naive translation could plausibly get wrong", which dropped about a third of
  the candidates (field present, generic sanitising).
- **Settled.** Nothing.
- **Next.** A small target whose rules are known because they were planted: about fifteen,
  written down before any reading, a few of them implicit and one or two spread over
  several files. Read it with each model and effort, several runs per cell; count the
  rules found, missed, and written without a planted rule behind them. A rule's name
  moves from a run to the next, so the pairing is by hand, or by name, then `on`, then
  the nearest sentence, as measured in "A rule's identity from one run to the next".
  Decide first whether a target
  already kept can carry planted rules or one is written for it.
- **Source.** arXiv 2605.17535v2, its Table VII and the section on the gold standard;
  "Which model reads a whole target" above.

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
  Measured on `trainings`: a reader given a reading whose check failed read it anew and
  changed the name of 5 to 7 rules of each of four interfaces, their scenarios and
  judgements left without a rule. And since a step calls an operation by its inputs'
  names (ADR-0024), an input renamed in one reading makes stale the evidence of every
  scenario that calls it, in any interface.
- **Seen.** Tried on two readings of Conduit, of six operations of Kadai, and of
  Petclinic by two models. A name cannot be made the same twice and is not the obstacle:
  the cut is — one rule here, three there. Rules with one equal in the other reading, by
  hand: 78 of 129 on Conduit (47 cut otherwise, 4 alone), 58 of 62 on Kadai, 11 of 35
  between two models. Paired by the same name, then the one input a requirement is on,
  then the nearest sentence: 97 of 129 on Conduit with none wrong, 58 of 62 on Kadai
  with one wrong. `source`, best match, pairs 77 with 4 wrong within one code base and 0
  of 27 across two; a refusal's name, 180 pairs with 107 wrong.
- **Settled.** No identity is stored. A name is a label: right when it matches (33 pairs
  of 33) and rarely matching; the cut is the obstacle. The pairing was written, measured
  and removed: the comparison of two readings does not need it ("Two code bases compared
  by their readings").
- **Next.** What still needs an identity is a scenario and a judgement left without their
  rule when a reading is made again. The pairing is to write again from its three layers
  (same name, the one input, nearest sentence) if a reading has to
  follow a change of the code; decide then what a rule cut otherwise does to its
  scenarios.
- **Source.** `docs/branches/spike-three-roles.md` at `d88b471`, "A second run of each role";
  `docs/branches/spike-replay-other-implementation.md` at `fdd596b`, "A rule's name made
  deterministic" and "The pairing in `derive`".

## A judge that says the same twice

- **Seen.** The judge run twice on the same evidence of Petclinic: 321 of 333 judgements
  have the same word. The 12 that move are near-matches of a text and `contradicted`
  against `refused-unexpectedly`; a confidence moves by a tenth. The judge costs 1.3 to
  2.7 USD on the two small targets and 17.9 on Kadai, a third of that run. On a NestJS
  back end of Conduit's API, judged under two seeds: 7 verdicts of 162 move on the same
  exchanges (a missing token taken or not for a bad one, a token equal to the one before).
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
  - *The evidence* records no header of an answer.
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
  - *A file the tool removes is told by no event.* The evidence of a scenario that is
    gone, and a scenario file whose name starts with no rule of the reading, are removed
    by the builder's gate without a trace in the stream: on one target, 82 scenario files
    would go unseen. Nothing settled. Next: an event that says which file was removed and
    why — a new event, so an ADR. Source: `docs/branches/feat-extract-runs-roles.md` at
    `0162c06`, "the readings made again"; `src/agent/roles-build.ts`.
  - *A role's event may say both its interface and its provider.* The schema of the
    events lets `interface` and `provider` stand together; a role has one or the other
    (ADR-0016, ADR-0020). And the flow of the terminal passes over a role skipped that
    has no interface. Source: `src/shapes/event.ts` (`bySchema`), `src/cli/flow.ts`.
  - *A misused command stands its providers before its usage is printed*: a proxy and a
    process started for a command that plays nothing — `roles build`, `record`, `play`,
    `replay`; `extract` stands them when its proof starts (ADR-0029). Next: the usage
    checked before `standDeclaredProviders`. Source: `src/cli/main.ts`.
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
  - *The two sessions of the target's phase keep a shell.* The hook holds each to its own
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

## The page of `view`: what an audit of it left

- **Seen.** Read on Petclinic's page at 1440, 1200 and 390 px, and by the challenger in
  the page's script:
  - *A verdict is a colour alone on a scenario's chip*, and amber is in no legend.
  - *The overview has no filter by verdict.*
  - *`open-access` is drawn with an exit "none, refused with 200"*: a rule that refuses
    nothing has no exit to draw.
  - *Under 900 px the two lists are cut at 13rem*, nothing saying they scroll.
  - *The row that is on has no `aria-current`*; the confidence of a judgement, a number
    beside a verdict, has no label.
  - *A structure's row is a `<summary>` holding a link*: a screen reader that activates it
    folds it where a reader expects to walk into the structure; the keyboard walks in by
    Enter.
  - *The page of an extraction without the roles was not drawn* (`mode` other than
    `roles`): its headings are "Rules refuted" and "Rules not verified", its measure
    counts "not verified"; no data was at hand.
  - *The measure of an operation is counted in the page's script*, which no test runs.
- **Settled.** The page reads what it is given and stores nothing (ADR-0009); a verdict
  is said by a mark and a word where the page was reworked — the gates, the overview.
- **Next.** The page without the roles first: draw one from a target extracted that way
  and read it. Then the counts by operation in `src/derive/`, with a test, the page only
  drawing them. The rest each on its own.
- **Source.** `docs/branches/worktree-ux-audit-view.md` at `5c56498`, its Journal and
  Backlog.

## An actor who signs in, and a file sent in a form

- **Seen.** The back office of `trainings` is driven with what exspec has now: a form as
  a request body, a redirection kept as the answer (ADR-0022). Its one actor holds a
  cookie the target's seed got by signing in once per start. Not sent yet: a
  `multipart/form-data` body, so no upload.
- **Settled.** Nothing: the seed signing in was enough for one account.
- **Next.** The first target with several accounts, or a session that expires during a
  run: an actor whose header comes from a call. The first operation that takes a file: a
  multipart body, its file as a digest in the evidence.
- **Source.** ADR-0022; `src/io/http.ts`, `src/derive/step-request.ts`.

## What an evidence does not hold of a provider, and holds wrongly

- **Seen.** On `trainings`, four interfaces extracted against generated twins: 81
  scenarios, 70 hold, 10 not shown, 1 contradicted.
  - *No header is recorded.* The one contradicted and one of the not shown
    are a `Location` and a `Cache-Control`: a rule about where a call redirects cannot be shown.
    A provider's interface describes the headers the target reads (ADR-0020); the evidence
    has none.
  - *A call that arrives late.* A call is of the step during which it arrived, a step
    ending after `quiet` ms of silence (ADR-0021). A call later than that after the last
    step is lost, and that step records `[]` — read as "nothing is sent". A wrong proof,
    with no signal.
  - *A provider declared, the target pointed elsewhere than at the proxy.* The gate of
    the target's session refuses a start that names no address of the proxy for a
    provider (ADR-0029); a host the target cannot reach, a port mapped otherwise, or a
    start changed after the session pass it: every step records `[]`, read the same way.
  - *A key in a query or a body.* No header is kept, so a key sent in one never reaches a
    versioned file; one sent in a query or a body would.
  - *What stood for each provider.* An evidence does not say whether a twin, and which,
    answered. A twin rewritten changes what the target is answered, and the references
    recorded before it are not told stale.
  - *A form sent to a provider* is compared as one string: a field that is noise makes the
    whole body noise.
  - Between two executions a `query` or `body` absent on one side is noise; on a replay
    it is a difference.
  - *The page of `view`* embeds every body sent to a provider as recorded: on `trainings`
    2.2 MB against 0.77, the sources of the documents rendered.
- **Settled.** A response of a provider is kept, not compared (ADR-0018). "Stale" is not
  guessed from a response that differs.
- **Next.** Each is its own decision, the headers first — it is what most verdicts lack:
  which headers of an answer are kept (a list per interface, from its description, rather
  than all), and whether they are compared. For the late call: what the run can know (a
  call recorded between two plays) and tell. For what stood for a provider: a fact of the
  run — the twin's digest — checked before a replay. For the proxy never reached: a
  provider no call was recorded for over a whole command, told at its end. For the
  page: a body past a size kept as its digest, or loaded when its scenario opens.
- **Source.** ADR-0018, ADR-0021; `src/io/proxy.ts`, `src/derive/evidence.ts`;
  `docs/branches/feat-calls-in-the-evidence.md` at `04d6a81`, Journal.

## A builder asked for one interface writes all its scenarios again

- **Seen.** `roles build --only <interface>`, asked for because six scenarios had lost
  their evidence, went over every scenario of the interface. It dropped one that carried
  a contradiction (a 500 while the session stays done): the 500 is still in another
  scenario's evidence, whose rule holds. Contradictions fell from four to one with no
  change in the target. About 4 $ of builders where six scenarios were missing.
- **Settled.** Nothing.
- **Next.** Tell the builder which scenarios are missing and that the others stand; or
  refuse, at the gate, the removal of a scenario whose judgement is `contradicted`. Decide
  with the item "A rule's identity from one run to the next".
- **Source.** `src/agent/roles-build.ts` (`builderSkip`, `buildGate`);
  `docs/branches/feat-calls-in-the-evidence.md` at `04d6a81`, Journal.

## A provider's reading set against the provider

- **Seen.** A provider is read from its consumer and its twin written from that reading
  (ADR-0020): on `trainings`, two providers, 0.05 to 0.20 $ a reading, 0.02 to 0.04 $ a
  twin. The reading is the consumer's side of a contract; nothing sets it against the
  real provider. A twin's gate checks only that it is served and that its state goes
  round; that it answers as expected was shown once, by replaying references recorded
  against twins written by hand.
- **Settled.** By the user, for later: a twin derived from a whole specification of the
  provider when one exists; the consumer's reading turned into a contract reconciled with
  the provider, as contract testing does — its scenarios replayed against the real
  provider standing behind the proxy, which no key declares any more (ADR-0021).
- **Next.** Nothing before a target whose provider can be reached for a test. Smaller, and
  first: a gate that sends a twin one call per interface of its reading and checks the
  status and the headers described; a `bun test` of the providers stood by exspec, which
  only a live check covers.
- **Source.** ADR-0020, ADR-0021; `src/agent/providers.ts`, `src/io/providers.ts`,
  `live/providers.live.ts`.

## A command says what it is about to run, and may stop there

- **Seen.** `roles read` and `roles build`, run on `trainings` without `--only`, read 50
  interfaces where four were meant and built 41 of them: 18 USD and 41 minutes before a
  look at the files showed it. Nothing said it beforehand. `roles-queued` gives a count
  when the agents start, and the same count — 50 — whether 50 roles run or 46 are skipped
  and four run; no cost is said before an agent ends. And a reader given a reading whose
  check fails reads it anew: 5 to 7 rules of each interface changed their name, their
  scenarios and judgements left behind — a reach nothing announced either.
- **Settled.** By the user: both a dry run and its use for a difference (the item below).
  What a command would run is already computed, purely, to decide what to skip.
- **Next.** An event before any agent, target or file is touched: the roles that will
  run, each with its interface and why, and those skipped — and, for a reader, what its
  reading puts back in play (its scenarios, its judgements). `--dry-run` on the roles'
  commands stops after it. A new event and a flag: an ADR. Not asked for: a ceiling of
  spending.
- **Source.** `src/derive/roles-left.ts` (`interfaceLeft`, `leftOf`),
  `src/agent/roles-build.ts` (`builderSkip`), `src/agent/roles-read.ts`;
  `docs/branches/feat-operation-apart-from-interface.md` at `cbab752`, Journal.

## What a change of the target puts back in play, said before anything runs

- **Seen.** An extraction is made whole each time. A rule says its `source` (a file and
  its lines); a judgement holds the digest of its rule and of its evidence. Nothing sets
  them against what changed in the target between two versions: which readings to make
  again, which scenarios to replay, which hold as they are.
- **Settled.** By the user: wanted, with the dry run above as its first use — the answer
  given without running anything. What is said is what is stale, never what the target
  will answer: nothing is predicted.
- **Next.** A design, challenged first. From the target's own difference between two
  versions and the rules' `source`: the interfaces whose sources changed (to read
  again), the scenarios that go through them (to replay), the rest (untouched). To
  decide: whether a `source` is reliable enough to rest on — never checked: a rule may
  cite one line of a behaviour spread over several files; what a change outside every
  `source` means; a scenario depends on every operation its steps call (ADR-0024), which
  the list has to follow — settled; whether a scenario's arrange steps make it depend on interfaces other
  than its own. First step, with no agent: on a target with two versions at hand, the
  list computed, set against what a whole extraction of the second finds changed.
- **Source.** `src/shapes/roles.ts` (`source`), `src/derive/judge-task.ts` (the digest a
  judgement holds); ADR-0013.

## What a call cannot say, and what a trigger says once

- **Seen.** On `trainings`, after a step was made to call an operation (ADR-0024) and a
  refusal's wire moved to the trigger (ADR-0023), of the 586 steps of the 80 scenarios
  judged 22 stay requests, and three things have no place:
  - *A page no interface describes.* 18 looks, before or after the judged call, at two
    pages of the back office (`GET /admin/programs/{slug}/sessions/{id}`,
    `GET /admin/sessions`): described, they would be calls.
  - *An answer that is a list of a structure* has no place by default — 13 readings of
    50 answer so, and no hole reads one yet. *An input sent once per element of a list*
    (`import-learners`) has no place at all: `[each]` is a projection's.
  - *A refusal that leaves several ways.* A rendering that fails is answered 503, 502 or
    500 after what the provider said; the trigger says one status, the others are in the
    evidence alone.
  - *A body paraphrased.* Two contradictions of `admin-issue-convention` are a trigger
    saying "Session not found." where the target answers "Session introuvable.": written
    before the readers were told to quote. They stay until that interface is read again.
- **Settled.** By the user: a refusal says one status; a refusal's body quotes the
  target; an interface described with a form is always sent one. A request a call says
  exactly is a finding, so a request left is one no call says.
- **Next.** The two pages described in `interfaces.yaml`, then the builder on the
  scenarios that look at them. A place for a list — decide whether a trigger's place may
  step into every element, as a projection's does.
- **Source.** ADR-0023, ADR-0024; `src/derive/input-places.ts`,
  `src/derive/answer-place.ts`, `src/derive/steps-as-calls.ts`;
  `docs/branches/feat-operation-apart-from-interface.md` at `cbab752`, Journal.

## A shared rule is proven on every operation

- **Seen.** On `trainings`, 107 evidences of 1071 are of the 3 rules of `common.yaml`:
  "the caller presents a valid key" is built, recorded and judged on 47 operations of 50.
  The rules of the wire, 332 more, are no longer written (ADR-0028).
- **Settled.** Nothing: left out of the branch that removed the wire's rules.
- **Next.** Decide what a shared rule's proof is — a scenario on every operation that
  lists it, as today, or on one, and what the others then show; count what a build and a
  judgement of them cost on one target first.
- **Source.** ADR-0028; `src/derive/check-built.ts` (`ownersOf`);
  `docs/branches/feat-wire-described.md`, Journal, at the commit before the one that
  deletes it.

## An actor is a set of headers behind a name

- **Seen.** A step is called `as` an actor; the target's seed writes the headers each
  name stands for (ADR-0004). Who may do what survives the target being rewritten
  (ADR-0019) — the headers do not — and the specification declares no actor: a rule says
  "the key has scope write" in a sentence, and the view draws the actors from the
  scenarios' `as`. The header a key travels in is of the interface and in no rule
  (ADR-0028); "the caller is authenticated" is a shared rule where a common reader wrote
  it, and names no actor.
- **Settled.** Left open by ADR-0024.
- **Next.** A design, challenged first: an actor declared in the specification — a name
  and what it may do — and its credentials on the target's side, a binding between them;
  which rules of a first target would name one.
- **Source.** ADR-0004, ADR-0019, ADR-0024; `src/derive/roles-view.ts` (`actorsOf`).

## Loose ends of the mark

- **Seen.** Drawn on a board and thrown away: under 32 px the word under its cloche is
  not read, the cloche over the `x` alone is, down to 16 px. No file of it exists, and
  the page of `view` has no icon. In a README, the ink of `docs/logo/exspec.svg` follows
  the system's colour scheme: a forge set to dark on a light system shows navy letters on
  a dark page, one set to light on a dark system white letters on a light page.
- **Settled.** The mark and its animated form (ADR-0017). A tile never carries `ex`
  (ADR-0015); whether the `x` alone may stand for the word is not decided — it is the
  user's, and an ADR.
- **Next.** When a page asks for an icon: put the `x` under its cloche to the user. When
  the README is read on a forge: a `<picture>` with a file for each scheme, which a forge
  maps to its own theme.
- **Source.** ADR-0017, its alternatives and consequences; `docs/branches/feat-logo.md` at
  `5038184`, its Journal.

## An operation left by the proof is said left

- **Seen.** On the full run on `trainings`, four reading operations whose check of what
  was built failed were passed over by the recording and by their judge, and `extract`
  ended ok: nothing said they were left. The cause of that failure was fixed; the silence
  was not. In the same phase, one path's builder failing in the first wave stops the
  evidence of every operation, and a state its path does not show puts its operation
  first again at each extraction.
- **Settled.** What is left is computed (`leftOf`), never stored; a state not reached is a
  gap, a path refuted a problem (ADR-0026).
- **Next.** Once the proof has built and recorded, an operation whose built check fails is a
  finding the command ends on, with the check's own words — a test on a fixture whose
  scenario names an unknown actor. Then the first wave: let the operations no failed path
  serves go on.
- **Source.** `docs/branches/feat-named-state.md` at `13e5b07`, Journal › "The full run on
  `trainings`"; `src/agent/roles-build.ts`, `src/derive/built-of.ts`.

## What a state leaves open

- **Seen.** On `trainings`, 13 states gathered by a role and reached, 341 of 941 scenarios
  starting from one, the builders 11 % cheaper on a whole run and 23 to 28 % on the
  operations that need a chained state.
  - *From a state, 81 % of the scenarios hold against 84 % of the others*: not read rule
    by rule; a state at hand may pull a builder toward the situation it already gives.
  - *The 13 path operations start from no state* — they are built before any is reached —
    and cost 4.50 USD of 12.71: a path that starts from another state is not written.
  - *`serves` is checked by the states' reader alone and read by the page alone*: a rule
    renamed later leaves a dead link there.
  - *One builder used no state* though its situation was one (`unenroll-learner`): one
    run, not looked into.
  - *`exspec states rename`*: a write that fails midway leaves a half rename; a key
    `my-state: a` makes it refuse where it could go on.
  - *The words*: "1 operations are not read yet".
  - *The page, on an evidence older than its state's path*: a step played is given its
    state by its position among the exchanges; a path changed since the recording may put
    a step under the wrong state. And the page replaces the state steps a second time,
    after `checkBuilt` did: one derivation, handed on, could not diverge.
- **Settled.** A state is a name, its structures and what is seen in it; its path is a
  scenario, and it is reached when its sentence is judged to hold on that path (ADR-0025,
  ADR-0026). A state belongs to scenarios, not to a rule: the page shows it in a
  scenario's drawing and on its own sheet, never on an operation's.
- **Next.** Read the `not-shown` of the scenarios that start from a state against those of
  the same rules before the states. Then, each a decision of its own, what ADR-0025 lists
  as not decided: a state that narrows another; a rule that cites the state before its
  call and the one after; a path that starts from another state; a state that holds a
  service's condition; what becomes of a hint's `situation`. Last and apart: the world of
  a proven state captured and restored, in place of its path played again.
- **Source.** ADR-0025, ADR-0026; `docs/branches/feat-named-state.md` at `13e5b07`, its
  Journal.

## The metamodel's drawing follows the schemas by hand

- **Seen.** `docs/metamodel.yaml` is written after the schemas of `src/shapes/` and drawn
  by `scripts/metamodel.ts`; a test holds the drawings to the file, nothing holds the file
  to the schemas. In the drawings a few routed lines still cross, with no word on them.
- **Settled.** The file is the source of the drawings and of their comparison between two
  revisions; a place on the grid is not the metamodel.
- **Next.** If the file drifts once: a test that every key naming another file in a
  schema has its link in the YAML — or the reverse, the links listed from the schemas.
- **Source.** `docs/metamodel.md`; `scripts/metamodel/draw.ts`.

## Modules past their size

- **Seen.** By the challenger, before the merge of the named state: `roles-view.ts` (563
  lines), `roles-build.ts` (356; `rolesPlay` would go in a module of its own),
  `main.ts` (309), `check-built.ts` (306), `roles-files.ts` (past 300). `RolesGap`
  repeats the kinds of `gapSchema`. `scripts/metamodel/draw.ts` is 800 lines: the
  schema, the comparison and the drawing are three steps.
- **Settled.** One module, one step.
- **Next.** `rolesPlay` out of `roles-build.ts` first; `RolesGap` inferred from
  `gapSchema`.
- **Source.** `docs/branches/feat-named-state.md` at `13e5b07`, Journal › "Pre-merge
  review".

## `check` crashes on a terminal

- **Seen.** Three sessions of the interfaces, on trainings, report that `exspec check .`
  crashes on a terminal with a React rendering error, and fall back on `--format json`.
  Not reproduced by hand.
- **Next.** Run `check` on a terminal against an extraction that holds only `target.yaml`
  and `interfaces.yaml`, every interface a gap; fix the renderer at the cause.
- **Source.** The interfaces' sessions of the extractions of trainings, 2026-11-24.

## A rewrite held to an extraction: what is carried, and what the first target leaves in it

- **Seen.** Conduit's extraction carried into the checkout of a NestJS back end of the
  same API. The references replayed there: 12 equal of 162, 150 different — dates,
  identifiers, null against "", statuses — and nothing says which difference breaks a
  rule. The same scenarios recorded and judged on the second target instead (two turns of
  `roles record` and `roles judge`, no builder, 0.75 USD): 96 hold on both, 30 hold on
  the first and are contradicted on the second, each with its sentence; 10 contradicted
  on the first hold on the second.
- **Seen.** What the first target leaves in what is carried: a reference holds the first
  target's defects (its 401 for what does not exist is in 35 references); a trigger does
  too (`article-missing: 401`, and the second is contradicted for answering 404); 93
  scenarios of 162 held a raw request, because an input under an envelope had no place.
  What had to be done by hand: the first target's `interfaces.yaml` in place of the
  second's (a trigger binds an interface by the reader's name for it), the seed's calls,
  and the `runs-with` lines — the judge's text holds them, so every carried judgement
  and state is stale on a target that words its settings otherwise.
- **Seen.** With the extraction carried before `extract --phase target`, the session
  wrote a base URL ending in `/api` against carried patterns that start with `/api`: its
  gate plays `alive` alone and passed, 94 references were route misses. Three scenarios
  of 162 lean on the seed; the judge moved 7 verdicts of 162 between two readings of the
  same exchanges.
- **Seen.** What a `holds` lets through: the judge takes a status that matches and says
  the body differs — a message where the trigger says empty — in ten of the verdicts
  read; `bio` and `image` empty where the first target answers null are in no verdict.
  The wire is described, not proven (ADR-0028): a rewrite held to the wire too needs the
  references compared, with their 49 scenarios of dates and identifiers.
- **Seen.** Both targets were HTTP with the same paths. With another way of calling the
  system — a batch, a file, a screen — only a scenario made of calls to operations
  survives; not tried.
- **Settled.** By the user: references are shared between two versions of one
  application only. Two code bases are not compared by replaying one's references on the
  other — see "Two code bases compared by their readings". A rewrite kept to the
  scenarios is judged by rule, on its own recordings. An input no call could send is now
  a finding of the reader's gate.
- **Next.** If a rewrite is taken up: write the procedure (what is copied, what is the
  second target's own, the two turns) and give the README's claim on a rewrite its
  standing; a check that the base URL's own path is not the start of every carried
  pattern; a command for a rule's verdict on two targets (today a script outside the
  repository). Not started: the scenarios built again from the rules alone on the second
  target.
- **Source.** `docs/branches/spike-replay-other-implementation.md` at `fdd596b`, from "The
  floor" to "Why 135 steps are requests".

## Two code bases compared by their readings

- **Seen.** Each code base read on its own, nothing carried (the specification phase,
  about 2 USD each on Conduit's 19 operations); the operations matched by method and
  pattern (19 of 19); then one agent given, per operation, the rules of both sides —
  requirements and effects with their sentences, the shared rules applied — and no code.
  Conduit (Spring) against a NestJS back end: 17 to 21 differences said, 9 marked sure
  in both runs and the same nine, all in the code — the author filter exact against
  partial, filters one by precedence against all together, an unknown tag ignored against
  an empty list, offset as a page against offset skipped, a cap of 20, following and
  unfollowing oneself refused by one, a username already used. Conduit read twice, as a
  control: 2 to 5 said, 1 sure — the two readers disagreeing on the list's page, one of
  them wrong against the code. A comparison of two readings of one code finds a reader's
  error.
- **Seen.** The silence. The differences not marked sure are of one kind: one side
  states a rule, the other says nothing — 12 in the code between the two code bases, 4
  false on the double reading, and nothing tells them apart. A reading says what an
  operation does, never what its reader looked for and did not find.
- **Seen.** What did not serve. A rule's name: two readings of one code share 0 shared
  rule of 7 and 17 effects of 61 by name. The file and line a rule cites: 0 of 27 across
  two code bases. A pairing of the rules computed first (same name, then the one input,
  then the nearest sentence — 87 pairs of 129, 2 wrong): the agent finds the same sure
  differences without it, and judging pair by pair loses what sits across a pair and a
  rule left alone. What two readings of Conduit do agree on: operations, structures (4
  of 4), fields (28 of 28), inputs (36 of 38), and a requirement's `on`.
- **Settled.** By the user: no reference and no call is shared between two code bases.
  The whole operation is judged, not a pair of rules. A difference read in sentences is
  a lead to check in the code or by a scenario, not a finding. No command: a prompt and a
  script outside the repository.
- **Next.** Before any command, a second pair of code bases — the prompt was written on
  one. Then the silence: what would let a reading say "looked for, not there" (a list of
  questions every reader answers for an operation? the proof on both sides, comparing
  only the rules held?). The prompt, as run:

  ```
  You compare the business behaviour of two systems, A and B, that serve the same API.
  For each operation you are given the rules someone wrote after reading each system's
  code: the requirements (what must hold, or the call is refused) and the effects (what
  the call does or shows). You do not have the code and must not look for it.

  The two lists were written independently. The same behaviour is often said with other
  words, under another name, or cut otherwise: one rule on one side may be two or three
  on the other, and a rule's sentence on one side may hold what the other side says in a
  rule of its own. Judge the operation as a whole, not rule by rule.

  For each operation, say every difference of behaviour between A and B that the two
  lists state or imply — a call accepted by one and refused by the other, a different
  result, a different thing stored, shown or removed. Do not report: a difference of
  wording, naming or cut with the same behaviour; a detail one side states and the other
  is merely silent about, when nothing on the other side says otherwise and it is a
  detail a writer could leave out.

  Report as `only` a behaviour that one side states as a rule of its own and that the
  other side would be expected to state if it had it (a refusal, a cap, a filter's
  behaviour).

  One entry per difference: the operation, `differs` | `only-A` | `only-B`, the rules
  involved, one sentence (what A does, what B does), and `sure`: high | low — low when
  the two sentences may be two ways of saying one behaviour and you cannot tell.
  ```
- **Source.** `docs/branches/spike-replay-other-implementation.md` at `fdd596b`, from "The
  strategy turned" to its end; the runs under `targets/runs/2026-11-2[4-6]-*` (not in the
  repository).

## The flows of an operation: which rules turn it

- **Seen.** By the user: a requirement on an input, or on an instance being there,
  weighs less than what an accepted call changes; a requirement weighs when it turns the
  business flow; an operation with such turns is not a straight line. Conduit has none:
  of its 125 rules, 61 are effects, 32 shared requirements applied, 15 on an input, 17 on
  the situation. Kadai has: 158 of its 395 effects hold a `when`, in 62 of 93
  operations — about 80 on an input, 45 on the state of the thing, 20 per item of a bulk
  call.
- **Seen.** Six operations of Kadai read twice: the refusals and an effect's `on` (the
  input its `when` looks at) are the same in both; the `when` of an effect on the
  situation differs in three operations of six. A key tying an effect to the requirement
  it is an accepted answer of (`of`) was written in one operation of six by each reader,
  not the same, and was removed.
- **Settled.** An effect's `when` may say `on: <input>`; `flowsOf` derives, from the
  rules alone, the refusals (on an input, on the situation), what every accepted call
  does, what varies by an input and what turns on the situation. Nothing is stored, no
  command shows it. Rejected with the challenger: a named decision with its alternatives,
  a label on a `when`, a structure's field as the thing a `when` reads.
- **Next.** The turns on the situation are a flat list: nothing says whether two `when`s
  are two answers to one question or two questions. Without it the branches cannot be
  counted or drawn as a tree. What is left once the effects with an `on` are set aside is
  the list of an operation's business turns — a first use that needs nothing more.
- **Source.** `docs/branches/spike-replay-other-implementation.md` at `fdd596b`, from "An
  operation is not a straight line" to "`of` removed".

## Loose ends of a reading's inputs

- **Seen.** The envelope of a request (`{article: {…}}`) is read three ways by three
  readers of one target: an input of its own, a requirement `on` a field it holds, a
  requirement on nothing; five rules are named `…-wrapper-present` — rules of the wire,
  which is described and not proven (ADR-0028). They are most of what one reading says
  and another does not.
- **Seen.** Nine triggers of 19 write `sends: {}`, which says nothing.
- **Seen.** Read in the code, not met in a run: an input is found at the top of a body
  only when the description writes the body as a map of its fields. A body written as a
  named schema, or as optional, hides its fields: the gate then asks for `sends`, where
  the reader's instructions say `sends` is not written for a field at the top of the
  body. The place a `sends` names is already looked up through the named schemas.
- **Seen.** Two minors of the pre-merge review, left: the test of the findings on an
  effect's `on` sits with the flows' tests, not the reader's check's; `describedOf` does
  not say it reads the interfaces' file.
- **Seen.** An input the target's description has no place for — a header, a body the
  description lacks — is a finding its reader cannot fix: after three rounds the
  operation is left unread. Six operations of Conduit's extraction kept under
  `targets/conduit` no longer pass their reading and were not read again.
- **Settled.** An input is placed by its name at the top of the request, or by `sends`.
- **Next.** One sentence in the reader's instructions for the envelope (no rule, no
  input of its own?) and for an empty `sends`; decide what an operation with an input
  that cannot be placed becomes; an input named like a field of a body given by a named
  schema is placed there, the schemas passed as they are to the check of a `sends`.
- **Source.** `docs/branches/spike-replay-other-implementation.md` at `fdd596b`, "Why 135
  steps are requests", "An input with no place", "Conduit read a second time".

## Open questions, no item yet

- A fact the interfaces do not show ("the email is not registered yet").
- A constraint between two inputs ("the end is after the start").
- The decision on a refuted claim — the claim was wrong, or the target has a bug — and how
  a wanted deviation is named.
