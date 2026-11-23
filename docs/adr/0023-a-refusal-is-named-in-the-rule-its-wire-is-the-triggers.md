# ADR-0023 — A refusal is named in the rule; its status and body are the trigger's; a rule about the wire is the target's

Status: Accepted (2026-11-20) — the cut settled with the user after the challenger read a
wider design and said "change": what it kept is here, what it cut is under Alternatives.
Its last decision, "a scenario's steps stay requests", superseded by
[ADR-0024](0024-a-scenarios-step-calls-an-operation-the-trigger-gives-the-request.md).
Its decision "a rule about the wire is the target's" superseded by
[ADR-0028](0028-the-wire-is-described-not-proven.md): the concept `protocol` is removed.

## Context

What survives the target being rewritten is of the specification (ADR-0019). That rule set
a service apart from its provider. Read on the target's own border, a roles' reading
(ADR-0010) fails it in three places: a requirement holds the status and the body of its
refusal; some rules are about the wire and nothing else — a header that must be sent, a
body that must be a JSON object, an answer that must not be cached; and a scenario's steps
are requests at the target's routes.

The older path already has the binding that knows both sides: a trigger says, for an
operation and the interface that exposes it, the status it is accepted with and the status
of each refusal. The roles' path wrote none.

On the first target with a back office, a status identifies nothing: one interface is
accepted with 302 and refuses with 302, five of its refusals are a 200; another is accepted
with 302 or with 200.

## Decision

- **A rule names its refusal and says nothing of how it leaves.**

  ```yaml
  # roles/<interface>/rules.yaml
  requires:
    - {rule: a, fact: "…", otherwise: r, source: "…"}
  ```

  No status, no body, no header, no path in a rule or in what an operation answers. An
  outcome that is neither the accepted answer nor the refusal of a state — "the service is
  unavailable" — is a requirement too, resting on its service, refused by name.

- **A reading writes a trigger beside the rules**, the existing binding, one per interface
  read:

  ```yaml
  # roles/<interface>/trigger.yaml
  trigger: f
  interface: f
  operation: f
  answers: {status: [200, 302]}
  refuses:
    r: {status: 422, body: "{error: {code: X}}"}
  protocol: [p]
  ```

  `answers.status` is every status the operation is accepted with. `refuses` has one entry
  per refusal the rules name, the common ones included when this interface says them
  otherwise; `body` quotes what the target answers, letter for letter and in its
  language — it is what the judge sets an answer against, and a body reworded made two
  contradictions of a first target that answers in French. Two rules that refuse by the
  same name refuse the same way: a different status or body is a different refusal.
  `protocol` names the target's rules about the wire that hold on this interface.

- **A rule about the wire is the target's**, in `roles/protocol.yaml` with what the whole
  target says of its wire:

  ```yaml
  target: t
  runs-with: […]
  rules:
    - {rule: p, applies-to: "…", fact: "the body is empty or a JSON object",
       otherwise: {refusal: malformed-body, status: 400, body: "…"}, source: "…"}
  refuses:
    r: {status: 401, body: "…"}      # how a common rule's refusal leaves
  errors: […]
  contract: […]
  ```

  A rule of the wire that refuses nothing — an answer that must not be cached — has no
  `otherwise`. It is proven as a rule is — a scenario, an evidence, a judgement — and drawn on the
  target's side: it is not counted in the specification. `roles/common.yaml` keeps the
  rules that hold for the whole system in the system's words, each refusing by name.

- **No refusal is recognised by its status.** The judge is given the rules, the trigger
  and the protocol with the evidence, and says what was refused; nothing computes it.

- **A scenario's steps stay requests.** Its proof is the target's and is recorded again
  when the target's routes change. Said, not solved.

## Alternatives

- *A scenario's step calls an operation, the trigger building the request*, and *an
  operation with no reading called through a trigger derived from its interface's
  description* — what was first proposed. The challenger's cut, taken: every step but the
  judged call would go through derived triggers named after the interface and its body's
  fields, and a hole would still read the answer's body — the wire under another name; a
  scenario that sends a body no input names (a list where an object is due) could no
  longer be written.
- *`refuses` keyed by the rule*: two rules sharing a refusal would say its wire twice.
- *A status per named outcome in `answers`*: an outcome that is not the accepted answer
  is a refusal, and the mechanism exists.
- *The rules about the wire kept in the specification, reworded*: "the caller is
  authenticated" would stand for "an `Authorization` header carries a key" — a rule nobody
  wrote, proven by a scenario about something else.
- *Reading every interface again*: moving a status from a rule to a trigger is a
  rewriting of files.

## Consequences

- Amends ADR-0010: a reader of an interface writes two files; `common.yaml` is two.
- The trigger's shape serves both paths: `answers.status` may be several, a refusal may
  say its `body`. The older path's judging by status is unchanged where one status is
  declared.
- An operation is still read from one interface and named after it. A second trigger for
  the same operation is what a second interface would write; none has been met.
- A refusal says one status. Where a target answers one refusal several ways — a
  rendering that fails with 503, 502 or 500 after what its provider answered — the
  trigger says one of them and the others are in the evidence alone. Accepted by the
  user: the specification has one refusal there.
- A scenario is not portable to a rewritten target, and an actor is still a set of
  headers: both open.
