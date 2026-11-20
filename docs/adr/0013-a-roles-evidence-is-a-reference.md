# ADR-0013 — A roles' evidence is a reference: its noise beside it, replayed with no agent

Status: Accepted (2026-11-18) — the direction settled by the user (the specification takes
the roles' form, the evidence as a reference first); the design left to the main thread,
the challenger's review taken. Amended 2026-11-19: the places under a side effect, another
number of side effects as what makes a scenario unstable or different (ADR-0018).

## Context

The evidence of a roles' scenario is played once (ADR-0010): no second execution, no
noise, nothing to replay it against. The path where rules are computed has references
(ADR-0005), and `replay` with them; `extract` cannot run the roles while comparing two
versions of a target exists on that path only.

A judgement is stored with a hash of what the judge was given, the exchanges among it. The
gate of `roles build` played every scenario of an interface again each time a builder ran
and wrote every evidence anew: a timestamp in a body, and each judgement of the interface
was stale.

## Decision

- **An evidence may have `noise`**, the list a reference has (ADR-0005), its places
  starting at the exchange: `{at: [exchanges, 2, response, body, a], class: 1}`. The
  evidence stays the first played copy, untouched. Without the key it was played once and
  is not a reference yet; with it, even empty, it is one.
- **An evidence is of its scenario as written** when it names the scenario's rule, has one
  exchange per step with the step's `when` and `as`, and each request it sent is the
  step's, its holes filled from the evidence's own answers. Derived each time, nothing
  stored. An evidence with a step that could not be played is of no scenario.
- **`roles build` leaves alone an evidence that is of its scenario as written**: its gate
  plays a scenario only when its evidence is missing, does not parse, or is of the scenario
  as it was. A builder is skipped when every scenario has its evidence as written.
- **`roles record` makes the references**, as `record` does, with no agent. On a stack it
  starts itself: an evidence of its scenario as written, taken on this version of the
  target, is the first copy — the scenario is played once more and the noise is what
  differs between the two; the exchanges are not rewritten, so its judgement stands. Any
  other scenario — no evidence, one of the scenario as it was or of another version, or
  all of them when forced — is played on that stack and again on a second one, and the
  first of the two copies is written. A status that differs, another number of
  exchanges, or a step that could not be played in either copy: unstable, no reference. A
  reference of its scenario as written is kept, not played, unless forced — whatever
  version it was taken on: it is what a replay on another version is compared with.
- **`roles replay` plays each reference's scenario once on a fresh stack** and tells the
  differences outside the noise, by ADR-0005's rule. Nothing is written.
- **A judgement's hash is unchanged**: it is of what the judge was given. It moves when the
  stored copy does, and a replay stores nothing.
- The events are those of `record` and `replay`, a scenario named `<interface>/<slug>`;
  each play is told by `steps-played`, as the builder's are, and an interface whose rules
  or scenarios fail the builder's check by `gate-checked`: none of it is recorded or
  replayed, and the command fails.

## Alternatives

- **The noisy places set aside in the hash.** Needed only if a replay rewrote the evidence;
  it does not.
- **The gate of `roles build` plays twice.** Two plays on one stack share what the seed
  drew and call it stable (ADR-0004); the next start would tell it as a difference. And a
  gate checks a form (ADR-0010).
- **The scenario's text, or its hash, stored in the evidence** to tell whether it changed.
  Derivable from the steps and the answers.
- **`replay` reading both forms.** Two ways to play behind one command, while the two forms
  of specification live side by side; one command once `extract` runs the roles.

## Consequences

- ADR-0010's consequence "the evidence is played once: no second execution, no noise; it
  is not yet a reference" no longer holds; comparing two versions of a target with the
  evidence is `roles replay` on the second.
- ADR-0005's reference has a second shape; marking the noise and comparing work on a list
  of answers, whatever played them.
- Evidence written before this decision parses, and waits for `roles record`: one play.
- The first copy may be days older than the second: what changes with the day is told as
  noise there, and as a difference on a later day, as on the computed path (ADR-0005).
- Requests are not compared: a request is the scenario's step and the answers before it.
- Recording an evidence again makes its judgement stale; the judge then reads the whole
  interface again and writes every judgement of it. Judging only what is stale is not
  built.
