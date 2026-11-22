# ADR-0025 — A state is named by what is seen in it; a scenario starts from it

Status: Accepted (2026-11-22) — a design from a conversation with the user; read by the
challenger: "keep the direction, reduce it", taken whole; approved by the user.

## Context

A rule already speaks of states, in prose only. On six interfaces read of one target the
states of one structure are cited 80 times, under spellings that differ from one reader to
the next (`canceled`, `cancelled`); nothing says two rules mean the same state. A reader
also writes, rule by rule, a `situation` and how to reach it (`hints.yaml`): the state and
its path, once per rule, in prose.

A scenario already builds states, and does not name them. On `trainings` (52 roles, 1170
scenarios) the same arrangement — a program, a client, a trainer, a session scheduled — is
written 125 times, by 15 builders, in three orders. On a target whose inputs are fragile a
builder that cannot find the calls that move an instance on gives up, and each builder
searches for that way alone.

A service has named conditions (ADR-0019); the system itself has none.

Settled by the user before this design: a state others start from is first proven —
reached through the interfaces by a scenario, and that scenario judged to hold; nothing is
written in the target's store that its operations did not put there.

## Decision

- **A state is of the specification: a name, the structures it is about, what is seen in
  it.** It is a business situation — a session planned, a store with a product awaited.
  What defines it is what a reading of the system shows once in it, never how it was
  reached: a state no reading shows cannot be named. One sentence, the one a judge reads.

  ```yaml
  # exspec/states.yaml
  - state: s
    of: [A, B]
    seen: "reading the a shows …"
    path: f/accepted           # the scenario that reaches it, <operation>/<scenario>
    serves: [g/r, h/q]         # the rules that need it, <operation>/<rule>
  ```

- **The states are gathered after the interfaces are read, then reviewed.** One pass reads
  every `rules.yaml` and `hints.yaml` and writes `states.yaml`; it writes no rule. The
  user reviews names, sentences and the rules served before any path is sought, and
  merges, renames or drops.

- **A path is of the proof: a scenario that ends in the state, judged to hold.** It is a
  scenario of the operation that last moves the system into the state, named in the
  state's entry — built, recorded, replayed and judged as that operation's, by what
  exists. A state is reached when that scenario's judgement is `holds` and not stale. One
  path a state.

- **A scenario starts from a state.** A fourth step, told by its key:

  ```yaml
  - {when: arrange, state: s, name: p}
  - {when: call, as: a, call: {operation: f, with: {x: "{{p.c.id}}"}}}
  ```

  Before it is played or compared the step is replaced by the path's steps up to its
  call, as `arrange`, their names under `p`; `p.c` reads what the path's step `c`
  answered. A scenario that starts from a state not reached does not pass its check. The evidence keeps
  every step played, the path's with the others: a reference, its noise and the text a
  judgement stands on are what they are today, and a path that changes makes stale the
  judgements of the scenarios that start from it.

## Not decided here

Measured first on three states of `trainings`; each of these is a decision of its own
once that measure is in.

- A state that narrows another.
- A rule that cites the state before its call and the state after — two names, and a
  third for the state a refusal is played from — and what follows from them: the order
  paths are sought in, the states each operation was played from.
- A path that starts from another state.
- A state that holds a service's condition: a condition is not lifted within a scenario.
- What becomes of a hint's `situation` once a state says it.

## Alternatives

- **A state named by its path** (a label on a sequence of calls). Rejected by the user:
  the business recognises a state by what is seen in it; two orders of the same calls
  would be two states.
- **`seen` as a look the CLI compares** (ADR-0007). The roles read no projection; it would
  be a second mechanism beside the `after` step a judge already reads.
- **The states read before the interfaces, as the structures are.** The review would have
  no rule to show.
- **An evidence that keeps the scenario's own steps only.** A hole filled from the path
  could not be played back, and a judgement would outlive a path that changed.
- **A path kept apart and judged against `seen`.** A builder and a judge's task more, for
  a scenario the extraction already holds.
- **A richer seed**, or **several scenarios played on one state in place.** The first
  writes states the target may not allow; the second lets a scenario falsify the next.
- **The world of a proven state captured and restored instead of replayed** — wanted by
  the user, set apart: it changes play time only, and asks every target for two more
  lifecycle lines (ADR-0004). A cache rebuilt from the path at every recording.

## Consequences

- One file, one step kind; one pass after the readers; the builder's
  instructions say a state may be started from.
- A path that breaks takes down every scenario that starts from it. Accepted by the user:
  the state is no longer reached, they prove nothing.
- Nothing checks that the rule a path proves says what `seen` says: the review reads
  both.
- An evidence is no shorter: what a judge costs does not change. What changes is what a
  builder writes and searches for.
- A literal of a path (a slug) is in the world of every scenario that starts from it: a
  scenario that creates the same one collides. A path's literals are said in `seen` or
  kept out of the way.
