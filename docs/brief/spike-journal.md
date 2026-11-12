# spike/recorded-cases — the oracle as recorded cases, no clause, no construction

Opened 2026-11-10 from `feat/realworld-extraction` (`e28ae4d8`), whose Journal reads 9 of
Conduit's 19 operations proved after four benches and $52, 23 clauses `inexpressible`.

## Frame

**Goal.** Prove or refute, on Conduit, that the promise — a deterministic oracle built by a
characterization phase, examples per use case exercising the business rules, reproducible —
holds with no `ensure` and no construction from predicates: a *case* is a scenario of API
calls from the seed (set-up steps, then the judged call); the old system's answer and the
row-level difference of every table are *recorded*, never predicted; noise is what differs
between two recordings from the same seed; coverage is measured on the old system's code.

**It holds when**, on Conduit (`examples/realworld/`, checkout `sample-projects/realworld-spring`
at `d8f34f0`):

1. *Reproducible* — every case recorded twice is equal once the noise is masked, and three
   further replays on the unchanged target are green.
2. *Says what the spec could not* — a green case for each of: log in with the registered
   password, a slug computed from a title, a list's order and page, a count
   (`articlesCount`, `favoritesCount`), an optional field left out of an update and kept.
3. *Detects* — mutants injected in Conduit, several of them in those zones, each turn red a
   case of the mutated operation; the survivors are named.
4. *Measured* — 19 operations of 19 with a case; JaCoCo branch coverage of the application's
   code by the cases, the branches no case reaches listed.
5. *Cost* — wall time of a record and of a replay; the agent's cost of writing the scenarios.

**Non-goals.** The rule layer as predicates checked on the recorded cases (second step, if
the first holds): the spike prints an index grouped by status and effect signature only. A
rewrite with another schema. Any change under `src/`: the spike lives under `dev/spike/`.

## Journal

1. **2026-11-10 — item 1, the harness (opus, `6ab1f9be`).** `dev/spike/recorded.clj` (the
   target: steps, refs, the seed image with every sequence's state, restore, the tables read
   whole, `record`, `replay [--up] [--json]`) and `dev/spike/cases.clj` (pure: the row
   difference, the noise, the comparison, the index; `selfcheck`), 391 lines, reusing
   `io/db`'s `image` / `restore!` and `io/compose` unchanged. Four cases on Conduit: record
   13.4 s, 0 unstable; two replays 4/4 green, 11.8 s each, stack up and down included; a
   slug edited in a copy of `recorded.edn` turns its case red on that path. The noise found
   by the two passes is the JWT, the bcrypt hash and the timestamps; no id (the sequence is
   restored). `log in with the password just registered` is a green case — the first of the
   five the spec could not say.

   **A limit of the double run, met at once:** the JWT's `exp` is in seconds; two passes
   within one second recorded the token as a constant. The implementer put 1.1 s between
   the passes (`ponytail:`). A value that moves with a coarser clock — a date, an expiry in
   days — is still recorded as a constant and turns red later: the double run finds the
   noise of *this minute*. The honest fix is a second pass under another clock (the
   target's clock shifted, as Keploy's time freezing does), not a longer pause. Open.

2. **2026-11-10 — item 2, the scenarios (sonnet, `2ff06e2f`).** One agent, the target's
   code and tests and `dev/spike/` only — no doc, no spec, no knowledge of the mutants; told
   to write one case per rule it reads and to choose inputs that tell a rule from its
   plausible variants. **166 cases, 19 operations of 19**, in 13 min 42 s of wall clock and
   156 k tokens, one session. `record`: 0 unstable, 36.3 s. Three replays, each on a fresh
   stack: **166 green / 0 red, 18.2–18.4 s** (the stack's up and down included).

   The five things the last Conduit spec wrote `inexpressible` are each a green case: log
   in with the registered password; the slug of a title (and "!!!" stored as slug `""`, a
   second one then refused as a duplicate); the page — `offset / limit` rounded down, not a
   skip —, the order, the filters' precedence (author, then tag, then favorited; an unknown
   tag falls through); `articlesCount` of the filtered articles, not of the page; a field
   left out of an update kept — *said too fast for the last one: see Journal 4, mutant M5*. Things no spec of the four benches stated, read off the
   recording: a username is not unique; the email's uniqueness is exact-match; a title
   update never changes the slug; a user follows herself; deleting an article takes its
   comments, favourites and tag links, the tags stay; `PUT /user` ignores a password.

   **Three defects of the method, found by replaying:**
   - *The noise of one stack is not the noise of the next.* Two passes on one stack share
     the seed's timestamps and salts: the first replay on a fresh stack had 62 reds.
     `record` now takes its two passes on two stacks.
   - *Two runs do not find every noise.* A JVM identity hash inside a validation message
     (`Pattern$Flag;@36f731bb`) was equal on the two recording stacks and differed later: 3
     cases red on 2 replays of 3. Fixed by a hand-written scrubber (`;@<hex>` → `;@hash`) —
     the first of what would be a list. N recordings narrow it, none closes it.
   - *A case's name is its key*: two cases of one name collide, undiagnosed.

   **What the recording cannot tell, by the target's doing:** every 403, 404 and 500
   answers 401 with no body. The cases for "not the author", "unknown article", "a comment
   under another article's slug" are recorded — status 401, no row changed — and are equal
   to one another: a rewrite that swaps two of these rules is green. The spec had the same
   blindness (item G of the realworld Journal) and said it; here only the branches reached
   tell them apart (item 3).

   **The index groups too coarsely for reads:** `GET /articles`' 23 successful cases are
   one line, "200 · no effect". Status and effect signature class the writes; a read's
   class is in which branch answered — the rule layer needs the coverage, or a predicate.

3. **2026-11-10 — item 3, coverage by case (sonnet, `356e82cd`).** JaCoCo 0.8.16 in
   `tcpserver` mode, a dump with reset around each judged call (52 s for the 166 cases);
   `dev/spike/conduit/coverage.md`. Of `io.okami101.realworld`: lines 314/549, branches
   47/78 — 199 of the unreached lines run once at boot or never (wiring, the CLI seeder,
   `main`). **No line of a service, a DTO, a controller or a validator is unreached.** The
   39 lines no case reaches are the framework's answers in `CustomizeExceptionHandler`
   (no handler found, method not supported, media type not supported, a missing
   parameter, `ConstraintViolationException`) and one branch of `JwtTokenFilter` — the list
   an agent would be handed.

   **Line coverage does not class the cases and does not prove a rule is judged:** 159 of
   the 166 cases cover no line of their own, and the mutant that survived (M5) sits on a
   line 8 cases execute. Same finding as Fineract's mutation spike (all 24 mutated lines
   executed, 0 of 10 killed where no clause reads). Coverage gives the *unreached* list;
   whether a reached rule is judged is the mutants' to say.

4. **2026-11-10 — item 4, sixteen mutants (sonnet `356e82cd`; M2, M13, M5 rerun in the
   thread).** The mutants were fixed by the main thread before the scenarios were written
   and never shown to their writer (the list: `dev/spike/conduit/mutants.md`, one patch
   each). Control, the unpatched source rebuilt: 166 green. ~28 s a mutant (build 7 s,
   replay 7 s).

   | | |
   |---|---|
   | killed on the first recording | **15 of 16** |
   | of them, killed by the row difference alone (M8: the answer unchanged, the password column rewritten) | 1 |
   | of them, their own seed refused (M2 slug, M13 tag) — replayed on a database seeded by the unpatched app: 16 and 4 red | 2 |
   | survived | 1 — M5 |
   | the main thread's four predicted survivors (M3 page, M4 count, M11 precedence, M16 direction of a follow) | all killed: the agent had built the page, the one-way follow, the two filters |

   Every kill names a case of the mutated operation and the path that differs
   (`log in with a wrong password: [:response :status] 400 -> 200`; `page an author's
   articles: [:response :body :articlesCount] 2 -> 1`).

   **M5, the survivor, and the loop that closes it.** `setBio(userDto.getBio())` for
   `ifPresent(setBio)`: a bio left out of an update is wiped. Eight cases execute the
   line; alice has no bio in the seed, so left out and null answer alike. Journal 2's "a
   field left out is kept" was true of the email and the name only. The survivor handed to
   a fresh agent as the campaign would print it (file, method, the two lines, "executed by
   8 cases, none red"): 1 min 52 s, 61 k tokens, one case added — a bio and an image set
   in `:setup`, then an update of the name alone — the siblings checked and found judged
   (`0ecfb93c`). Re-record: 167 cases, 0 unstable, **no existing recording changed** (43
   lines added, 0 removed — the record is deterministic across two more stacks). M5
   replayed: 1 red, `update the username after a bio and an image were set:
   [:response :body :user :bio] "I write dragons" -> nil`, and the same on the row.
   **16 of 16.**

   What this does not show: sixteen hand-picked first-order mutants, by someone who had
   read the code, are not a mutant generator's whole set; a rule the three of us (the
   mutants' author, the scenarios' author, the coverage) all missed is invisible to this
   measure. Conduit is 2 400 lines with no clock rule, no asynchronous write, no external
   call.

5. **2026-11-10 — the challenger (opus) on the evidence: holds under named conditions, on
   Conduit only; criteria 1 and 3 overstated.** Checked in the artefacts:
   - *23 of the 167 recordings are one recording.* 37 answers are a 401 with no body; 14 are
     about the token; the other 23 carry a `:rule` of "not found" or "forbidden" ("Only the
     author updates an article", "A slug nobody has is not found") and are recorded alike —
     401, no body, no effect. Four of them freeze a crash under a hollow rule (`limit 0`,
     `limit -1`, `offset -2`, an article without a tag list). **Nothing checks a `:rule`'s
     text**: a recording proves a behaviour is reproduced, not that a rule is judged.
   - *The noise mask is a wildcard per leaf*, in `:before` and `:after` separately: the
     invariant "unchanged" of a noisy column is lost. `users.password` is masked on both
     sides in the 8 cases where a `users` row changes, `created_at` in every `:changed` of
     `articles` and `users`. M8 dies by one case only — the one where nothing else moves; a
     kill by luck of coverage.
   - *The comparison*: no false green found (a missing key is red, lists compared whole);
     but no response header is recorded, and of a set-up step only the status.
   - *Reproducible, until 2026-12-02*: the binding's two JWTs expire then; every `:caller`
     case turns 401, and a `record` run after that says "0 unstable" on a hundred hollow
     cases — nothing stops a recording from changing its class of status.
   - *16 of 16 is circular for M5*: killed by a case written after seeing it.

   What the Journal had not said: the noise is a joker, not a relation — a value derived
   from the clock is frozen (red tomorrow) or masked (the rule gone), where ADR-0118 makes
   the clock a replayable input: "due = disbursed + 30 days" cannot be said. The restore
   reaches the database only: an in-memory id pool, a second-level cache, a Spring cache
   survive it and make a result depend on the order of the cases (Conduit has none). The
   seed goes through the target's API (M2, M13 broke the world before any case). A
   legitimate change re-records everything, a diff of 3 600 lines with no unit of review
   under the case, where a clause changes by a line. A business person reads `:rule`,
   which nothing checks.

   First thing to break elsewhere: Fineract's repayment schedule depends on the business
   date — two stacks the same day freeze the dates, two different days mask them all; its
   audit table takes a timestamped JSON per write; ~250 tables read twice a case. KADAI:
   asynchronous jobs, a working-day calendar. Petclinic's cascade probably passes.

   Its conditions: **noise as a relation** (a noisy column keeps its equalities — before
   and after, to a reference date — never a joker per leaf); **the target's clock held**
   (replay at a fixed date, not a second pass); **a case's identity checked** (two cases
   of different rules differ by their recording or by the branch covered, else the case is
   marked hollow); **a restore past the database**. And: **the rule layer is necessary to
   the promise, not to the review alone** — "exercises the rules and can prove it" needs
   each case tied, checkably, to the rule it claims.

   Eight mutants it predicts alive (C1–C8: the session time's unit, a password rewritten
   on a rename or a bio update, `created_at` rewritten on an article update, `updatedAt`
   answered as `createdAt`, the feed's default limit, a password's maximum length, the
   header's scheme word) — run in Journal 6.

6. **2026-11-10 — the challenger's eight, noise as an equality class, cases of one
   recording (opus, `107931cb`).**

   *The eight on the recording as it was* (wildcard noise): **6 survive of 8** — the
   challenger was right. The two killed die beside their rule (C3 by `updated_at` moving
   on an update with nothing to change, C6 by the bound printed in a validation message).

   *Noise as a relation* (`cases/tokens`): a noisy leaf is recorded as the token of its
   equality class inside the case — `[:spike/noise 1]`, `[:spike/noise 2]` — so "the
   password after equals the password before" and "`updatedAt` differs from `createdAt`"
   are recorded; a class the two passes disagree on falls back to the wildcard. Re-record:
   167 cases, 0 unstable, 345 noisy leaves as tokens, **0 as the wildcard**; three replays
   on fresh stacks 167 green; control green. The sort of a keyed table's rows no longer
   reads a noisy value.

   | | wildcard | equality classes |
   |---|---|---|
   | M1–M16 killed | 16 | 16 (M8: 1 red case → 7) |
   | C1–C8 killed | 2 | **5** (C2, C4, C8 added: `password [:spike/noise 3] -> [:spike/noise 5], observed "x", should equal :before`) |
   | survivors | C1, C2, C4, C5, C7, C8 | **C1, C5, C7** |

   The three left: **C5** (the feed's default limit 20 → 2) and **C7** (the header's scheme
   word) are missing cases — a feed with no `limit` over three articles, a call with
   `Bearer` —, the loop's to close as M5 was. **C1** (the session's length, ms for s) is
   out of a recording's reach: the expiry is inside an opaque noisy leaf and every token is
   used within seconds. It needs the target's clock moved, or a reader of the token.

   *Cases of one recording* (`dev/spike/conduit/identity.md`): 26 groups of identical
   recordings hold 66 of the 167 cases. The lines covered by the judged call tell 41 of
   them apart; **25 cases, in 12 groups, are indistinguishable by recording and coverage
   both.** Some are honest duplicates (`delete an unknown article` ≡ `delete an article
   twice`); some are two rules the target answers alike through one line (`get an unknown
   article` ≡ `a slug in another case`); some are a case that does not exercise its rule
   (`page with an offset that is a multiple of the limit` ≡ `… not a multiple`; `list
   articles of an author` ≡ `by author and tag` ≡ `by author and favorited` — yet the
   latter kills M11: the mutant tells apart what coverage does not).

7. **The effect read back through the API** (`5b0a7131`; `dev/spike/conduit/reads.edn`,
   `reads.md`). The user's ruling: the database is an internal contract, what the API
   exposes is the contract; the row difference stays as the **detector** of what an
   operation touched (events published and calls to third parties will join it), and what
   is **judged** is what the API reads back. So a link *table → the calls that expose it*
   (`reads.edn`, written from the controllers before any mutant ran, never changed after):
   parameters from the touched row, the callers who read, and a **probe** where no read
   exposes a column (a log-in with a seed user's password). A case that writes is played
   twice — once to learn the touched rows, once with the reads before and after the call.

   167 cases, 0 unstable, 40 cases with reads, 279 reads played, no table touched without
   an entry, no read that changes a row; three replays on fresh stacks and the control
   green. Record 55.7 s (was 36), replay 27 s (was 18), a mutant 32–45 s (was 28).

   | the oracle judges | killed of 24 | not killed |
   |---|---|---|
   | response only | 17 | C1, C7, M8, C2, C8, C3, C5 |
   | response + rows (Journal 6) | 21 | C1, C7, C5 |
   | **response + reads (the API only)** | **21** | C1, C7, **C3** |
   | response + reads + rows | 22 | C1, C7 |

   The reads win back M8, C2, C8 (the log-in probe: 200 → 400 after a `PUT /user`) and
   win **C5**, which the rows never saw (the feed read after an article is added: three
   articles become two). They lose **C3** — a `PUT` that changes nothing rewrites
   `updated_at`: in the clean recording the case touches no table, so no read is recorded
   for it, and the replay plays the recorded reads. Deriving the reads at replay from the
   mutant's touched rows would kill it and make the API verdict depend on the rows; the
   other way is to read what the call *names* (its slug) whatever it touches. Not done:
   a read added after seeing a mutant is the oracle fitted to its test.

   No write the API does not show: each of the 40 cases with an effect has a read that
   differs before and after. What the item added to the hand-written list: **a JWT is
   always the wildcard** (its `exp` is in seconds, so two tokens of one case are equal or
   not by chance — 6, 1 and 4 reds on three replays before the rule). One replay per
   mutant; reads played as alice, bob and anonymous only.

8. **A writing call reads back what it names, touched or not** (`a25ac08d`). The user's
   choice for C3: the table-triggered reads cannot be triggered by "nothing must change",
   so every operation that is not a GET also gets the reads of the resource its call names
   (`reads.edn` › `:operations`, the 12 of them, written before the mutants ran; three
   name nothing: a register, a log-in, an article not yet created). 76 cases with reads
   (was 40), 36 of them touching no table — a refused write now records "nothing moved"
   through the API; 379 reads played; 0 unstable, three replays and the control green.
   Record 66 s, replay 33 s, a mutant 39–55 s.

   | the oracle judges | killed of 24 | not killed |
   |---|---|---|
   | **response + reads (the API only)** | **22** | C1, C7 |
   | response + reads + rows | 22 | C1, C7 |

   **The rows no longer kill a mutant the API does not.** C3 dies on
   `GET /articles/{slug}`: `updatedAt` one token before and after in the recording, two
   values under the mutant (checked by running it, not inferred). The `PUT`'s own answer
   stays green: its `updatedAt` and `createdAt` are two classes and stay two. Left open: a
   refused create (`POST /articles`, `POST /users`) names nothing, so it shows nothing
   when it touches no table.

9. **The rule layer: a rule is a condition evaluated on a case's situation** (`06aeac25`
   the evaluation, `0beca2af` the rules; `dev/spike/rules.clj`, `conduit/rules.edn`,
   `rules.md`, `rules.first.md`, `rules.README.md`). Per operation an ordered list of
   rules, the first whose condition holds classes the case; the condition reads the call,
   its caller, GETs played before the call, and — flagged *internal* — rows, when no read
   exposes the fact. It builds no world and predicts nothing: a rule's consequence is the
   *outcome* its cases recorded (status, tables touched by count, paths that differ in the
   reads). A sonnet session wrote the rules of the 19 operations from the code, before
   reading any case (about 2.5 min of writing; `classify` 27 s).

   | | rules | cases classed | exercised | shown | judged by a mutant | internal |
   |---|---|---|---|---|---|---|
   | rules frozen, no case seen | 71 | 167 | 67 | 70 | 9 | 13 |
   | after corrections the code supports | 80 | 167 | 77 | 79 | 9 | 14 |

   *What holds.* Every case is classed. On the favourite, the two bodiless 401 (no token,
   unknown article) fall under two rules by a read before the call, with no row read. Four
   conditions of 80 read rows (an email is exposed by no GET, three times; a tag's
   existence, for want of "contains").

   *What does not.*
   - **16 rules are `:inexpressible`** in a vocabulary of equality and order: a pattern
     (an email, ×3), a length, a number parsed from a string, arithmetic on a page,
     membership in a read's list, the caller's id, a raw token's validity — and two that
     need a value the target computes (the slug of a title, the check of a hash). Their
     cases fall into an `otherwise`: **9 rules have more than one outcome**, and about 30
     cases sit under a rule whose sentence is not theirs.
   - **A raw token is a hole of the harness**: `[:caller]` is `:token` for a garbage token
     and for a valid one, and a read "as the caller" is then anonymous — four cases
     classed `anonymous` wrongly.
   - **9 rules of 80 are judged**: 24 hand-picked mutants are too few to say a rule is
     judged; "shown" (an outcome that differs from another rule's) is weak — 48 pairs of
     rules of one operation share an outcome, most of them the target's 401 for every
     refusal, some the outcome's coarseness (counts and paths, no value).
   - **The 12 groups of indistinguishable cases**: 9 "same rule", 3 "different rules" —
     not to be trusted yet: two of the three differences are the raw-token hole, and two
     of the nine duplicates are rules the vocabulary could not write (an offset that is
     or is not a multiple of the limit; an author and a tag together, which M11 tells
     apart).
   - 3 rules have no case (a feed with a limit of 0, an article whose author the reader
     follows, an image given alone): the layer's first findings about the cases.

   Two harness defects fixed by the rules' writer: `classify` refused the
   `:inexpressible` key; a set-up step without `:as` was not played in `classify`.

10. **Five operators, a closed list, and the raw token** (`70a3f1f9`; the state before is
    `rules.second.md`). A read "as the caller" now carries the call's raw token. Added:
    `:matches`, `:length`, `:number`, `:contains`, integer arithmetic — and nothing else,
    so that what is left says whether the vocabulary settles.

    | | before | after |
    |---|---|---|
    | rules | 80 | 90 |
    | `:inexpressible` | 16 | **5** |
    | rules with more than one outcome | 9 | 6 |
    | cases under a rule whose sentence is not theirs | ~24 | ~12 |
    | conditions reading rows | 4 | 4 (the tag became a read; an unknown comment id came in) |
    | rules with no case | 3 | 4 |
    | judged by a mutant | 9 | 8 |
    | pairs of rules of one operation with one outcome | 48 | 61 |

    **The five left**: two need a value the target computes (the slug of a title, the
    check of a hash); three need a walk over a list a read answers — some element not
    contained in another list, the ids of a list, the element whose id is the path's. A
    quantifier would write those three, and the vocabulary would then be a query language.
    The four raw-token cases class as their sentence says; of the 12 groups of
    indistinguishable cases, 9 are one rule, 3 are two rules told apart by the condition
    alone (one of them the offset that is or is not a multiple of the limit).

    **What the operators brought with them**: conditions that write the target's own logic
    again — a regex that approximates the framework's email check, the default page size
    `20` as a literal, three failures of a page folded into one rule because all three
    answer 401. A wrong condition does not make a false red (the recording judges, not the
    rule): it misclasses a case, and a rule with several outcomes is how that shows.

11. **Is each rule guarded — one mutant per rule** (opus; `cf905e54` the mutants,
    `55c087c7` the runs; `dev/spike/conduit/guarded.md`, `rule-mutants.edn`). One agent
    wrote a patch per rule from the target's code and `rules.edn` alone — 95, the five
    inexpressible rules included — and committed them before reading a case. Control
    167 green; 45–60 s per mutant, 5204 s for the list. A rule is *guarded* when a case
    classed under it goes red through the response or the readings.

    | verdict | rules |
    |---|---|
    | guarded | **79** |
    | guarded by rows only | 0 |
    | killed elsewhere | 0 |
    | unguarded | 7 |
    | no case | 9 (4 rules without a case, the 5 inexpressible) |

    **The seven survivors are one finding**: the `anonymous` rule of seven routes (`GET
    /user`, `PUT /user`, `POST /articles`, `PUT` and `DELETE /articles/{slug}`, `POST`
    and `DELETE` of a comment). The patch opens the route to anyone; the handler then
    fails on a null caller, and Conduit answers any failure of an anonymous request with
    the same bodiless 401. The mutant changes nothing the API shows: equivalent mutants,
    not missing cases — a mutant that lets the anonymous caller *succeed* is the one that
    would tell. Where the handler does not fail on a null caller (follow, favorite, feed)
    the same patch is killed.

    **What it also showed.** Four of the five inexpressible rules' mutants turn red
    exactly the case written for them: the cases exist, the classing cannot attach them.
    `PUT /user › image` has no case because its two cases also carry a bio or a username
    and the first rule wins — the fields of an update are not alternatives, and "first
    match" misfits them. 31 guarded mutants also turn red cases of other rules, most
    through a set-up (a follow, a favorite or a comment that is no longer written reaches
    30–69 cases). Not shown: that a condition's boundary is right — every mutant removes
    or inverts a check, none moves a bound — and the mutants are an agent's, one per
    rule, not a blind sample.

    Harness: a set-up reference a mutant leaves unresolvable now turns the case red
    instead of stopping the pass; open — `seed.sh` takes `GET /profiles/alice` = 200 for
    "already seeded", which a mutant can fake (R021, reseeded by hand).

12. **The spike takes the metamodel's shape** (opus; `ea9049fc`, `871e3732` the names,
    `884d7c62` the side effect, `2e581f29` the operations, `66e0ee85` the structures,
    `d083ee4c` the proof; `dev/spike/metamodel.edn` is the model). What Journal 1–11 call a
    case, a set-up, a recording, an effect and a read are from here a scenario
    (`:prepares`, `:judges`), the reference, a side effect and a reading; `recorded.clj`
    is `harness.clj`, `cases.clj` is `observation.clj`.

    - **A side effect detects, it is not judged**: the verdict comes from the response and
      the readings; a side effect that differs while they agree is `:unseen`, reported
      apart. Clean replays: 0 unseen. No mutant is seen by the rows alone.
    - **An operation is an intent reached through a trigger**: 19 idents (`register` …
      `list-tags`); a call names its operation and its parameters; a scenario's operation
      is its judged call's. Every call matched a trigger.
    - **`structures.edn` replaces `reads.edn`**: six structures (User, Article, Tag,
      Comment, Favorite, Follow), each held by tables of the database and read through
      projections; `mutates.edn` is derived from the reference.

    **The proof, without rerunning the 119 mutants** (the user's call: too long). Control
    167 green on the final code. The new reference against `recorded.edn` at `11aeb9d9`,
    keys mapped: 167 scenarios, 379 readings with the same requests, zero differences.
    The mutants' verdicts derived from the committed result files under the new judging:
    22 of 24 through the API, 79 guarded · 7 unguarded · 9 no scenario — none moved. Five
    mutants rerun end to end (M1, C3, R010, R028, R085) match the derivation scenario by
    scenario. So six runs on the final code, 113 mutants standing on the equality of the
    two references.

    **Where the model and the code disagree** — the model is the user's to change:
    the code needs, and the model lacks, a scenario's `says`; a call's query, credentials,
    alias and reference to a prepared call; the prepared calls' statuses in an
    observation (they are judged); `unseen` on a report; the place (a table) where an
    observable holds a structure; parameters and readers on "read through"; a reading of
    what a call names, touched or not; a catalog of interfaces (`GET /articles/{slug}`
    is a trigger and a projection, stated twice). The model has, and no code uses, the
    Message interface, the Service, Bus and FileSystem observables, the twin state, and
    observations kept (only the reference and the reports are).

    Left: `mutants.md` in the old words; `seed.sh`'s "already seeded" test; step 4 took
    3 h of 4, on a machine at load 20–40 (the app over 3 min to start, a record failing
    twice on the healthcheck).

13. **A page to inspect the result, and the interfaces stated once** (`6313c543` the
    model, opus `2b017b64` the page, sonnet `55caebd0` the catalog). The user took seven
    of the eight disagreements of Journal 12 into `metamodel.edn` (a scenario's `says`; a
    call's query, caller, alias and references; the prepared statuses; `unseen`; the
    place; parameters and readers on "read through"; what a call names) and decided the
    eighth: a catalog.

    - `clojure -M:dev -m spike.inspect <out.html>`: one static page from the data files,
      the same files giving the same bytes — target, operation (its rules in order, each
      with its verdict and its mutant), scenario (prepared calls, the judged call, the
      response, readings before and after, side effects apart), mutant (red scenarios,
      expected and got), structures, interfaces. What the files could not give it: a
      prepared call's response is not recorded, only its status, so a token taken from
      one stays symbolic; the 24 first mutants belong to no rule and have no view; a
      noise class reads `masked #101`.
    - `interfaces.edn`: 19 interfaces read from the controllers' mappings (Conduit's
      checkout has no OpenAPI file); `operations.edn` and `structures.edn` name them.
      19 triggers, 9 projections on 8 interfaces, 8 interfaces with both roles, **none
      with no role**. Proof: the requests built before and after are byte-identical;
      control 167 green, 0 unseen. Not checked: the catalog against what the running
      target serves.
    - The order of each scenario's readings is the same in `recorded.edn` at `11aeb9d9`
      and in the reference (0 of 167 differ): a result file's `readings <index>` reads
      right against today's reference.

14. **A second target, end to end: Petclinic** (opus; `08628ae6` the harness, `96460e57`
    the files, `7d14626a` the mutants, `6226bd5c` the runs; `dev/spike/petclinic/`).
    spring-petclinic-rest at `afc8fc1`, security off, the application's own seed. One
    agent wrote everything from the code and the target's tests in about 30 minutes,
    owing nothing to `examples/petclinic*`; a second, which had not read the scenarios,
    wrote the mutants.

    | | Conduit | Petclinic |
    |---|---|---|
    | interfaces (with no role) | 19 (0), from the controllers | 37 (0), from `openapi.yml` |
    | operations · structures | 19 · 6 | 37 · 7 |
    | scenarios (unstable) | 167 (0) | 183 (0) |
    | record · replay | 36 s · 18 s | 48 s · 23 s |
    | rules + inexpressible | 90 + 5 | 134 + 9 |
    | guarded | 79 | **108** |
    | guarded by rows only · killed elsewhere | 0 · 0 | 1 · 1 |
    | unguarded | 7 | **0** |
    | no scenario | 9 | 33 |

    119 patches for 143 rules (24 rules share another's constraint), none failing to
    build, 35 s each, 72 min. **No rule is unguarded.** The 33 without a scenario: the 9
    inexpressible (each mutant still turns red the scenarios of its own situation); 6
    "empty list" rules the seed never meets; 2 inputs no scenario sends; 16 `too-long` /
    `incomplete` rules of the update operations with no scenario classed under them —
    several of their mutants turn red scenarios classed under a sibling rule, so the
    classing or the conditions are suspect there, not looked into. *Rows only*: an
    existing user's password replaced — no interface shows a password. *Killed
    elsewhere*: `update-owner › incomplete`, whose one scenario (no body) is refused
    before the constraint is read.

    **What the harness needed** — four fixes, no rewrite: identity columns' sequences
    restored (`pg_sequences`), a target with no seed step, two scenarios of one name
    refused instead of merged, Conduit's 24 mutant ids no longer hard-coded. Request
    building, noise, readings, rules, the restore, `structures.edn`'s terms: unchanged.
    The mutant runner is a sibling script (Maven, `git apply -R` on a checkout that is
    not clean, a build context outside it).

    **What the shapes could not carry**: an order the target does not determine (two
    pets of one owner with one name come out in a JVM draw — two recordings agreed by
    chance, three replays were red; the scenario was replaced, the case is not in the
    reference); a structure with no projection (User); rules that are no branch of the
    code but a constraint the save enforces; nine inexpressible rules (an absent body, a
    quantifier, the target's clock, a count of distinct elements).

    **What the recording showed of the target**, none of it in its tests: a visit
    without a date is accepted and its pet and owner then answer 500; an id in the body
    of an add overwrites that row with 201; the owner in the path is ignored (another
    owner's pet updated, 204); adding an existing user replaces its password.

    Not shown: that a mutant breaks its rule only; the 24 `:same-as` rules stand on
    another rule's mutant; no coverage run, so `identity.md` tells nothing apart.

15. **A structure is what its projections show** (opus; `c844dcd2` the shape, `49af7b17`
    the check, `4472df51` the page). The user's frame: a scenario is what was observed;
    operations and structures are specification, hung on the observation with as little
    inference as possible; the database is an implementation detail, never read for a
    structure's shape. `structures.edn` now gives a structure its identity, its fields and
    references (declared from the response classes or the OpenAPI), and where in an answer
    it is read; the tables stay under `:detected-by`, the detector's wiring. `spike.structures`
    confronts each claim with `reference.edn`, no stack:

    | | structures | fields | verified | declared only | refuted | undeclared | derived |
    |---|---|---|---|---|---|---|---|
    | Conduit | 6 | 21 | 30 | 1 | 0 | 0 | 23 |
    | Petclinic | 6 | 25 | 35 | 2 | 0 | 0 | 39 |

    Declared only, all three a reference by identity whose target the scenario does not
    always read: `Article.tagList → Tag` (233 of 828 match a tag seen), `Pet.ownerId → Owner`
    (614 of 912), `Visit.petId → Pet` (596 of 611). One blind spot: Petclinic's User
    (tables `users`, `roles`, written by add-user, read by no route). The page draws the
    graph of references and a sequence diagram per scenario.

    Proof: the readings built by the old and the new code are equal (379 and 222), control
    replays 167 and 183 green, `interfaces.md` and `guarded.md` regenerate unchanged.

    **What the recording lacks**, seen by the sequence diagram: nothing is read around a
    prepared call, and its response is not kept (only its status) — so what a prepared
    call changed, and which account holds a token, cannot be drawn; an instance "came into
    an answer" or "left it", which a paged or filtered list also causes (create-article:
    Article +1 · −3).

    **For the user to decide**: Favorite and Follow have no instance of their own — they
    are shown in a field of another structure (`Article.favorited`, `User.following`); a
    relation carried only by a path (`/articles/{slug}/comments`) has no reference to
    declare it; the model's Structure has only a name, and its link "Observable holds
    Structure" reads "detects" in this frame. Open question: a spec derived from the
    observation says what the system does (Petclinic's bugs are recorded as rules), and
    has no place yet for what it should do.

    Not verified: why delete-owner makes a PetType leave an answer; the sequence diagram
    scrolls inside its card at 390 px.

16. **A field's type is a claim, and a field shows examples** (sonnet; `cae2884a` the
    check, `08cc2ed8` the page). Each declared type is confronted with every observed
    value; each field carries up to three distinct observed values with the scenario they
    were seen in. Conduit 43 verified · 6 declared only · 0 refuted (was 30 · 1 · 0),
    Petclinic 54 · 2 · 0 (was 35 · 2 · 0). No type refuted. Nulls, counted apart:
    `User.bio` 878 of 914, `User.image` 899 of 914, Petclinic's `Visit.date` 4 of 611.
    Five Conduit types stay declared only because every value is masked (`User.token`,
    the four `createdAt` / `updatedAt`): a mask hides the value the type would be judged on.

    **What the five types cannot say**, seen in the values and not added: a format (an
    email, a URL, a kebab-case slug, ten digits of a telephone), a bound
    (`favoritesCount` ≥ 0, a date in the past), a closed list (`PetType.name`, 8 values).

17. **A prepared call's response is kept, observed and not judged** (opus; `626734bd` the
    harness and both references, `9872df24` the check, `8dd399eb` the page). Decided by
    the user. No request added. A prepared status that differs still turns the scenario
    red; a prepared body that differs is reported apart (`:prepared-differs`). Re-recorded
    on two fresh stacks each, 0 unstable; with the prepared answers removed the new
    references equal the old ones; control replays 167 and 183 green, 0 unseen, 0
    prepared-differs. Conduit keeps 71 prepared answers (116 masked leaves more),
    Petclinic 13 (none).

    **It moved almost nothing in the structures check**: an instance is read only where a
    projection's interface answers, and nearly every prepared call is a write (register,
    create-article, add-owner). The three declared-only references stand as they were.
    The page names a token's holder from the prepared answer, attached to no structure.
    For the user: may the answer of a writing operation show a structure — a claim
    declared from the code like a field, then verified? 11 operations on Conduit, 21 on
    Petclinic are concerned. A shape heuristic was refused (PetType and Specialty both
    read `id`, `name`).

    Not verified: a replay where a prepared answer really differs (the selfcheck only).

18. **The answer of a writing operation may show a structure, and the metamodel takes two
    layers** (`454e70c1` the metamodel; sonnet, `34363f56` the declarations and the check,
    `43f89f04` the page). Decided by the user: the 2xx answer of a write may show a
    structure "and sometimes more"; the named condition of a rule is a **Fact** (it reads
    with Rule: a rule affirms or denies facts); a structure is seen through at least one
    projection, so Favorite and Follow are facts, not structures; a fact may be about the
    caller. `:shown-by [{:operation :at}]` next to `:seen-through`, declared from the
    handlers' return types: 9 operations on Conduit, 7 on Petclinic, all 16 verified.
    Conduit 52 verified · 6 declared only · 0 refuted, Petclinic 61 · 2 · 0. No answer
    shows a key its structure does not declare.

    **Found**: Petclinic's contract says an update answers 200 and the entity; the code
    and the recording answer 204 and no body — 12 operations, left undeclared. The three
    by-identity references stay declared only (`Article.tagList` 245 of 863, `Pet.ownerId`
    618 of 917, `Visit.petId` 604 of 619): the unmatched values are the seed's, on
    instances whose target the scenario never reads — a write cannot match them.

19. **A rule affirms or denies named facts** (opus; `5fdab2d1` the facts, `a6756ce8`
    Favorite and Follow, `cef838e9` the check and the page). `facts.edn` per target, each
    fact named by the positive statement and cited by the rules: Conduit 12 facts for 40
    conditions ("the caller is signed in" in 15 rules), Petclinic 18 for 37. A condition
    on the call's own input stays inline; so do the six `[:rows …]`. Favorite and Follow
    are no longer structures: their tables sit under the structure whose field shows the
    fact, labelled `:fact`, and `mutates.edn` says an operation changes a fact.

    Proof: `classified.edn` identical on both targets (167, 183), `guarded.md` unchanged,
    the 379 readings byte-identical, Conduit's control 167 green and 0 unseen.

    **Seen**: on Conduit every fact was observed true and false. On Petclinic every fact
    is only ever denied by a rule, and the six "the clinic has a …" were never false (the
    seed is never empty — the six `empty` rules without a scenario). Two facts read one
    path with two readers ("the article exists", "the caller can read the article") and
    stay apart: merging them changes get-article's classing.

    **Open**: names not yet honest ("the caller can read the article", "the email given
    is the caller's" — the call's input against the caller's state); facts that count a
    list and state about no field; the model has no "detects a change of a fact"; the
    reference still labels a side effect "Favorite" and the replay relabels it before
    comparing. Not run: Petclinic's control with the relabelling.

20. **The resistance test, a target with a clock: Fineract, the life of a loan** (opus;
    `fa13812c` the harness, `f7b3e0e8` the target; the whole account in
    `dev/spike/fineract/clock.md`). Asked by the user before deciding to adopt. 12
    operations, 52 scenarios, 11 facts, 33 rules and 15 inexpressible.

    **The recording holds on a clock only on the day it was taken.**

    | replay | green | red |
    |---|---|---|
    | same day, three fresh stacks | 48–49 | 0–1 |
    | the business date + 1 business day | 29 | 20 |
    | + 35 days | 17 | 32 |

    No red is a timestamp the noise missed (the API shows none). 8 are rules whose branch
    crossed today (a date "tomorrow" refused, then accepted); 12, then 24, are values the
    business derives from today (the day a transaction is entered, interest accrued, what
    is overdue). Two stacks on one day never see them move: they are recorded as
    constants. Tried: the scenarios' dates written relative to today — the 8 branches come
    back and every echoed date turns red (37 of 52). A reference that holds on another
    day needs a date compared as its offset to today, and the rule layer a projection of
    today, a date term and calendar arithmetic. None built.

    **Also found**: 280 tables cost ~16 min a pass; restricted to the 6 tables the
    scenarios write, 4 min — and nothing detects a table a new scenario writes outside
    that list. Ids drawn from a pool in the JVM survive the restore. 3 scenarios unstable
    on an order the target does not determine (as on Petclinic). An operation is a route
    plus `?command=`; dates are `[y m d]`; no write answers a structure; nothing in the
    model says which day a reference was taken on. Petclinic's control after the harness
    changes: 183 green.

    Not verified: the JVM's clock moved (only Fineract's business date was); the relative
    dates at + 35 days; `watched.edn` regenerated by the code that now writes it.

21. **The challenger on the whole pivot, and a debate between three model families**
    (`docs/debate-recorded-cases/`: the attacks, the defence, the fact-check, two
    syntheses, the key; $1.42). The user's hypothesis for both: if adopted, the pivot is
    rebuilt from zero in another repository.

    **The challenger: sound under conditions.** The oracle holds; "exercises the business
    rules and can prove it" is overstated. Most severe: (1) the classing rests on a third,
    live run whose readings are not in the reference — "scenario exercises rule" is not
    derived from the observed layer (`harness.clj` › `classify`); (2) "guarded" is given
    as soon as one scenario of the rule turns red, whatever else does, on one mutant per
    rule written from the same `rules.edn`, none moving a bound, 24 on Petclinic borrowed
    unchecked; (3) nothing measures that the rules are complete; (4) Fineract ran no
    mutant. `rules.edn` is a second predicate language next to specy's grammar; scenarios,
    facts and `today` reinvent ADR-0099, ADR-0029 and ADR-0118. The Result section above
    is stale (it says the rule layer is not built). Its five decisions before a rebuild:
    the classing's evidence is part of the observation; time (the day in the starting
    world, the clocks held); one condition language, dates and quantifiers decided up
    front, first-match or not; what "a rule is checked" means (an independent mutant
    source, bounds, completeness); the world's boundary and one reference per scenario.
    Its prediction for a fourth target: identities that are no sequence (UUIDs) break the
    readings — inferred from the code, not run.

    **The debate's ground** (both syntheses): a replay proves that scenarios reproduce,
    not a general rule, and a wrong condition misclasses without a red; recording passes
    where generation stalled (hash, slug, paging); readings triggered by detection and
    noise as equality classes are kept by all; first-match misfits fields that are not
    alternatives; no mutant moved a bound; the clock and state outside the database are
    unsolved in both approaches; the bugs are recorded green and intent has no place.
    **Where they part**: repair the generative spec (a predicted 10-point kill advantage,
    unmeasured) or leave it; a transition model or a classifier with provenance; existing
    tools (coverage, mutation, OpenAPI validation) or a metamodel. Each has an experiment
    named, none run. Fact-check: 5 claims wrong of 112, none of them load-bearing; the
    defence quoted ADR bodies the dossier did not hold.

22. **The shapes redrawn with the user, and their fit on two targets** (opus; `129ece95`;
    `dev/spike/shapes.clj`, `<target>/shapes/fit.md`). Going through the debate's ten
    points the user redrew the data by instances (`dev/spike/restart.md` › "Settled with
    the user", the metamodel's page): the specification declared whole, a scenario
    written with holes that an execution fills and that names the rules it proves, the
    bindings (projection, trigger, detects) as the only shapes that know both the target
    and the specification, nothing derivable stored. Drawn on one operation of Conduit;
    then translated by script from the spike's files, no target started.

    | | Conduit | Petclinic |
    |---|---|---|
    | scenarios that fit the shape | 78 of 167 | 111 of 183 |
    | operations that fit | 9 of 19 | 10 of 37 |
    | facts that fit | 7 of 12 | 6 of 18 |
    | verdict derived: verified / refuted / not derivable | 30 / 0 / 137 | 30 / 0 / 153 |
    | recorded readings no `:assert` accounts for | 212 of 379 | 67 of 222 |
    | side effects no `:assert` looks at | 23 | 42 |

    **The requirements hold; the rest does not yet.** Every requirement (a fact denied,
    the call refused, no side effect) verifies. What the shapes cannot say: a condition on
    the call's input (60 and 70 scenarios) and a refusal with no fact to require (a
    validation); a list — membership, count, order — and an instance that appears or
    vanishes, in `:assert`; an accepted answer with no body (a 204); the call's query; an
    actor a prepared call creates, a value taken from an earlier answer, a raw token. No
    effect has a `:then` (the spike's rules hold a sentence). Distinct refusals answer one
    status: 401 for all of them on Conduit's writes, 404 on Petclinic. Scenarios that
    prove more than one rule: 7 and 6; one rule gains a scenario.

    Rests on defaults: a rule with no `:when` given the negation of the effects before it
    (the implementer's choice, not the brief's); a 204 and a call's query counted as
    misfits. Not verified: that a played copy equals the reference — nothing was run.

## Result

*Written after Journal 6 and stale past it: the rule layer has since been built (Journal
9–19). The state at the end of the branch, and what a rebuild keeps, drops and must settle
first, is in `dev/spike/restart.md`.*

**It holds on Conduit as an oracle, and not yet as a proof that the rules are exercised.**

| the Frame's criterion | |
|---|---|
| 1 reproducible | yes — 167 cases, 0 unstable, every replay on a fresh stack green, a re-record changing no existing case; **with a date on it**: static JWTs expire 2026-12-02, and a clock-derived value is frozen or masked |
| 2 says what the spec could not | yes — the hash, the slug, the page, the order, the counts, a field left out: recorded, and each kills its mutant |
| 3 detects | 21 of 24 on the first writing of the scenarios plus one loop turn (M5); 2 more are a case away; 1 is out of reach without the clock. With the first, wildcard, noise it was 18 of 24 |
| 4 measured | 19 of 19 operations; no line of a service, DTO, controller or validator unreached; line coverage neither classes the cases nor says a rule is judged |
| 5 cost | scenarios 13 min 42 s and 156 k tokens of one sonnet session; record 36 s; replay 18 s; a mutant 28 s. The harness: ~450 lines of Clojure under `dev/`, nothing of `lang/`, `model/` or `oracle/` used |

Against the four benches of `feat/realworld-extraction` (9 of 19 operations proved, 23
clauses `inexpressible`, 33 commits to the generator and the grammar): not the same claim
— a proved operation there is a general statement judged on drawn worlds; a recorded case
here is one world. What the comparison does say: every friction of that Journal (A, E, F,
F2, H, H0, M, N, O, the seed's combinations — building a world from a predicate; B, D and
the 23 `inexpressible` — predicting an answer) has no counterpart here. The frictions here
are others: the noise, the clock, cases that are one recording.

**What the spike found the shape needs, in the order it found them:**
1. two recordings on two stacks, not two passes on one;
2. noise as equality classes inside a case, not a wildcard per leaf (3 mutants of 8);
3. a scrubber list for what two recordings do not show (one entry so far: a JVM identity hash);
4. mutants, not coverage, as the measure that a rule is judged — and a loop that hands a
   survivor to the agent (M5: one turn, under 2 min);
5. a check of a case's identity: 25 cases of 167 differ from another case by neither
   recording nor coverage, and nothing ties a `:rule` sentence to what was recorded.

**What it did not test and the challenger says breaks first:** a clock rule (Fineract's
schedule: dates frozen or masked, no "due = disbursed + 30 d"; ADR-0118's `now` as an
input is the lead), asynchronous writes, an audit table, state outside the database (an id
pool, a cache), ~250 tables read twice a case, a seed that is not rebuilt through the API,
the re-record of everything on a legitimate change, a rewrite with another schema.

**The rule layer is not optional** (the challenger, and item 5 above): the promise says
"exercises the business rules and can prove it"; a recording proves a behaviour is
reproduced. The predicates of the spec — named states, `when … otherwise` — checked on the
recorded pre-state of each case, classing the cases, are what would tie a case to its
rule; no `ensure`, no construction, no draw. Not built.

**Next, if the direction is taken** — each a spike of this size:
- the cheapest refutation: one Fineract case, "disburse a loan", recorded on two stacks a
  business day apart; count the masked leaves of the repayment schedule;
- the target's clock held at replay (a fixed date), and C1 again;
- the rule layer on Conduit: the 167 cases classed by predicates on their recorded
  pre-state, the 25 indistinguishable cases as its first test;
- a mutant generator in place of 24 hand-picked ones (PIT's operators on the services).


The spike's code was not reviewed by the `reviewer` agent: it lives under `dev/`, was read
by the main thread, and its evidence went to the challenger (Journal 5).

## Backlog

- 1 — the harness: record, replay, index (`dev/spike/`).
- 2 — the scenarios of Conduit's 19 operations, written from its code and tests.
- 3 — JaCoCo by case; the branches without a case.
- 4 — the mutants.
- 5 — the effect judged through the API, the rows as detector (Journal 7). Open: a read of
  what the call names when it touches nothing (C3); the link written by the
  characterization agent, not by hand.
- 6 — is each rule guarded: one mutant per rule (Journal 11). Open: a mutant that lets the
  anonymous caller succeed, for the seven undecided rules; mutants that move a bound.
- 7 — the code and the data in the metamodel's shape (Journal 12). Open: the user's
  decisions on where the model and the code disagree.
- 8 — a page to inspect the result, generated from the data files.
- 9 — a catalog of the target's interfaces (decided by the user): each route stated once
  and named, filled from the target's contract (its OpenAPI) where it has one; a trigger
  and a projection refer to it by name; the interfaces that neither trigger nor read are
  listed. Done (Journal 13).
- 10 — Petclinic end to end (Journal 14). Open: the 16 `too-long` / `incomplete` rules
  with no scenario classed under them; an order the target does not determine; a
  structure no projection reads; the inexpressible conditions (absent body, quantifier,
  clock, distinct count) — the user's to weigh against the metamodel.
- 11 — a structure defined by what its projections show, each claim with its provenance
  (Journal 15). Open: the two layers (observed, specified) and the provenance levels in
  `metamodel.edn`; a structure with no instance of its own; a relation carried by a path;
  the readings around prepared calls; the named states — a condition of a rule named once
  and referred to (seven `anonymous` conditions repeated on Conduit).
- 12 — the clock (Journal 20). Decided by the user: for now a reference names its day and
  is replayed with the target's clock held on that day. Later, not now: **the harness
  takes control of the target's clock** rather than writing dates relative to today — the
  day is part of the starting world, a scenario may move it as a prepared step ("35 days
  later"), and both sides of a date rule are met by the dates a scenario sends. Still
  needed then: a `today` term and a date type in the rules; a way to hold the clock on a
  target that offers none (the JVM's, the database's `now()`).
