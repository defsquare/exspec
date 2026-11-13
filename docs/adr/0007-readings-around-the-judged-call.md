# ADR-0007 — What is read around the judged call: the facts its operation cites, through a projection that locates

Status: Proposed (2026-11-13) — written by the main thread working alone, challenged, to be
reviewed by the user.

## Context

A rule is judged on what held before the judged call and what holds after it: where two
refusals answer one status — the norm on both targets of the spike — only the fact
evaluated before tells which requirement refused. The spike's instances gave a scenario an
`:assert` list and left three questions open: who chooses what is looked at, the scenario
or the facts its operation cites; how a fact written "the caller…" is evaluated for
another actor; and nothing said how a projection finds the one instance a fact is about —
the spike held that in "readers" the redrawn shapes dropped. Guessing it from names breaks
on the first target whose route says `{ownerId}` where the field is `id`.

## Decision

- **A projection says how it locates an instance, and which status means there is none**:
  `locates: {<field>: [path|query, <name>]}` and `absent: <status>`, beside `shows`. It
  mirrors a trigger's `sends`, and is a binding: the specification still knows no route.
- **The player reads, before and after the judged call, every fact the operation cites**
  — required, in an effect's `when`, changed by an effect's `then` — and every field an
  effect's `then` changes, as the call's caller. Nothing has to be asked for a rule to be
  judged. **A scenario's `assert` adds looks**: the same fact as another actor, a shown
  field.
- **A fact is evaluated for an actor**; "the caller" in its name is the actor the reading
  is taken as — the judged call's caller unless the scenario says another. A condition's
  `seen-by` therefore says nothing more, and is left to be removed.
- **A reading is kept raw and whole**: what the projection's interface answered, status
  and body, per term of the fact that reads. The value at the place read and whether the
  fact held are derived from it, every time: correcting where a projection shows a
  structure, a field's path or what the value must be needs no new recording. Changing
  *which* instance is read, or the number of terms, does.
- **Any status other than a success or the declared `absent` is unreadable**, never
  "false". A fact that cannot be read is unknown, and what depends on it is not judged.
- **Readings are answers like the others**: walked for noise, compared at replay.

## Alternatives

- **Only what the scenario asks for is read.** The scenario stays in control, and every
  scenario written by an agent must list the facts of its operation's rules — or its rules
  are silently unjudged.
- **Infer the locating from names** (a path parameter named like a field). No key to
  write; a heuristic that fails without saying so.
- **`exists` is "a success against anything else".** One target of the spike answers 401
  to an unknown instance and to a forbidden one: "does not exist" would be read where
  "cannot tell" is the truth.
- **Store the truth** (`before: true`). Shorter references; a wrong condition then lives
  in every reference recorded with it.

## Consequences

- Two extra calls per fact cited, per scenario; a target of a few hundred scenarios pays
  it in seconds.
- A fact no projection can read is named by a check; its rules stay declared only. On a
  target that hides absence behind another status, "exists" is unreadable until a human
  decides what the projection should declare.
- A reading goes through the target's own access rules: read as an actor who may not see
  the instance, a fact is unreadable for that actor.
- An operation that cites many facts makes every one of its scenarios read them all, also
  where the scenario is about one input: the price of asking nothing.
