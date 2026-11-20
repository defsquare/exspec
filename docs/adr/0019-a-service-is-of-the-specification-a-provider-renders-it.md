# ADR-0019 — A service is of the specification, a provider renders it; a scenario gives a service a condition

Status: Accepted (2026-11-20) — the rule and the two names settled by the user; the design
read by the challenger before it was built, "build with changes", taken but for one point
said below.

## Context

A target that calls another system was first described with one word for that system: what
the target calls, where it calls it, what stands for it. Read on a first target, that word
held two things that do not change together. That an attestation is emailed to a learner
is what the system does: rewrite the target and it must still be true. That the email
leaves as a `POST /emails` to one vendor, refused with a 422, is how this target does it:
another target may do it otherwise and be the same system.

The scenarios showed the cost. One that wanted "the compiler fails" wrote the vendor's
path, its status and its error body into the proof; a rule of the reading said "a GET with
a Range header answered 404 or 410 means gone".

## Decision

- **The rule that sorts a concept: does it survive the target being rewritten?** A target
  can be replaced and the specification stays; the target's description and the bindings
  are what ties the specification to the new one. What survives is of the specification;
  what may not is of the target.

- **A service is an element of the specification**, on which operations rest: what the
  system needs of someone else, in the business's words. **A provider is on the target's
  side**: the system this target calls to get that service. A provider *renders* a service
  — a binding, the one shape that knows both.

  ```
  specification   operation, rule, fact, structure, field, service, condition
  bindings        projection, trigger, detects, renders
  target          target, interface, observable (variant: provider)
  ```

  If a service changes, the specification may change. If the target changes its provider,
  the specification does not: the provider, what stands for it and `renders` are redone.

- **A service says its conditions**: the states of it under which the system answers or
  sends something different outward. A condition may take parameters.

  ```yaml
  # exspec/services/s.yaml
  service: s
  says: keeps a document and gives it back by its key
  conditions:
    - condition: forgets-everything
      says: no document is kept any longer
    - condition: refuses
      takes: {address: string}
      says: what is sent to that address is refused
  unsure: []
  ```

  A failure the system tells apart — the service unavailable, a request refused — is a
  condition like another. A variation the system only tolerates, a header sent or not, is
  the provider's format and no condition.

- **A condition is a concept of its own, beside the fact.** A fact is read off the target
  and tells which requirement refused. A condition is never read: it is posed, and what
  the provider answers under it is kept, not compared (ADR-0018).

- **A scenario gives a service a condition; it never names a provider.**

  ```yaml
  - {when: arrange, service: s, is: refuses, with: {address: "{{n.body.to}}"}}
  - {when: arrange, service: s, is: forgets-everything}
  ```

  Such a step is told from one sent to the target by its `service` key, where the other
  has a `request`: the notation is the discriminant, no literal field repeats it. The
  conditions are applied in the order written. A parameter is a value the scenario can
  know — one it wrote, or one the target answered: its holes are filled as a request's
  are. A value that only travels between the target and its provider is no parameter.

- **The provider has to satisfy the condition** (ADR-0020 says how). One it does not take
  — unknown, a parameter missing, no provider rendering the service — makes the step
  unplayable, and the steps after it are not sent: a scenario is never played under a
  condition it did not get.

- **A service is not judged; the rules that rest on it are.** A requirement or an effect
  of a reading may name the service it rests on:

  ```yaml
  effects:
    - {rule: a, says: "…", service: s, source: "…"}
  ```

  Its condition is said in the rule's own words. A rule cites nothing of a provider.

- **An evidence is the provider's**: a side effect names the observable it was captured
  through — the provider — and is compared at the wire (ADR-0018). A target that changes
  its provider is recorded again; its scenarios stay.

## Alternatives

- *One concept, on the target's side* — what was built first, the name `service` chosen
  over `provider` for being what a compose file calls it. A scenario and a rule then held
  a vendor's wire.
- *What an operation asks of a service, declared* (`asks`, and its binding to a provider's
  interface): the challenger's cut, taken — nothing reads it. What ties a rule to a call
  stays undecided until a rule is computed from one.
- *No link at all from a rule to a service* — the challenger's, not taken: an operation
  rests on a service, and a page that draws the specification has to say so.
- *A condition as a fact with a mark saying it is posed*: "a scenario looks at a fact"
  would be false of it.
- *A condition's parameter read from what the target sent its provider*: the provider's
  wire back in the scenario.

## Consequences

- What the first target's readings hold of a provider's wire — a path, a status, a header
  in a rule — is a defect of a reading, told to its reader.
- A scenario is still written against the target's own interfaces, and a requirement
  still says the status of its refusal: the same question one level up, not answered here.
- A provider's variation that is no condition cannot be put in by a scenario: it stays an
  expectation of the provider's reading, not shown.
- A service has one provider in a target: two that render the same one are a finding of
  each. A service split between two providers has not been met.
