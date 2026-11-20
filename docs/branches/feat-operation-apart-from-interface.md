# feat/operation-apart-from-interface

## Frame

**Where this comes from.** ADR-0019 set a rule — what survives the target being rewritten
is of the specification, what may not is of the target — and applied it to one border: a
service of the specification, a provider of the target, `renders` between them. Read with
the same rule, the target's own border does not hold. Settled with the user on
2026-11-20, as what to attack next:

- **A requirement carries the status and the body of its refusal.** That a session with
  no trainer cannot be completed, and that the refusal is named, is of the specification;
  that it leaves as a 422 with a JSON body is how this target says it.
- **A scenario is written against the target's HTTP interface**: a method, a path, where
  an identifier sits in an answer. Its proof falls when the routes change, and cannot be
  replayed against a second target to show it respects the same specification.
- **An operation and the interface that exposes it are one object** in the roles' path: a
  reading per interface, named after it. One operation behind two interfaces is read
  twice; one interface that does two things is read once.

**Goal.** The operation of the specification set apart from the interface of the target
that exposes it, the trigger being the binding that knows both — the request, the status
of each refusal — as `renders` is for a service and its provider. Proven on `trainings`:
its four interfaces read, built, recorded, judged and replayed in the new form.

**Non-goals.** What the system asks of a service, declared; the actor as a concept of the
specification; a second target replayed against the first one's scenarios — each waits
for the design to say whether it comes with it.

## Journal

- 2026-11-20 — A wider design read by the challenger (opus) before it went to the user:
  change. Kept: the status and the body of a refusal out of the rule, into a trigger per
  interface; the common rules split the same way. Cut: a scenario's step calling an
  operation, and a trigger derived from an interface's description for an operation with
  no reading — every step but the judged call would go through derived triggers named
  after the interface and its body's fields, the wire under another name, and a scenario
  that sends a list where an object is due could not be written. Its finds on the real
  files: a status identifies nothing (an interface accepted with 302 and refusing with
  302, five refusals in 200), two refusals of one name with two bodies. Settled with the
  user: the cut; a rule about the wire is the target's (ADR-0023).
- A refusal named in the rule, its wire in the trigger, the wire's rules in the protocol
  (implementer opus, one round, three commits). Reviewer (sonnet): conformance yes, no
  Critical; two Important taken in the thread — a status cited is no longer a count of
  things ("at most 200 characters"), a rule of the wire that refuses nothing said in the
  ADR. Minor, for the challenger: two rules of `protocol.yaml` may refuse by one name
  with two bodies, neither the script nor a check sees it; `answers.status: []` written
  as a block by the script; a kept common rule whose refusal is `none`, and a file
  already migrated, not tested at the script's file level; no test holds the `body` of a
  requirement's line in the view's data; the page not looked at in a browser by its
  implementer. To know: every operation now needs a scenario per rule of the protocol it
  lists.
- `trainings` rewritten by the script, nothing played: four triggers, `common.yaml`
  left with one rule, `protocol.yaml` with four; two pairs of refusals named apart
  (`not-found`, `invalid-send-form`). The checks then say 20 findings — four triggers
  with no accepted status, 16 rules or answers that still cite a status, all but one in
  the three interfaces of the back office. The 81 judgements are stale. Next: the reader
  on those four interfaces, the builder where a rule changed its name, the judge.
- 2026-11-20 — A run of mine without `--only`, stopped after 41 minutes: `roles read`
  read the 50 interfaces of `trainings`, 46 of them never read and not asked for (8.86
  USD), and `roles build` built 41 of them (9.19 USD). The 46 readings are kept in the
  copy, in the new form, neither recorded nor judged. Learnt: a reader given a reading
  whose check fails reads it anew and keeps no rule's name — 5 to 7 rules of each of the
  four interfaces changed theirs, their scenarios left without a rule; nothing in the
  tool says, before an agent is called, how many roles a command is about to run.
- The four interfaces alone, the 46 others set aside for the run: built where a rule had
  no scenario (1.90 USD), recorded, judged (4.71 USD, one interface judged twice — an
  answer that was not the JSON asked for), replayed. 80 scenarios, 56 rules of the
  specification and 4 of the protocol; 65 hold, 12 not shown, 3 contradicted; replayed
  with no difference. Every trigger says its accepted statuses (`[200]`, `[302]`,
  `[302, 200]`, `[200, 302]`) and each refusal's — five of them a 200 on one interface.
  A service's failure is a requirement resting on it (`email-service-available`,
  `document-rendering-available`). No rule or answer cites a status. Seen: on
  `admin-get-convention-pdf` four failures of the rendering answered 503, 502, 500 and
  500 are now one refusal said 503 — a refusal that leaves several ways after the
  service's condition is not sayable; two contradictions are the trigger's `body`
  written in English where the target answers in French — a body in the reader's words
  is read by the judge as the words expected; one is a `Location` not recorded.
- Settled with the user after that run: a refusal that leaves several ways is taken as
  it is, one refusal and one status; a refusal's `body` is the target's exact text, in
  its language — told to both readers, said in ADR-0023. The triggers of `trainings`
  written before are not read again: its two contradictions of a body stay until they
  are.
- 2026-11-20 — Asked by the user: why a scenario's steps still leak the target's wire.
  A second design, read by the challenger (opus): keep the direction, reduce it — its
  first objections answered by two facts, every interface a scenario calls now read, and
  the protocol holding the scenarios about the wire. Cut, all taken: `sends` and `shows`
  written where a script derives them (48 operations of 50 need none); a reader that
  completes a trigger alone; a measure named "portable" — a check instead, a request a
  call says exactly being a finding. Its warning, in ADR-0024: an evidence now rests on
  the readings of every operation its scenario calls.
- A call and the request it is sent as, both ways (implementer opus, one round), then
  measured on `trainings` with nothing running: 564 of the 586 request steps of the 80
  scenarios judged are said exactly by a call, each rebuilt equal to the request its
  evidence recorded; 64 scenarios whole. The challenger had counted 568 and 65: 18 looks
  at two pages no interface describes, not 16, and two forms left out. Reviewer (sonnet):
  approved, Minor only. Settled with the user: an interface described with a form is
  always sent one.
- A scenario's step calls an operation (ADR-0024; implementer opus, one round, four
  commits): the notation, holes, play, "as written", the check, the builder told the
  operations it may call, the view, a script that converts. Reviewer (sonnet): conformance
  yes, approved, Minor only; taken in the thread — what every builder is told comes first
  in its prompt, so that it is served again from one builder to the next; a comment on a
  call paired to its exchange by place. For the challenger: nobody looked at a call step
  drawn in the page; the 564 of 586 rests on the measure made before the files were
  converted.
- `trainings` converted by the script, nothing recorded or judged again: 702 scenario
  files of 719 rewritten — those of the 46 interfaces never judged with them, wider than
  asked; a second run rewrites none. On the four interfaces: 80 evidences of 80 still as
  written, no judgement stale, the builder's check silent where it said 298 "write it as
  a call" before. Then replayed against the target and its twins: 80 scenarios, no
  difference. Left as requests: 18 looks at two pages of the back office, 2 bodies that
  are a list (rules of the protocol), 2 forms left out.
- 2026-11-20 — A scenario's sequence looked at in a browser for the first time, at the
  user's word that it could not be read: shrunk to six pixels with a provider, a call's
  inputs running over the target's lifeline with none. Redrawn in the thread as rows — a
  step a row, narrow lifelines, never shrunk; a row leads to its exchange, as the user
  asked, where a call opened its operation's sheet. A long path wraps; the column's
  rows align. The band that slides along a scenario's path through the gates is main's
  and was left.
- 2026-11-20 — The pre-merge review (challenger, opus), on the branch with `main` merged
  in (the distribution work, no ADR): merge after changes. Sound: the wire leaves the
  rule, then the scenario; nothing predicted, a call's request computed and never
  stored; every key added said by an ADR. Must-fix, all taken: the readers' templates
  showed a `body` described where the same files ask for a quotation — where the two
  contradictions of `trainings` came from; the builder's example of a service step was
  a request; `CLAUDE.md`'s exception named the `service` key alone; "Two specifications
  side by side" still retired the triggers; nothing of what the branch found was in the
  backlog; ADR-0024 said one function fills a request for both paths. Should-fix, taken
  (implementer sonnet): the check of a status cited in a rule is gone — a pattern on
  prose, the second in a row, whose false finding cost a reading anew, and no list for a
  person takes a role's finding; the readers' instructions alone say it now; one refusal name
  with two bodies in the protocol is a finding; the roles' call is not the older
  path's; `Exposure` for `Reading`, `Left.protocol` apart from `Left.common`,
  `StepView.interface` for `sheet`; the measuring script
  gone, the two that rewrite an older extraction under `scripts/migrations/`. Dropped:
  the scripts' untested corners, the page "not looked at". To the backlog: a scenario
  per rule of the protocol for each operation.

## Backlog

### The operation apart from the interface, the status in the trigger

- **Seen.** What survives the target being rewritten is of the specification (ADR-0019).
  Read with that rule, two things of a roles' reading do not survive: a requirement says
  the status and the body of its refusal (`otherwise: {status: 404, body: …}`), and a
  scenario's steps are requests at the target's own interfaces (`POST /a/{id}/b`). A
  target rewritten behind another interface keeps neither. A service and its conditions
  were set apart from the provider's wire on that rule; the target's own wire was not.
- **Settled.** The rule itself. A rule's `source` is a provenance, beside the rule.
- **Next.** A design, challenged first: whether a scenario's step names an operation and
  its inputs, the trigger giving the request — what the older path's scenarios do — and
  where a refusal's status goes (the trigger's `refuses` has it there). Not before a
  target is to be rewritten, or a second interface exposes the same operations.
- **Source.** ADR-0019; `src/shapes/roles.ts` (`stepSchema`, `rulesSchema`).
