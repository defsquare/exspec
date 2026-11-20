# feat/calls-in-the-evidence

## Frame

**Where this comes from.** exspec is to extract targets that call external services. The
first one, `trainings` (a Cloudflare Worker), calls a PDF compiler and an email provider,
and most of what it does leaves through those calls: "the convocation is emailed with its
PDF" shows in no answer of its own API. Settled with the user on 2026-11-19:

- **What a target sends to its services is part of its contract**: recorded, kept in the
  evidence, compared on a replay; a rule may be about it. This amends the rule "only what
  the target's interfaces expose is compared".
- **A service is not a target.** The target is observed: its state is reached through
  its interfaces or its own seed, its answers are never dictated, what is recorded is what
  it answers, it is judged. A service is commanded: its state is set as it is, its
  answers are dictated, what is recorded is what it receives, it is not judged.
- **A service is stood in for by a twin**: a standalone program that holds what the
  target expects of it — a consumer-oriented specification, read from the target's code
  alone, never reconciled with the real service for now. Later, out of scope: a twin
  derived from a whole specification of the service; the consumer's specification turned
  into a contract reconciled with the provider.
- **exspec puts a recording proxy of its own in front of the twins**: the record does not
  rest on generated code, and what stands behind the proxy can one day be the real
  service.
- **A twin answers by default; a scenario sets only what its case needs**: a state, given
  to the twin whole and taken as it is — an arrangement of a twin is not judged, unlike
  one of the target, which must be reachable — and a failure (503, 401, a timeout), forced
  in the proxy, being no state of any service.
- HTTP services only.

**Settled anew on 2026-11-20, after the first whole extraction.** The user's rule: a
target can be rewritten and the specification stays. So the one word above is two
concepts (ADR-0019). A *service* is of the specification — what the system needs of
someone else, with the *conditions* under which the system behaves otherwise; a
*provider* is of the target and renders a service. A scenario gives a service a
condition, with parameters, and never names a provider; the provider's twin has to
satisfy it, a failure included: the proxy forces nothing, and a step is no longer
addressed to a twin. Where the points above say "service" for what is called, stood in
for or recorded, read "provider".

Five branches, in this order; this is the first, the four others are items of
`docs/backlog.md`.

**The metamodel: no concept added.** A call to a service is a side effect, and a service
an observable — the variant the metamodel already has:

```
Scenario ──holds, once played──► SideEffect ──captured through──► Observable ◄──observed through── Target
proof                            proof                            target (variant: service)
```

- What changes is the rule, not the concepts. An observable was "never the reference".
  One is now either at the target's boundary — someone other than the target is on the
  other side, and what the target sends there is its contract, compared — or inside it: an
  implementation's detail, which detects and explains. The sort belongs to the observable,
  not to its variant: a bus may be a queue of the target's own, a file an export a third
  party reads. Decided here for the one variant built: a service is at the boundary. A
  bus or a file is sorted the day one is declared.
- A side effect at a service is in that observable's own terms: a request and its
  response, where a database reports rows. Its place — what the spike's `on` was for a
  table — is the request's method and path.
- `Detects` is not used for a service: a rule may be about a call directly. What ties a
  rule to a call is decided with the first rule that is computed from one.
- What only a service has, because it answers and its answer is an input of the target:
  what stands for it (a twin now, the real one some day), the state a scenario gives it,
  the failure forced. Attributes of an observable of that variant, as `connection` is of a
  database. `Twin` is not a concept.
- Not yet: a service's specification (the interfaces the target calls, its rules, the
  form of its state). Nothing uses it while twins are written by hand; it comes with the
  branch that reads a service from its consumer.

**Goal.** An evidence holds, for each step played, the side effects of the target at its
services while the step was played; two executions mark their noise; a replay tells one
that differs. With no target and no proxy: they reach the run through `io`, and a test
passes a fake.

**The data.**

```yaml
exchanges:
  - when: call
    as: a
    request: {method: post, path: /a}
    response: {status: 200, body: {id: 1}}
    side-effects:
      - observable: s
        request: {method: post, path: /b, body: {to: x, file: {bytes: 1234, sha256: 9f…}}}
        response: {status: 200, body: {id: e1}}
```

- `side-effects` absent: nothing was observed, what the target did is unknown. `[]`:
  something was observing and the target did nothing. "Refused, and nothing is sent" holds
  on `[]` only. Same convention as `noise` (ADR-0013). It is enough while services are the
  only observables built; which observables were observing, and what stood for each, is a
  key of the run that comes with the proxy.
- The request is a request as sent (`sentSchema`): **no header** — a key to a service
  must not reach a versioned file. A key sent in a query or a body would: nothing here
  stops it, and the proxy's branch has to. The response is a status and a body.
- A body may hold `{bytes, sha256}` in place of a file: the judge reads that a file was
  sent and whether it is the same one, not the file. This branch has the shape; what
  makes a digest of a body — a body that is not text, a base64 string past a length, a
  threshold and so a heuristic — is the proxy's, which records.
- The side effects of a step are those `io` hands over once the step is answered, in the
  order received.

**Noise and comparison.** What the target **sends** is compared; what it was **answered**
is kept and not compared — a twin dictated it.

- The places start at the exchange, as the others do:
  `[exchanges, 2, side-effects, 0, request, body, to]`.
- Between two executions: an exchange with another number of side effects, or one at the
  same position at another observable or with another method, makes the scenario unstable;
  every other place that differs in a request is noise, in the classes of ADR-0005.
- A response is not compared, its status included: neither unstable nor different. Its
  values still belong to the classes of noise — an id a twin gave, found again in a later
  request or answer of the target. A twin that changed shows where it matters: in what
  the target answers and sends after it.
- On a replay: a difference outside the noise in a request is told as one in an answer
  is; another number of side effects in an exchange is a difference, never passed over.
- `side-effects` absent in one copy and present in the other: the two are not comparable.
  An evidence taken before anything observed is not the first copy of a reference that
  has side effects: it is played again.
- The target's own requests stay uncompared: they are the scenario's steps (ADR-0013).

**Decisions of this branch that are mine, to correct.**

- The roles' evidence only. The older path (`record`, `replay`, the computed verdicts)
  does not get the side effects.
- A request's path is one place. A value the target draws and puts in the path of a call
  would make the whole path noisy; split it in segments the day a target does.
- Side effects are paired by position. A target that sends two calls at once may swap
  them from one execution to the next, and the scenario is told unstable: honest, and to
  revisit with the first target that does.
- A response's headers are not kept either. The PDF compiler of `trainings` gives its key
  in a header: decided with that target, not here.
- No key in `target.yaml` yet: the observables are declared with the proxy, in its
  branch. Here `io` either hands side effects over or does not.
- "Stale" is not said of a reference whose twin changed: it would be guessed from a
  response that differs, which also happens when the request did. The honest way is a
  fact of the run — what stood for each service — checked before playing, with the proxy.
- The entry has the one form a service gives. The form a database would give is written
  the day a database is observed.
- The judge's instructions gain what `side-effects` is and what its absence means.
  Nothing is drawn on the page of `view` yet.

**The ADR this branch writes.** The rule in `CLAUDE.md` becomes: "Only what the target
says outward is compared: what it answers at its interfaces and what it sends to a
service. What a service answers it is kept, not compared. An observable inside the target
detects and explains." The ADR says each statement of the spike's metamodel it changes,
`docs/brief/` being never edited:

- a side effect is of each step, held by an exchange, not only "during the judged call";
- "it is not compared" holds inside the target; at a service the request is compared;
- "a detector says which structure or fact it concerns" does not hold for a service;
- an observable is "a place where what the target did is captured", not "a place of the
  target", and the target group is no longer all "read off the target": a twin is written;
- the spike's "a side effect detects, it is not judged" is reversed for a service.

It keeps both meanings of `side-effects` — the spike's, not compared, and this one — and
says `[]` means every declared service was observed. It amends ADR-0004 ("no observable
is built yet"; "a refused call changed nothing" can be checked on `[]`), ADR-0005 (not
only answers are walked; a status of a service's response is not what makes a scenario
unstable) and ADR-0013 (the places under a side effect; what else makes a scenario
unstable; requests are not compared, except what the target sends to a service).

**Non-goals.** The proxy, the twins and how they are started, their state, forced answers,
how a call is attributed to a step once a proxy listens, `trainings` itself: the four
items in `docs/backlog.md`.

**How it is judged.** `bun run check` and `bun test` report nothing. Tests, each on whole
values, on evidences written by hand: a request that differs told by a replay; a
response alone that differs told as nothing; two side effects against one told as a
difference — the case the code passes over today; absent against `[]` not comparable; a
value equal in a side effect's response and in a later answer in one class of noise;
another number between two executions told unstable; the side effects of each exchange
as `io` handed them.

## Journal

- 2026-11-19 — The sketch read by the challenger (opus) before it went to the user.
  Verdict: keep the proxy and the calls in the evidence, cut the rest of the sketch. Taken:
  no control language per twin; a twin restarted rather than reset; the roles that read a
  service and write its twin put after a twin written by hand; a first branch with no
  target. Its defects taken into the Frame: noise walks answers only; binaries and
  secrets; absent is not empty. Not taken as written: it had every arrangement go through
  the proxy; the user set states on the twin and kept the proxy for failures.
- A throwaway Worker with the email provider's SDK of `trainings` (4.8.0, same
  compatibility date, `nodejs_compat`) under `wrangler dev`: `RESEND_BASE_URL` in
  `.dev.vars` sends its calls to a local listener. Both services of `trainings` are
  redirected by configuration alone.
- 2026-11-19 — The metamodel, in three turns. The user set aside "a service is a target":
  one is observed, the other commanded. The challenger (opus) then read one concept,
  `Service`, taken out of `Observable`; its verdict: the recorded call is a concept too,
  as `SideEffect` is — or `SideEffect` is widened, which it liked less, "not compared"
  being in its definition; a call's response is dictated by the twin, so kept and never
  compared; no link to `Interface` before something reads a service's interfaces; the twin
  an attribute, its commands a key of the target. The user then put the calls back where
  the spike had them — a call to a service is a side effect, a service an observable — and
  the rule is what is amended: an observable at the target's boundary is compared. No
  concept added. Names, by the user: `service` over the challenger's `provider` (what a
  compose file calls the same thing; a framework's `@Service` is code the specification
  does not cite); `side-effects` on an exchange, each naming its `observable`. The option
  the user chose was not read again by the challenger: the pre-merge review has it.

- 2026-11-19 — The Frame read a third time by the challenger (opus), the user's decision
  taken as settled. Verdict: approve with changes, all taken. "Stale" guessed from a
  response that differs was a heuristic: a response is not compared, nothing more. The
  sort of an observable belongs to it, not to its variant; only the service is sorted
  now. `Detects` does not "stand as it is" for a service. Another number of side effects
  on a replay, and absent against present, were passed over in silence by the code as it
  is. The digest leaves the branch for the proxy's, the shape stays. The rule's wording
  is the challenger's. Left for the pre-merge review: `side-effects` now has two
  meanings, the spike's and this one.

- Item 1, in the thread: the shape and its three tests. ADR-0018 written with it, not
  last as the plan had it: the commit that adds the key carries the decision.
- Item 2 (implementer opus, one round): `6ce4d19` refactor, `337ff33` feat. Places with a
  value, of three kinds — equal, walked, kept — an answer one way to give them; no module
  added. Of eight tests written first, six failed; "a response alone differs" and "a class
  holds across a kept place" passed already: the classes read the played copy whole.
  Reviewer (sonnet): conformance yes, quality approved, nothing Critical or Important.
  For the challenger: a nested ternary in `comparePlaces`; the columns of the comment over
  `evidencePlaces`; between two executions a `query` or `body` absent on one side is
  noise, as a body that changes form is — on a replay it is a difference.
- Item 3 (implementer sonnet, one round): `a84df39`. `io.takeSideEffects`, optional;
  `playSteps` fills the exchange; `roles record` takes as first copy only an evidence
  taken as the stack observes. Reviewer (sonnet): conformance yes, quality approved. For
  the challenger: the commit's body sets aside a case that cannot occur — an evidence with
  an unplayable exchange is never as written — to reword when the history is cleaned; no
  test of an evidence with side effects recorded on a stack that does not observe.
- Item 4, in the thread: the judge's instructions say what `side-effects` is, that a
  response is a stand-in's, and that an absent key leaves a rule about what is sent
  `not-shown`. The judge's task carries the exchanges whole: no code.

- 2026-11-19 — The user: no merge before a whole extraction with services; the branch is
  a spike and goes to the end. It takes two items back from `docs/backlog.md` — the proxy
  with the twins' state and forced failures, and `trainings` extracted with twins written
  by hand. The third, a target driven through forms, stays there: `POST
  /api/v1/sessions/:id/complete`, JSON with a bearer key, issues an attestation to each
  learner — a PDF compiled, then an email sent. Both services are reached with what
  exspec sends today; the challenger's "the JSON API sends no mail" was wrong.

- The proxy (implementer opus, one round): `22b95fc`, `5292080`, `8572aeb`. Reviewer
  (sonnet): conformance yes, quality approved, nothing Critical. Two Important findings
  not sent back, the branch being a spike sorted before any merge: the function that makes
  the CLI's `io` starts the proxy without its name saying so and keeps it in a module
  variable; a recording that fails surfaces at the next take, away from its step. Minor:
  `//__x` escapes the test of an arrangement's path; a form-encoded body is kept as a
  digest; the type `Proxy` shadows the global; hop-by-hop headers passed on; no test of
  the builder's line on the services; each take waits `quiet` ms, 150 a step.
- `trainings`, a copy under `targets/`, by hand: twins of the PDF compiler and the email
  provider in one app; start, seed and reset as scripts, the reset 2.3 s; two bearer keys
  as actors. `extract --phase interfaces`: 47 interfaces, 46 s.
- `complete-session` alone (`--only`), the whole chain. Completing a session issues an
  attestation: it stores it and sends an email — no PDF is compiled there; the compiler
  is reached from the back office only.
  - A first reading wrote "an attestation is issued" and nothing of the email: the reader
    stops at the business effect unless told. Told that what the system sends to another
    system is an effect of its own, it wrote `attestation-emails-sent`, and kept the
    provider failing as a doubt, not as an effect.
  - The builder: 17 scenarios, all played. From the reader's doubt alone it wrote one that
    gives the email twin its state — the learner's address blocked — and found that the
    call then answers 500 while the session stays done.
  - `roles record`: 17 references, none unstable; `roles replay` on a fresh stack: no
    difference in any. The email is in the call's `side-effects`, no header.
  - The judge: 15 hold, `responses-not-cached` not shown (no header is recorded),
    `answers` contradicted by the 500. It read the side effects as told: "the provider's
    422 and the resulting 500 come from the blocked-recipient setup, not from a missing
    email".
  - Cost: about 2.5 $ for one interface — interfaces 0.33, readers 1.1 and 0.18, builder
    0.75, judge 0.18.

- The back office of `trainings`, three interfaces added by hand to its description: the
  convocations sent, the convention issued, the convention's PDF read. An actor's cookie
  needed nothing of exspec: the seed signs the admin in once per start and writes the
  header. In the thread: a redirection kept as the answer, a file answered kept as its
  digest.
  - First run: every reference stable and replayed with no difference, the calls to both
    services in the evidence in their order — compile, email with the PDF attached, per
    learner. The judge's task did not fit its prompt: the target sends its compiler eight
    fonts per call as "base64:…" strings, an interface's evidence weighed 30 to 60 MB.
    Fixed: the prefix set aside, any string past 16 384 chars a digest; 240 to 580 KB.
  - The verdicts then showed two holes. A field sent as JSON is not read by a route that
    takes a form: 13 of 46 verdicts contradicted, most on a call that never carried what
    its scenario meant. And the builder forced a failure at `/compile` and `/v1/pdfs`
    where the target calls `/v1/compile`: it does not know a service's interfaces.
  - A form as a request body (implementer sonnet, one round): `c2ae0a3`. Reviewer
    (sonnet): conformance yes, quality approved, Minor only — `null` sent as "null", no
    test that an interface's `form` is read, a long line in the builder's instructions.
    The paths each service is called at, written in its `says`.
  - Second run, the scenarios built anew: 40 hold, 3 contradicted, 5 not shown, of 48;
    none unstable, no difference on a replay. The builder arranged the services eight
    times: a failure forced at the right path (4), the compiler's keys emptied (3), an
    address blocked (1). What is left is the target's or a known limit: a malformed id
    answers 500 on the back office; a convention is issued for a session under another
    program's path; a redirection's `Location` is not recorded (2 not shown); the twin
    cannot answer a PDF with no key.
  - Cost: 1.1 to 1.7 $ an interface with sonnet; the builder about half, the judge 0.18 to
    1.15 with the size of the evidence.
- Every command that made an `io` started the proxy: a judge could not run beside a
  recording, the port taken — the reviewer's Important finding, met. A command that plays
  nothing starts none now.
- The judge with haiku on two interfaces, the same evidence: 15 of 17 and 16 of 20
  verdicts the same; 0.014 $ against 0.18, 0.41 against 1.15. Where they differ haiku is
  the laxer on what is not recorded ("holds" with the redirection's target unseen) and
  missed the convention issued under another program's path, which sonnet contradicted.
- Not built, from the user: a scenario that starts from the end of another one, judged to
  hold — a state reached through the interfaces and proven, where a richer seed would
  write states the target may not allow. It shortens what a builder writes and what a
  judge reads, and gives the extraction an order: what creates first.

- 2026-11-19 — The last part, a service read from its consumer and its twin written from
  the reading, read by the challenger (opus) before the user: build with changes, taken —
  the existing notation for a service's interfaces, `expects` for the word, a response's
  `headers`, every alternative reachable, the target's tests and fakes read, a gate over
  HTTP only, the proof by replay. Not taken: a response dictated in the proxy for "a PDF
  with no key" — a state of the service. Two points of the Frame undone with the user's
  go-ahead: the state is a plain shape, not structures; a twin is named. ADR-0019.
- The services' item (implementer opus, one round): `ee4fa14`, `c3ba081`. Reviewer
  (sonnet): conformance yes; two Important, fixed in the thread, folded into `c3ba081` — one twin
  that does not load failed every twin's gate; a state that is no JSON raised. Minor, for
  the challenger: a redundant kill, `port ?? 0`, a PUT with no timeout in `src/io/twins.ts`;
  the service's name travels in the events' `interface` key. Outside the brief:
  `parseExtraction` skips `services/`, `readExtractionFiles` reads `services/*/twin.ts`.
- On `trainings`, in the order met:
  - the reader read the twins written by hand, which lay under `exspec/target/`, and gave
    them back: taken out of the checkout. A reader must not be able to read a twin.
  - at the default effort (11 to 23 s, 0.05 to 0.13 $) it stopped at the client module
    and missed the call a page makes (`GET /v1/pdfs/{key}`, a probe); told to follow the
    address's setting, it still did. With `--effort high` (38 s, 0.20 $): three
    interfaces, and "a PDF with no key" a part of the state (`persists: false`, a backend
    that keeps nothing) — what the hand-written twin could not do.
  - it once put the service's API key in the state; the twin then refused the target's
    own key. Told: a refusal is forced from outside, a twin checks no credential.
  - the twin writer: 7 to 10 s, 0.02 to 0.04 $ a twin, the gate passed at once.
  - a generated twin answered a compile without reading its body; the proxy's next call
    found its connection closed. The served file now reads the body first.
  - the 65 references recorded with the hand-written twins, replayed against the
    generated ones: 59 the same but for the PDF's bytes (the twin's own choice, passed on
    in the email's attachment); the 6 others are scenarios that gave a twin a state in
    the former form.
  - the four interfaces against the generated twins, the scenarios that gave a state built
    anew, all recorded again, judged, replayed: 70 scenarios, none unstable, no difference
    on a replay; 63 hold, 6 not shown, 1 contradicted. The builder gave a twin its state
    ten times in the reading's form — `persists: false` six times, `held: []` twice,
    `rejecting: true` once. `stream-inline-pdf`, not shown with the hand-written twin, now
    holds: the target answers the PDF itself when the compiler keeps none.
  - what the comparison with the former verdicts does not show: a builder asked for one
    interface goes over all its scenarios, not only the missing ones. It dropped
    `answers-2` of `complete-session`, which carried the contradiction (a 500 while the
    session stays done): the 500 is still in the evidence of another scenario, whose rule
    holds. Two contradictions became not shown the same way. Fewer contradictions here is
    the builder's variance, not the twins'.
  - cost of that run: about 6.9 $ (builders 4.2, judges 2.7); the services' reading and
    twins, every try counted, under 1 $.

- 2026-11-19 — The spike sorted with the user. The rule "no merge before a whole
  extraction with services" read as met: the four interfaces that reach a service are
  extracted whole against generated twins; the 46 others of the API reach none. Kept: the
  side effects in the evidence, the digests, a service's folder with its two roles. Kept
  and given their ADR: the proxy, a step addressed to a service, the twins' lifecycle
  (ADR-0020); a form, a redirection, a file's digest (ADR-0021). Dropped: `says` as what a
  builder knows of a service, the twins written by hand. Redone: below.
- The services stood by exspec (implementer opus, one round): a named effect, no module
  variable; `behind` optional, absent meaning the twin, served on a port exspec picks; a
  play's reset empties the twins; the service reader at effort high. Reviewer (sonnet):
  conformance yes; two Important, fixed in the thread — a recording that failed ended the
  whole play, now a step told unplayable; nothing stopped the services on a signal.
  Minor, for the challenger: a sentinel `at = ""` in `src/io/services.ts`; a reset's
  `fetch` with no timeout; `stopServices` may raise in the `finally`; a misused command
  stands its services before the usage is printed; no `bun test` of `standServices`.
  The twins out of the scripts of `trainings`: the 70 references replayed, no difference.
- 2026-11-19 — The pre-merge review (challenger, opus): merge after changes. Taken, all
  of its must-fix: no call to a twin without a deadline; only the roles' commands stand
  the services; ADR-0004, 0005, 0013 and 0018 say what amended them; the two items of
  `docs/backlog.md` the branch closed are gone, four written cold in their place. Of its
  should-fix: a step whose calls were not recorded keeps its answer with no
  `side-effects` rather than being told unplayable — the absent key already says it;
  `serve.ts` written each time the twins are served; a `service` key in the events;
  `expect` for `rule` in `expects.yaml`; `RecordingProxy`; a null form field left out.
  Not taken: the builder's line falling back on `says` when a service has no folder — it
  is one line now and names no path; `roles-*` beside `services-*`. Its warning kept as
  an item: a call later than `quiet` after the last step leaves `[]`, a wrong proof.
  (implementer sonnet, one round; reviewer sonnet: conformance yes, quality approved,
  Minor only — `bun` found by PATH, `interface` and `service` not exclusive in the
  schema, the flow passes over a skipped role with no interface.) The 70 references
  replayed after it: no difference.
- 2026-11-20 — The metamodel put to the user's rule, "what survives the target being
  rewritten is of the specification". Design read by the challenger (opus): build with
  changes — taken: no `asks` on an operation, a parameter is a value the scenario wrote
  or the target answered (its example, a key that travels in a header, could not be
  filled); not taken: no link from a rule to a service. Settled with the user: one
  optional `service` on a rule, a failure is a condition of the twin's, `behind` gone.
  Mine, told to the user: `target.yaml` still names its providers — the name is what the
  start lines and the provider's folder agree on.
- Service, condition, provider (implementer opus, one round). Reviewer (sonnet):
  conformance yes, no Critical; one Important fixed in the thread — two providers
  rendering one service, the last read winning in silence, now a finding of each. The
  gate "a condition must change a fresh state" failed a true condition on the first
  reading (`forgets-documents` on nothing kept): relaxed to "is answered". Minor, for
  the challenger: a step and an exchange are told a service's by their `service` key,
  no literal field (ADR-0019 says so); two `as` in `serve.ts.txt`; a comment "A ceiling"
  in `src/run/play-steps.ts`; a provider's folder with no `provider.yaml` at stand time
  is told "no provider renders s" without its cause.
- `trainings` extracted anew, the four interfaces. Providers read: `email` (3
  conditions, one with an address) rendered by `resend`, `document-rendering` (6) by
  `typst`; both twins through their gate; 0.52 USD. Interfaces: 81 scenarios, 25 steps
  that give a service a condition, two with a parameter — one written, one a hole filled
  from the target's answer; 20 rules of 31 name their service, none holds a path, a
  status or a header of a provider. Judged: 70 hold, 10 not shown, 1 contradicted (a
  redirection whose `Location` is not recorded). Replayed: no difference. 8.82 USD, of
  which 4.67 the judge. One scenario told unstable at the first record — `wrangler dev`
  restarted the worker during an arrange step, answered 503 — recorded alone after it.
  Scenarios stalled for minutes on that run, not on the next: not explained.
- The services in the view (implementer opus, one round), the renderings chosen by the
  user on a mockup: a service's sheet with its conditions, the rules resting on it and,
  set apart, the provider rendering it; in a scenario, the condition given and the calls
  sent to each provider; a service's chip on an operation and on a rule. Two looks: the
  specification's, the target's. Reviewer (sonnet): conformance yes, quality approved,
  Minor only. For the challenger: no test holds the sequence diagram of a scenario with
  no service — compared by hand in a browser, 28 scenarios; the page of `trainings`
  weighs 2.2 MB against 0.77, the bodies sent to a provider embedded as recorded; a
  lane "no provider of s" never met; `providersOf` in `src/cli/view.ts` does three
  things; a finding deduplicated by its text. Not built: chips in the overview, which
  lists no operation. Fixed in the thread, of the earlier Minor: the two `as` of
  `serve.ts.txt`, the comment of `play-steps.ts`, a doubt drawn as one everywhere.
- 2026-11-20 — The second pre-merge review (challenger, opus), on the branch with `main`
  merged in and its ADRs moved up by one (0018 to 0022, `main` took 0017): merge after
  changes. Sound against the three rules; every concept and key has its ADR. Must-fix,
  all taken: the proxy still passed on a path under `/__` without recording it — a
  leftover that would lose a real call; the README said no side effect is observed; two
  `providersOf`, one starting a proxy under a getter's name; the backlog's Sources given
  a commit. Should-fix, all taken (implementer sonnet, one round; one point redone in
  the thread, a condition's `service` made optional to serve two uses — two types
  instead): ADR-0010 and 0016 say what amended them; "default condition" and provider
  for service in two instructions; `p` for `s` in examples; one `ConditionGiven`; no
  sentinel; the cause told when no provider renders a service; a test of an evidence
  with side effects on a stack that observes none, one of the view of a scenario with no
  service. A step told by its `service` key, no literal field: accepted, and written as
  the exception it is in `CLAUDE.md`. To the backlog: the page's weight, a provider
  declared and never reached, `interface` and `provider` together in an event, a misused
  command standing its providers. Dropped: hop-by-hop headers, `quiet` waited at every
  take, a lane "no provider of s", a finding deduplicated by its text.
- The overview (implementer opus, one round), asked by the user on the page: the system
  drawn between its actors and its services, each service with the provider rendering it,
  and each operation listed with the services it rests on. Reviewer (sonnet): conformance
  yes, no Critical; taken in the thread — a long provider's name widens its box, the bar
  of an operation and its title count the same, `actorsOf` beside the steps it reads. Not
  taken: the words of an operation are counted in the page's script, which no test runs —
  already an item of the backlog.
- 2026-11-20 — The challenger's second pass (opus), on the rebuilt series: merge after
  two fixes, both taken — the `undefined` left of a condition's optional service, the
  exception of `CLAUDE.md` narrowed to the step ADR-0019 decides. Every must-fix and
  should-fix of the first pass verified in the tree. The overview adds no concept: an
  actor is ADR-0004's, derived from the scenarios' `as`; a call made as nobody is not
  drawn, and the page says so.

## Backlog

Both items below are done, the second twice — by hand, then by the two roles, then with
service and provider apart. Kept as they were written, for the record of the spike.

Run as a spike from here: the least that gets `trainings` extracted whole with its two
services, then what it taught is sorted — kept, redone or dropped — before any merge.

### A proxy in front of a target's services

- **Settled.** As in the Frame. For the spike, mine: `target.yaml` gains `proxy: {port}`
  and `observables: [{observable, kind: service, behind, says}]`; the twins are started,
  stopped and emptied by the target's own `start`, `stop` and `reset` lines (ADR-0004: what
  the starting state holds is the scripts' business) — no lifecycle of their own yet. A
  step may be addressed to a service (`to: s`): it goes to the proxy under `/s`, and a
  path under `/__` is an arrangement, never recorded — `/__state` forwarded to the twin,
  `/__fail` kept by the proxy for the next call it names. A call is of the step during
  which it arrived, the step ending when the proxy has been silent for a time.
- **Next.** The proxy in `io`, the two keys, `to` on a step, the builder told of it.

### `trainings` extracted, its two services behind twins written by hand

- **Settled.** A copy of the target under `targets/`, never the user's checkout. Twins by
  hand: the PDF compiler (a compile gives a key, the key gives the file back, an unknown
  key answers 404), the email provider (an id per email); they draw nothing at random.
- **Next.** The copy started under `wrangler dev` with both services pointed at the proxy;
  seed, reset, a bearer key as the one actor; then `extract`.
