# ADR-0018 — What a target sends to a provider is compared: a side effect at an observable at its boundary

Status: Accepted (2026-11-19) — the direction settled by the user; the design read three
times by the challenger, its last verdict taken whole. What a provider is, beside the
service it renders, is ADR-0019.

## Context

A target that calls other systems does most of what it does through those calls: "the
convocation is emailed with its PDF" shows in no answer of its own API. The rule the design
rested on said that only what the target's interfaces expose is compared, and that an
observable detects and explains and is never the reference. The spike's metamodel already
had the place for such a call — a `SideEffect` captured through an `Observable`, of which
the system a target calls is a variant, `Service` there — and no observable was built (ADR-0004).

A provider is not a target. The target is observed: its state is reached through its
interfaces or its own seed, its answers are never dictated, it is judged. A provider is
commanded: something stands for it, its state is set as it is, its answers are dictated,
and it is not judged.

## Decision

- **No concept is added. A call to a provider is a side effect, a provider an observable.**
- **The rule is what changes**: only what the target says outward is compared — what it
  answers at its interfaces and what it sends to a provider. What a provider answers it is
  kept, not compared. An observable inside the target detects and explains.
- **An observable is at the target's boundary or inside it.** At the boundary, someone
  other than the target is on the other side, and what the target sends there is its
  contract. Inside, it is an implementation's detail. The sort belongs to the observable,
  not to its variant: a bus may be a queue of the target's own, a file an export a third
  party reads. A provider is at the boundary; nothing else is sorted yet.
- **An exchange of an evidence may hold `side-effects`**, each in the terms of a provider:

  ```yaml
  side-effects:
    - observable: p
      request: {method: post, path: /b, body: {to: x, file: {bytes: 1234, sha256: 9f…}}}
      response: {status: 200, body: {id: e1}}
  ```

  Absent: nothing was observed, and nothing is known of what the target did. `[]`: every
  declared provider was observed, and the target sent nothing — "refused, and nothing is
  sent" holds on `[]` only. No header is kept: a key to a provider must not reach a
  versioned file. A file in a body is its length and its digest.
- **Compared**: the observable, the request's method, and every place of its path, query
  and body outside the noise; the number of side effects of an exchange; a key absent on
  one side and present on the other. **Not compared**: the response, its status included.
  Its places are still walked for noise, and a class of noise holds across them: an id a
  provider gave is found again where the target repeats it.

## What it changes in the spike's metamodel

`docs/brief/` is never edited; these statements of it no longer hold as written.

- `SideEffect`, "carried out during the judged call": a side effect is of each step, held
  by its exchange.
- `SideEffect`, "it is not compared": at a provider, what the target sent is.
- `SideEffect`, "a detector says which structure or fact it concerns": not for a provider.
  `Detects` is unused there; what ties a rule to a call is decided with the first rule
  computed from one. A side effect's place, the spike's `on`, is the request's method and
  path.
- `Observable`, "a place of the target": a place where what the target did is captured. A
  provider is no part of the target.
- The target group, "read off the target and never invented": what stands for a provider
  may be written.
- The spike's journal, "a side effect detects, it is not judged": reversed for a provider.

## Alternatives

- **A provider is a target**, its twin that target's way to start. One concept fewer on
  paper; half of what holds for a target does not hold for it — it is seeded as one
  pleases and never judged.
- **A new concept `Provider` taken out of `Observable`, and one for the recorded call.**
  The challenger's first preference, since "not compared" is in the definition of a side
  effect. Two concepts to say what two existing ones say once the rule is amended.
- **A key per variant** (`provider-calls`). `side-effects` with the observable named in
  each entry says the concept; a database's entry will have its own form in the same list.
- **A reference told stale when a response differs.** Guessed: a response differs too
  when the request did. What stood for a provider is a fact of a run, to check before
  playing.

## Consequences

- ADR-0004's "no observable is built yet" ends with the first provider observed, and its
  "a refused call changed nothing is not checked" becomes checkable for what leaves to a
  provider.
- ADR-0005's "only answers are walked" no longer holds: a side effect's request and
  response are walked. A status of a provider's response does not make a scenario unstable.
- ADR-0013: an evidence's places go under a side effect too; a scenario is also unstable
  when two executions sent another number of side effects, to another observable or with
  another method. "Requests are not compared" stays true of the scenario's steps only.
- `side-effects` has two meanings in the records: the spike's, never compared, and this
  one.
- Side effects are paired by position: a target that sends two calls at once may swap
  them, and the scenario is told unstable. A request's path is one place: a value drawn
  into it makes the whole path noisy.
- Nothing yet says which observables were observing in a run, nor what stood for each;
  nothing fills `side-effects` until something listens between a target and its providers.
  A key sent in a query or a body would reach a versioned file.
