# spike/replay-other-implementation

## Frame

**Goal.** Say, with counts, what an extraction lacks for a rewrite of its target to be held
to it. The README claims that a rewrite keeps the specification and the scenarios and
rewrites the bindings; no extraction was ever replayed against anything but the target it
was taken on. Conduit is one implementation of the RealWorld API among many: its
extraction, made again from nothing, is carried into the checkout of another
implementation and `roles replay` is run there. What the spike leaves:

- the floor — Conduit's references replayed on Conduit itself, the differences counted;
- what had to be written or edited by hand for the second target to be replayed at all,
  file by file — each one is a finding;
- every reference told different on the second target, filed under one cause:

  ```
  start       the starting state differs: an identifier, an actor, a seeded instance
  form        a value the reference holds as stable is drawn otherwise: an id, a slug, a date's grain
  wire        a status, a body's shape or a message of a refusal — the API's own contract, read otherwise
  behaviour   the second implementation does something else: a rule of the first it does not have
  tool        exspec's own: a replay that cannot be played, a comparison that is wrong
  ```

- the items this gives `docs/backlog.md`, in the order of their counts.

**Non-goals.** No change to `src/` beyond what blocks a run, each under ~30 lines and told
in the Journal; no new concept, no ADR. No agent rewriting a target from the extraction.
What a replay cannot see — a rule the reader did not write, a bound no scenario stands
on — is not measured here: a second implementation that passes says nothing of it. The
clean room's hygiene (a rule's `source`, the messages quoted) is not looked at. Comparing
two versions of one target stays the backlog's item; nothing is moved out of
`docs/backlog.md`.

**Why from nothing.** The `exspec/` kept under `targets/conduit/` is in the layout before
ADR-0027 (`roles/`, no `states.yaml`), its base URL the prefix of the API where it is now
where the system answers. By the user: extracted again, not converted.

**The second implementation.** To choose with the user before the second target is stood. Wanted: the same
paths under `/api`, a database a compose file starts, a reset that costs seconds. First
candidates: another back end of the same author's collection (the README of
`realworld-spring` points at it) — the nearest reading of the contract, so the differences
left are the least arguable; then one of the reference implementations of the RealWorld
project, for the distance. Conduit's seed goes through the API alone (`seed.sh`: three
users, three articles, two comments, one favorite): if the new extraction's seed does too,
it is carried as it is, and only the start, the reset and the stop are the second
target's.

## Journal

- **Opened** (2026-11-24). Framed after the question "what do the artefacts lack for a
  clean-room rewrite": the list given was read in the backlog, not measured. No challenger:
  no concept, no ADR, nothing stored.
- **Conduit extracted from nothing** (2026-11-24, `7cbeaec`, default model). The old
  `exspec/` and `specimen/` moved to `targets/spike-snapshots/10-conduit-before-replay-spike/`;
  the events kept in `targets/runs/2026-11-24-conduit/extract.jsonl`. The three phases
  ok, 66 sessions, 5.03 USD, about 11 minutes of wall clock for 1 236 s of agents.
  19 interfaces, 19 operations, 4 structures, 6 states — each path reached —, 125 rules
  written in the operations' files, 162 scenarios, 162 references. Judged: 128 hold, 17
  contradicted, 17 not shown; the files hold 168 verdicts, 134 of them `holds` — the six
  more are likely the states' sentences, not checked. The seed goes through the API alone
  (`seed.sh`), the base URL is the host and the paths start at `/api`.
  - *The contradictions, read one by one:* 13 of 17 are one fact — the target answers 401
    with an empty body where the rule says not-found (404) or forbidden (403), on seven
    operations. The four others: `update-article` accepts blank fields and a title already
    used (2), `update-current-user` answers a token equal to the one before where the rule
    says a fresh one, and a refusal's body with another shape than declared. For the
    replay on a second implementation: the 13 are where two readings of one contract are
    most likely to part, and the reference holds the 401.
  - *Seen in passing:* `status` on this extraction counts 0 operation, 0 rule, 0 scenario
    and tells every interface not bound — it reads the computed path's files, as the
    backlog already says.
- **The floor** (2026-11-24): `exspec roles replay targets/conduit`, one fresh stack, no
  agent — 162 references of 162 replayed with no difference
  (`targets/runs/2026-11-24-conduit/replay-floor.jsonl`). Before, 222 of 224, the two
  others a token told to the second: not met this time, one run. Every difference the
  second implementation shows is then its own, or the carrying's.
- **The second implementation chosen** (2026-11-24), by the user: the same author's NestJS
  back end (`adr1enbe4udou1n/nestjs-realworld-example-app` at `d4ddf3f`, TypeScript and
  Prisma), under `targets/conduit-nestjs`. Of the author's five back ends, four hold the
  very `postman.json` of the Spring one (same blob); Symfony's differs, ASP.NET Core has
  none. None starts its application by compose: the target's session writes that.
- **The second target stood** (2026-11-24): `extract --phase target`, two sessions, 0.27
  USD, both gates ok. Set against Conduit's before anything was edited:
  - *the interfaces*: the 19 `(method, pattern)` are the same; four names are not
    (`follow-user`, `unfollow-user`, `get-profile`, `list-articles` for
    `follow-user-by-username`, `unfollow-user-by-username`, `get-profile-by-username`,
    `get-articles`), and the shapes are read otherwise — no `ApiError`, `bio` and `image`
    not optional;
  - *the actors*: `ann` and `bob` on both, by the brief's example and not by a rule;
  - *the starting state*: the same three titles, hence the same slugs; other
    descriptions, bodies and tags, and the favorite and the follow turned round (bob
    favorites ann's, bob follows ann, where on Conduit ann does both to bob).
- **The extraction carried** (2026-11-24). Copied as they are: `structures.yaml`,
  `states.yaml`, `common.yaml`, `common-trigger.yaml`, `operations/`. By hand, what the
  second target wrote kept under `targets/runs/2026-11-24-conduit-nestjs/as-extracted/`:
  - `interfaces.yaml` replaced by Conduit's — a trigger binds an interface by its name,
    and the name is the reader's of each target;
  - seven lines of `seed.sh`, Conduit's calls in place of its own, and its snapshot
    removed to be taken again — the starting state is in no file of the specification:
    it is a script of the target.

  Nothing else: the base URL, the start, the reset and the stop are the second target's
  own, and no carried file names a host or a port. `exspec check` there tells what it
  tells on Conduit — 19 interfaces not bound, the computed path's reading — so nothing
  checks a carried extraction against the interfaces it lands on.
- **A first replay, the states not reached** (2026-11-24,
  `replay-1-states-not-reached.jsonl`): 130 references played of 162. The four operations
  with a scenario that starts from a state — `login`, `get-profile-by-username`,
  `get-article-comments`, `delete-article-favorite`, 32 scenarios — were refused whole:
  "not judged on its path yet". The text a judge is given holds the target's `runs-with`
  (`src/derive/judge-task.ts`), so the hash of every carried judgement is another on a
  target that says its settings in other words; a state is reached by a judgement that
  stands; a carried extraction has no state. Third edit by hand, to measure the 32:
  Conduit's two `runs-with` lines in the second target's `target.yaml`.
- **The replay** (2026-11-24, `targets/runs/2026-11-24-conduit-nestjs/replay.jsonl`): 162
  references played, **12 equal, 150 different**. Each difference filed by a script, the
  families read by hand; a scenario is given the heaviest of its causes — behaviour, then
  wire, then start, then form:

  ```
  behaviour   31   a status of the 500s (23 differences); accepted where Conduit refuses — a blank
                   title, a short password, an email not well formed (33); a filter of the list
                   that answers nothing, a page of the feed in another order, a token issued anew
  wire        70   401 on Conduit where the second answers 404, 400 or 200 (35 scenarios); `bio`
                   and `image` null against ""; a refusal's body, empty against a message; login
                   refused 400 against 401
  start       17   the dates of the seeded articles alone: they are in each target's snapshot
  form        32   `updatedAt` apart from `createdAt` on Conduit, equal on the second (102
                   differences); a new comment's id, 13 against 3 (40)
  tool         0   in the replay itself; three in the carrying, above
  ```

  No sixth cause was needed. Read otherwise: 49 scenarios differ by dates and identifiers
  alone, 66 with null against "" added; a status differs in 59.
  - *The reference holds what the rule contradicts.* The 17 scenarios judged contradicted
    on Conduit all differ on the second target, and where they were read the second does
    what the rule says: 404 for what does not exist, a token issued anew. Conduit's 401
    is in 35 references, not 13: it comes back in the readings before and after a judged
    call. A replay against a rewrite reads a reference with its judgement, or it asks the
    rewrite for the first target's defects.
  - *The 12 equal* are of five operations whose answers hold no date, no identifier and
    no `bio`: follow, unfollow, the tags, two readings of a profile, one update.
  - *What a holds does not carry.* 118 of the 128 scenarios that hold on Conduit differ;
    nothing tells the difference that breaks the rule from the one beside it — the judge
    was not run on the second target's answers.
  - *Seen on the second target:* a 404 whose body is the ORM's own message with a path of
    the container; eight 500s where Conduit refuses with 400.
- **The branch goes on** (2026-11-24), by the user: not closed; worked from a worktree
  (`.claude/worktrees/replay-other-implementation`), as far as its items. The Frame's
  non-goals on `src/`, a concept and an ADR hold for the measure above, no longer for
  what follows; the name `spike/` stays until the first change of `src/` says what the
  branch is.
- **What was replayed was the wrong half** (2026-11-24). The README: a rewrite keeps the
  specification and the scenarios. The replay carried the references too — Conduit's
  answers — and compared the second target with them. Tried next, with the commands as
  they are and no builder: the evidence and the judgements removed from the second
  checkout, its own `runs-with` put back, then `roles record` and `roles judge` there —
  the five operations a state's path names first, then all. The second target is then
  recorded on two stacks of its own, its noise its own, and each rule judged on what it
  answers; what is compared between two implementations is a rule's verdict, not a body.
- **The scenarios recorded and judged on the second target** (2026-11-24, no change of
  `src/`; `proof-on-nestjs.sh` and `proof-*.jsonl` under
  `targets/runs/2026-11-24-conduit-nestjs/`). 162 scenarios of 162 made references on
  two stacks of the second target, none unstable; the six states reached; 19 judges, 0.75
  USD. Judged there: 118 hold, 36 contradicted, 8 not shown. A scenario's verdict on the
  first target, then on the second (`verdicts-on-two.py`, same folder):

  ```
  holds         -> holds          96
  holds         -> contradicted   30   what the second does not do as the first
  holds         -> not-shown       2
  contradicted  -> holds          10   the second does what the rule says, the first did not
  contradicted  -> contradicted    6
  contradicted  -> not-shown       1
  not-shown     -> holds          12   a situation the first hid behind its 401
  not-shown     -> not-shown       5
  ```

  The 30, read one by one: 13 accepted with 200 where a field is blank, too short or not
  well formed; 7 answered 500 where a wrapper is missing or a parameter is not a number;
  7 of `login` refused 401 where the trigger says 400; 2 filters of the list that answer
  nothing where an unknown value is ignored; 1 where the trigger itself holds Conduit's
  401 for an article that does not exist. Set against the replay of the references: 150
  bodies that differ, of which nothing said which broke a rule; here 30 scenarios, each
  with its sentence.
  - *What a holds lets through.* The judge takes a status that matches and says the body
    differs — a message where the trigger says empty — in ten of the verdicts read; on
    `login` it refuses on the status. `bio` and `image` empty where the first answers
    null are in no verdict. The wire is described, not proven (ADR-0028): a rewrite held
    to the wire too needs the references compared, and that comparison is the first
    replay's, with its 49 scenarios of dates and identifiers.
  - *A trigger may hold a defect of the first target.* `get-article` declares
    `article-missing: 401`: the reader wrote what the target answers, and the second
    target is contradicted for answering 404.
  - *The order was given by hand*: the operations of the states' paths recorded and
    judged first. `extract --phase proof` knows that order and would run the builders,
    which write scenarios.
- **Carried first, then the target's phase** (2026-11-24, a fresh clone,
  `targets/conduit-nestjs-carried-first`; runs under
  `targets/runs/2026-11-24-conduit-nestjs-carried-first/`). The specification and the
  scenarios copied before any phase — no evidence, no judgement, no `target.yaml` — then
  `extract --phase target`: one session, 0.18 USD; `interfaces.yaml` is a file that is
  done, its session is skipped and Conduit's names stand. No edit of the interfaces by
  hand, then.
  - *The base URL was written against the carried patterns.* The session wrote
    `base-url: …:18300/api` and `alive: /tags`; its gate plays `alive` alone and passed.
    Conduit's patterns start at `/api`: every call left for `/api/api/…`. 94 references
    of route misses, 36 scenarios unstable, 92 judged not shown, 0.33 USD of judges — and
    the judge told a route miss from a refusal every time. In an extraction from nothing
    the interfaces' session writes its patterns after the base URL; here nothing sets one
    against the other. Corrected by hand, the failed run kept under `doubled-prefix/`.
  - *The seed is the session's own*: it read no carried file. `ann` and `bob`, the three
    slugs, the favorite and the follow as on Conduit; the tags `intro` and `news` where
    Conduit has `intro`, `java`, `spring`.
- **Recorded and judged with no order given** (2026-11-24, same clone, its own seed):
  `roles record` then `roles judge`, twice. First turn: 130 references, the four
  operations that start from a state held back, 136 judgements. Second turn: the 32
  left. 162 references, the six states reached, 19 judges, 0.75 USD: 112 hold, 39
  contradicted, 11 not shown. Two turns of the two commands are a proof with no builder.
  - *What the starting state weighs, on this target.* The same implementation judged
    under the two seeds: 152 verdicts of 162 are the same. Of the ten that moved, three
    are the seed's — scenarios that name the tag `java`, which this start does not hold
    (`get-articles/filter-by-tag`, `-2`, `filter-by-author-2`) — and seven are the
    judge's: the same exchanges read otherwise (a missing token taken or not for a bad
    one, a token equal to the one before, a page of the feed). The scenarios of this
    extraction arrange their own world; 3 of 162 lean on the seed.
- **Four cases, by the user** (2026-11-24), and what each keeps — the groups of the
  metamodel, from the target up:

  ```
  a service no one understands any more     keeps nothing: the extraction is what is asked for
  two versions of one application           keeps all, the references too: they are replayed
  a rewrite to the identical, another stack keeps the specification and the scenarios; the target and the bindings are rewritten
  a rewrite that refactors the domain       keeps a part of the specification, edited; the scenarios are built again
  ```

  The spike was the third case in its easy form, the same API. With another way of
  calling the system only a scenario that calls operations survives: 93 scenarios of 162
  hold a raw request, 135 steps of 498.
- **Why 135 steps are requests** (2026-11-24, `scripts/requests-no-call-says.ts`, no
  agent): the reasons `stepsAsCalls` gives. 125 are `unplaced-value` — a body is written
  and the call would send nothing — and 10 name such a step in a hole. All are `post` on
  four operations whose body is wrapped (`{article: {…}}`, `{user: {…}}`,
  `{comment: {…}}`): an input is placed by the name it has at the top of the body, no
  trigger of the 19 writes `sends`, and the reader's instructions do not speak of it. The
  builder is told the input has no place and writes the request.
  - *With eleven places in four triggers*, written in a copy: 129 of the 135 requests
    are said by a call. The six left are about the wrapper itself — no wrapper, an empty
    one, a body not wrapped: what only the wire can say.
  - *Three readers, three readings of one wrapper.* `create-article` takes `title`,
    `description`, `body`, `tagList` and cannot be called; `update-article` takes
    `article`, the wrapper as an input, and is called; `update-current-user` takes
    `user`, "the wrapping object", and its fields beside it. Five rules are named
    `…-wrapper-present`: rules of the wire, which is described and not proven (ADR-0028).
  - *Read for a rewrite:* the scenarios are free of the wire but for six; what ties 93 of
    them to it is a place the bindings do not say. `stepsConverted` already writes a
    request a call says as that call.
- **An input with no place, a finding of the reader's gate** (2026-11-24, by the user,
  no agent): `checkTrigger` is given the interface as described; an input `sends` does
  not place and no part of the request is named like is a finding, so is a `sends` that
  names no input or a place the request lacks. The reader's instructions say when `sends`
  is written. On Conduit's extraction as it stands: 17 inputs of 38, six operations whose
  reading no longer passes (`create-user`, `login`, `update-current-user`,
  `create-article`, `update-article`, `create-article-comment`) — neither built, recorded
  nor judged until read again. Not run with a reader yet.
  - *Ceiling:* an input the description has no place for — a header, a body the
    description lacks — is a finding its reader cannot fix: three rounds, then the
    operation is left unread, where before its steps were requests.
  - *Minor, for the challenger:* a fixture of `test/cli/view.test.ts` described
    `/a/{id}` with no path parameter; it has one now and its scenario is a call.
- **The strategy turned, by the user** (2026-11-24). A diff is of two versions of one
  application, and only there are references shared. Two code bases are compared as two
  extractions — structures, operations, scenarios — with no reference and no call carried:
  the wire's noise would hide the business behaviour looked for. Before that the rules are
  sorted: a requirement on an input or on an instance being there weighs less than what
  an accepted call changes; a requirement weighs when it turns the business flow. Then
  two code bases may be compared by likeness, by an agent. The scenarios carried and the
  scenarios built again from the rules alone are left there.
  - *Conduit's 125 rules by sort:* 61 effects; 32 shared requirements applied (signed in,
    fields valid, exists, author); 15 on an input; 17 on the situation — 10 an instance
    being there, 3 a value not taken, 2 whose it is, 2 the wire's wrapper. None turns a
    flow: this target cannot try the sort.
- **Conduit read a second time** (2026-11-24, `targets/conduit-read-2`, the specification
  phase alone on a copy keeping `target.yaml` and `interfaces.yaml`, `c6e0355`, 1.97 USD,
  22 sessions, every gate passed at its first round;
  `targets/runs/2026-11-24-conduit-read-2/`). The floor of a comparison of two readings.
  - *The gate, with readers:* 0 input unplaced of 37, seven triggers write the places of
    a wrapped body; nine more write `sends: {}`. The wrapper is still read three ways: an
    input of its own (`comment`), a requirement `on` a field it holds, a requirement on
    nothing.
  - *By name:* structures 4 of 4, fields 28 of 28, inputs 36 of 38, states 4 of 6;
    shared rules 0 of 7, requirements on an input 11 of 15, on the situation 3 of 17,
    effects 17 of 61. A rule's name is no identity.
  - *By what is said*, one pass by the main thread on each rule's sentence cut at 150
    characters, not checked twice: every requirement of one reading is said by the other
    but one (a comment's identifier is a number). Of the effects, 4 of the first have no
    equal in the second (the answer of an unfavorite, of an unfollow, a fresh token on a
    user's update) and 6 of the second none in the first (others' favorites and followers
    kept, the update time refreshed, a new article with no favorite, the comment answered
    with its author, an unknown author gives an empty list). Nothing one says the other
    contradicts. Every effect that stores or removes is in both.
  - *The same said otherwise:* a requirement shared in one reading and the operation's
    own in the other (exists, belongs to, author); one effect against three ("each field
    given replaces") or two against one (tags reused, tags created); a requirement said
    twice, shared and own. Two readings pair claim to claims, never rule to rule.
  - *Not compared:* the triggers (statuses, one refusal named `article-missing` against
    `not-found`), the scope a shared rule applies to, two answers (`User` against no
    structure for follow and unfollow).
- **An operation is not a straight line, by the user** (2026-11-25): a requirement that
  turns the flow asks for a tree. What the files hold already: a requirement always
  refuses; what turns an accepted call is an effect's `when`, free text of that effect
  alone.
- **Kadai's `when`s** (2026-11-25, no agent, no new reading). Kadai is not brought to
  today's layout by a migration: `targets/kadai-src/specimen/roles/` is a reading of
  2026-11-14 — inputs as sentences, a refusal's status inside its rule, no trigger, the
  computed path's `operations/` beside it. It is read again or left; its `when`s are
  read as they are. 93 operations, 397 requirements, 395 effects; 158 effects have a
  `when`, in 62 operations (Conduit: 12 of 61, in 4). Sorted by one pass of the main
  thread, counts rounded: about 80 on an input given or not (a filter, a sort, a page, a
  default, `keepOwner`); about 45 on the state the thing is in (the task claimed or in
  review, already completed, the workbasket empty or holding only completed tasks, an
  entry imported that exists or not); about 20 an item's own outcome in a bulk call; 8
  on how the deployment is set (history enabled); 3 on who calls; 5 a consequence of
  another effect ("at least one task was completed").
  - *Axes, not a tree:* `cancel-claim-task` turns on the task's state and on `keepOwner`,
    two and two, independent; a tree would write one under each branch of the other.
  - *A refusal is one branch of the same cut:* `delete-workbasket` — empty, deleted;
    only completed tasks, marked; else refused. The third is a requirement, the first
    two are effects: one decision on one state, in two lists.
  - *The same state, said in words each time:* claim, force-claim, cancel-claim,
    complete, the transfers all turn on the task's state. The flow is across operations
    — the states of a task and what each operation does from each — more than inside one.
- **The flows of an operation, challenged** (2026-11-25). Put to the challenger: a named
  question of an operation (a *decision*), what it is about, its alternatives, each cited
  by a requirement or an effect in place of its own sentence. **Verdict: not now.** It is
  the computed path's `fact` back under another name and without its condition — a name
  nothing judges, which the roles' reading dropped (ADR-0010) after 74 facts of Kadai
  stayed empty; it would widen what two readings disagree on; a case on a state is a
  state's sentence written a second time (ADR-0025, ADR-0026); a refusal among the
  branches writes an order of checks. The sketch was wrong on its own example: the
  requirement says what must hold (empty or only completed), the case it cited was the
  refused one. Counts checked: 159 `when`s, one on a requirement — the schema allows it,
  the reader's brief does not teach it.
  - *The simpler way it gives:* `on` (ADR-0011) on an effect's `when` too — "this `when`
    looks at this input alone" — a key, no ADR. The weight is then derived: a requirement
    with `on`, light; an effect with no `when`, the straight line; a `when` with `on`, a
    variant of the input; a `when` with no `on`, the flow turns. The flows drawn from
    that, effects grouped by `on` or by the same `when`, refusals as exits apart. First
    step with no target: a pure function of `derive` and a test on `delete-workbasket`
    and `cancel-claim-task` copied to today's layout; if the refusal apart from its
    branch reads badly there, a decision is asked for, and Kadai is read again.
  - *The main thread's reserve:* grouping by the same `when` holds by luck — "the task
    was claimed, or ready" and "the task was in review" are not known as alternatives —
    and "no `on`" keeps together the state, who calls, the deployment's setting, an item
    of a bulk call. To the user.
- **The challenger's first step** (2026-11-25, by the user, no agent): an effect may say
  `on` beside its `when`; the reader's gate holds it to an input and to a `when`; its
  instructions say when it is written. `flowsOf` (`src/derive/flows.ts`) gives an
  operation's exits (on an input, on the situation), its line, its variants by input,
  its turns — tested on `delete-workbasket` and `cancel-claim-task` copied to today's
  layout (`test/fixtures/flows/`, `on` written by hand). No reader has run with it; no
  command shows it.
  - *Read on the two:* `cancel-claim-task` comes apart as hoped — `keepOwner` a variant,
    the task's state a turn. `delete-workbasket` gives two turns and three exits in a
    row: nothing says that "holds no task that is not completed" refuses the third answer
    to the question the two turns answer, nor that `exists` and the caller's role do not.
    Nor that "claimed, or ready" and "in review" are two answers to one question.
- **Which rules answer one question, challenged** (2026-11-25, second round, same
  challenger). Put to it: one key on a requirement and on an effect saying what its
  condition looks at when that is no input — a label of the operation, or a field of a
  structure. **Verdict: neither.** The label is a key, but "same value, same question"
  makes the identity of a question of an operation, a concept with no name and one more
  cut two readings will disagree on. The field falls on the very example
  (`delete-workbasket` turns on the tasks a workbasket holds, a field of nothing), and
  opens the state machine by the side door. A `when` that answers two questions at once
  ("not already completed and no review is required") fits neither.
  - *The simpler way it gives:* `of: <rule>` on an effect — the requirement this effect
    is an accepted answer of. No new name: a rule's name, held by the gate to a
    requirement of the operation or of `common.yaml`. `delete-workbasket`: the three
    effects are `of: no-uncompleted-tasks`, the refusal and its two accepted branches
    read together. A turn with no requirement to name stays grouped by its text. Its
    ceiling: one target per `when`.
  - *Its order:* `force-complete-task` added to the fixtures with `of`, `flowsOf` giving
    two turns each tied to its exit; then a reader run twice on five or six operations
    of Kadai (~1 USD), the partitions compared, the names left out. If two readings do
    not tie the same effects to the same requirements, no key of this kind holds. To the
    user.
- **`of`, the challenger's second first step** (2026-11-25, by the user, no agent): an
  effect may say `of: <requirement>` beside its `when`; the gate holds it to a
  requirement of the file and to a `when`; the reader's instructions say when it is
  written. `flowsOf` tells such effects under their requirement's exit (`accepted`), and
  nowhere else. Three operations of Kadai in the fixtures, `of` written by hand:
  `delete-workbasket` reads — the refusal and its two accepted answers together;
  `cancel-claim-task` — the task's state under `task-not-finished`, `keepOwner` a
  variant; `force-complete-task` — two questions, each under its own requirement, and
  one effect of none ("completed by this call") left a turn.
  - *Not done:* a requirement of `common.yaml` as an `of` (`flowsOf` reads one
    operation's rules and has no exit to hang it on); no reader has run; no command
    shows the flows.
  - *Next, by the challenger:* a reader twice on five or six operations of Kadai, the
    partitions compared with the names left out. It needs Kadai's target, interfaces and
    structures in today's layout first.
- **Six operations of Kadai read twice** (2026-11-25, `07252f0`, default model,
  `targets/kadai-read-a` 1.92 USD with the structures' and the common reader,
  `targets/kadai-read-b` 1.17 USD on A's `structures.yaml`, `common.yaml` and
  `common-trigger.yaml`; `targets/runs/2026-11-25-kadai-flows/`). Kadai's `target.yaml`
  and `interfaces.yaml` of 2026-11-14 parse today; its structures (bounds on fields) and
  its common file do not and were read again. The copies hold neither `specimen/` nor
  `specy/`; `interfaces.yaml` is cut to the six. Every gate passed, three at the second
  round (`many` on a field; `filters` with no place, in both readings).
  - *`of`:* written in one operation of six by each reader, `delete-workbasket` — the
    one the instructions' example looks like — and not the same way: A ties the two
    accepted answers to `no-open-tasks`, B ties "only completed tasks" and leaves "no
    task at all" a turn. In the four operations that turn on the task's state, where the
    fixtures tie the turns to the requirement on that state, neither reader wrote one.
    By the challenger's own test, the key does not hold as taught.
  - *`on`:* `keepOwner`, the one case, the same in both.
  - *`when` itself:* the same in `cancel-claim-task` and `claim-task`. Not in three:
    `delete-tasks` — A five effects each with its `when`, B the same six in the line,
    their condition inside the sentence; `complete-task` and `force-complete-task` —
    "the task is completed" under a `when` in A, in the line in B. What turns the flow
    is not written the same way twice, before any tie.
  - *The same in both:* the requirements on the task's state and on who claimed it; what
    is stored; the two turns claimed / in review. One alone: a review asked instead of a
    completion (B, and A on the forced one only), the history events of a workbasket (B),
    a requirement to read the tasks (B).
- **A rule's name made deterministic: it cannot, and it is not the obstacle** (2026-11-25,
  asked by the user, one agent on Fable at the highest effort, read-only, no agent run of
  exspec; its scripts, its pairing by hand and their outputs under the session's
  scratchpad, `drn/`; the two headline lines run again by the main thread, the same).
  What two readings disagree on is the *cut* — how an operation is divided into rules —
  and a name labels one cut. Rules tied by hand, claim by claim, one pass by that agent:
  of the first reading's rules, one to one with a rule of the second — Conduit 78 of
  129, 47 cut otherwise, 4 alone; Kadai's six operations 58 of 62; Petclinic read by two
  models 11 of 35.
  - *What pairs, inside one operation* (rules given a right equal; pairs, wrong): the
    name 33 of 129 on Conduit, 33 pairs, 0 wrong — always right, rare; the input a
    requirement is `on`, 13 of 15 such; the refusal's name 180 pairs, 107 wrong; the
    place cited, best match, 77, 4 wrong; the sentence, each the other's nearest, 91, 1
    wrong; **the name, then `on`, then the sentence: 97 of 129, 0 wrong; Kadai 58 of
    62, 1 wrong.** Of the rules one to one by hand it finds 74 of 78 and 56 of 58, none
    wrong; of the 32 it leaves on Conduit, 24 are cut otherwise. A name computed from
    keys is as good as its keys: from `on` and a closed list of checks it reaches the
    requirements on an input and nothing else.
  - *Across two code bases:* not measured, the NestJS back end was never read. Routes 19
    of 19, parts of requests 36 of 36, files cited in common 0 of 27: the place and the
    wire do not survive, the operation by its route and `on` do, the sentence is the
    open question.
  - *Its recommendation:* store no identity; a pure function of `derive` pairs two
    readings and says which layer made each pair and what each says alone — as git
    derives a rename; the name stays a label. First step at no cost: its prototype
    (`drn/pair.ts`) moved to `derive` with a test on two of Conduit's operations; then
    ~2 USD, the NestJS back end read with nothing carried, paired with Conduit, scored by
    hand. Killed under 70 % of the rules one to one paired, or over one pair wrong in
    twenty. Under 40 % of rules one to one, the unit to compare is the claim, not the
    rule. To the user.
  - *Its standing:* the truth it is scored against is its own pairing, made once, after
    seeing both readings; one model, a day apart; Kadai's second reading was given the
    first's shared rules.
- **The pairing in `derive`** (2026-11-25, by the user, no agent): `pairRules`
  (`src/derive/pair-rules.ts`) pairs the rules of one operation in two readings — the
  same name in the same list, then the requirements on one input, then each the other's
  nearest sentence — and says what made each pair and what each reading says alone;
  `toldOf` gives an operation's rules with the shared ones it applies. Of the
  prototype's layers only these three: the place cited and the joining of a rule left
  alone are not taken. Tested on `create-user` and `update-article` of Conduit's two
  readings (`test/fixtures/pairing/`). On the whole readings it gives the prototype's
  counts: Conduit 97 pairs (33 by name, 2 by input, 62 by sentence), 32 rules of the
  first alone; Kadai 59 pairs, 3 alone. No command runs it; two operations are paired,
  not two readings — operations are matched by a script outside the repository.
  - *Read on `update-article`:* five pairs, all right; `given-fields-changed` against
    three effects left alone on both sides (the cut); `resource-exists` and
    `target-exists` not paired, their sentences share one word (a miss).
- **Two code bases paired** (2026-11-25, `targets/conduit-nestjs-read`, the specification
  phase only on a copy holding its own `target.yaml`, `interfaces.yaml` and `target/`,
  nothing carried, 1.75 USD; `targets/runs/2026-11-25-conduit-nestjs-read/`, the pairs with
  their sentences in `paired-with-conduit.txt`). The NestJS back end's reading paired with
  Conduit's, operations matched by method and pattern (19 of 19), by a script outside the
  repository. 129 rules against 121: 87 pairs (35 by name, 7 by input, 45 by sentence), 42
  of Conduit's alone, 34 of NestJS's alone.
  - *Scored by hand, one pass by the main thread:* 2 pairs wrong of 87 (an effect on a
    requirement in `follow`; "every tag listed" on "empty when no tag"), 1 doubtful (a
    rule holding two cases on one of the two). About 8 equals missed, half of them the
    shared rule on an anonymous caller, said in two wordings that share too few words. So
    about 93 of Conduit's 129 rules have one equal in the other reading, 85 of them
    found (91 %); the bars were 70 % found and one wrong pair in twenty. Of the rest,
    about 14 are cut otherwise and about 22 are said by one reading only (the shared
    rule on the request's fields, the wrapper rules).
  - *What the pairs show:* differences of behaviour to check in the code, not yet
    checked — the author filter (exact name, the other filters then ignored / partial
    match), the page (offset divided by limit / at most 20, offset skipped), following
    oneself refused by NestJS only, a username already used refused by NestJS only, the
    login's inputs checked by Conduit only, an unknown tag filter ignored by Conduit only.
    Four of the six sit in a pair made by name, whose sentences differ.
  - *Checked in the code of both, by reading, nothing run:* the six are in the code, none
    is of the reading. Three were said short of what the code does: Conduit's page is
    offset divided by limit, so an offset under the limit skips nothing, and it has no
    cap; NestJS adds its filters together where Conduit takes the first given; a
    username already used is not refused by NestJS but breaks on the store's unique
    constraint, unhandled (its reader wrote the requirement and said so in `unsure`);
    NestJS's login checks no input and answers every bad one as wrong credentials.
  - *Its standing:* one reading of each, one model, scored once by who built the pairing.
- **An agent that says how two readings differ, the challenger's verdict** (2026-11-25).
  Put to it: a command pairing two extractions and a role judging each pair `same` or
  `differs`. *Verdict:* the direction holds, not that form. What is judged is the whole
  operation, the pairs given as a hint — what tells a same behaviour from another often
  sits across a pair and a rule left alone (`delete …/favorite`: the idempotence is in the
  paired rule on one side, in a rule alone on the other; the feed's page: all of it in
  rules left alone, and "cut otherwise" had no way to also say "and differs"). A
  difference read in sentences is a lead, not a finding; only the proof on both sides
  makes it one, and comparing the rules held on both sides carries nothing. No concept
  and no ADR while nothing is kept but a run's output; `Difference` is already a name of
  the proof. *First step:* a prompt by hand, per operation, on Conduit read twice and on
  Conduit against NestJS. *Given up if:* fewer than 5 of the 6 known differences found,
  or the double reading gives more than a third of the `differs` of the two code bases,
  or under half of the new `differs` are in the code.
- **Two readings compared by an agent, by hand** (2026-11-26, two agents of the session,
  no command; prompt and inputs in `targets/runs/2026-11-26-compare-by-agent/`). Per
  operation the agent is given the rules of both sides, whole, the pairs as a hint, no
  code, and not told whether the two are one system; it answers `differs`, `only-A` or
  `only-B`, each `sure` high or low.

  | | Conduit read twice | Conduit / NestJS |
  |---|---|---|
  | differences said | 5 | 21 |
  | of them sure | 1 | 9 |

  - *The three bars are cleared:* the six known differences are all found (five sure, the
    login unsure); the double reading gives 5 against 21, under a third; the 15 others
    are all in the code, read by the main thread — blank against empty (`@NotBlank` /
    `@IsNotEmpty`), the wrapper refused by Conduit only, offset and limit typed by Conduit
    only, a field given empty on an update refused by NestJS only, unfollowing oneself.
  - *What `sure` tells:* the 9 sure ones between the code bases are real; the one sure on
    the double reading is the two readers disagreeing on the list's page (one wrote
    "starts after the first offset articles", which the code does not do) — a reader's
    error found, not a behaviour. The unsure ones cannot be told apart: 12 real on one
    side, 4 false on the other, the same kind (one side silent).
  - *Its standing:* one run of each, checked by reading by who wrote the prompt; NestJS's
    checks on a nested body are read in its code, not seen to run.
- **The same comparison without the pairs** (2026-11-26, same prompt less its sentence on
  the hint, same rules, two agents). Conduit read twice: 2 differences, none sure (5 and 1
  with the pairs). Conduit / NestJS: 17, 9 sure (21 and 9) — the same nine, and the six
  known ones found alike. The unsure ones move from one run to the other: the four on the
  wrapper and the field given empty on an article's update are gone, one false one comes
  (a refusal read in the shared rule's sentence, that the update does not make). The
  pairs given as a hint change nothing that is sure: `pairRules` is not needed by the
  comparison. It is removed, with its test and fixtures; the commit that added it holds
  it (`ced7433`), and the scripts of the runs that import it no longer run as they are.
- **`of` removed** (2026-11-26, by the user): an effect no longer says the requirement it
  is an accepted answer of — two readers wrote it in one operation of six, and
  differently. The schema, the reader's instructions, its findings and `flowsOf` are as
  they were before it; an effect's `on` beside its `when` stays.

## Backlog

Read after the four runs: a rewrite is held to the specification by commands that exist —
the extraction carried first, the target's phase, then two turns of `roles record` and
`roles judge`. What is left, to discuss with the user one by one:

1. **An input with no place**: the gate finds it; left, Conduit's six operations read
   again, their scenarios built again, and the requests counted. With it: an input that
   is the wire's wrapper, and a rule named after it.
2. **The scenarios built again from the rules alone**, on the second target, set against
   the carried ones rule by rule — the fourth case. The builders' cost; the judge's floor
   is 7 verdicts of 162.
3. **A base URL set against carried interfaces.** A check: the base URL's own path is the
   start of every pattern. Where it is run is to settle.
4. **A rule's verdict on two implementations.** The table is a script outside the
   repository; which command shows it is the user's.
5. **The procedure is written nowhere.** What is carried, what is not, the two turns; the
   README's claim on a rewrite given its standing.
6. **To `docs/backlog.md`, each to pick up cold:** the starting state — 3 scenarios of
   162 here, 67 of 94 on a target whose seed draws its identifiers; the wire of a
   rewrite, the references compared and read with their judgement; a trigger that holds
   a defect of the first target; a judge that moves 7 verdicts of 162 between two
   readings of the same answers; what is not HTTP — a batch, a file, a screen — for a
   rewrite from another stack.
