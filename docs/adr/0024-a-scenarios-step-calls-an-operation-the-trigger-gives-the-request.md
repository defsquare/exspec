# ADR-0024 — A scenario's step calls an operation; the trigger gives the request

Status: Accepted (2026-11-20) — asked by the user; the design read twice by the
challenger: "change" the first time (ADR-0023 › Alternatives), "keep the direction,
reduce it" the second, taken whole. The conversion measured on a first target before
anything was built on it.

## Context

ADR-0023 took the status of a refusal out of the rule and left a scenario's steps as
requests at the target's routes: "said, not solved". A proof written so falls when the
routes change, though what it proves has not.

Two things made the first objections fall. Every interface a scenario of the first target
calls is now read: each has named inputs, a structure it answers and a trigger. And a rule
about the wire is the target's (ADR-0023): a scenario that sends a list where an object is
due proves one, and has no reason to be written in the specification's words.

Measured on that target before deciding, with no agent and no target running: of the 586
request steps of the 80 scenarios judged, 564 are said exactly by a call — the request
built back equals the one written, and, its holes filled from the evidence's own answers,
the one recorded; 64 scenarios convert whole. The 22 left: 18 looks at two pages no
interface describes, 2 bodies that are a list, 2 forms left out.

## Decision

- **A step calls an operation by its inputs' names.**

  ```yaml
  - {when: arrange, as: a, name: s, call: {operation: f, with: {x: 1, y: "{{c.id}}"}}}
  ```

  A step is a call, a request or a service's condition, told by its key (`call`,
  `request`, `service`) as ADR-0019 does. The caller is the step's `as`.

- **The trigger gives the request, and what is not written is derived.** An input goes
  where the trigger's `sends` says; with no entry, to the path parameter, the query
  parameter, or the top-level field of the body or of the form that bears its name in the
  interface's description. `sends` is written only for an exception:

  ```yaml
  sends: {amount: [body, price, amount]}
  ```

  A place may be `[form, name]`. A name that is both a path parameter and a field of the
  body is refused, never chosen. An interface whose description has a form is always sent
  one, empty when no input goes to it.

- **A hole reads what the step it names answered, in the words of that step.** Of a call:
  a path in the structure its operation answers — `{{s.id}}`. Where that structure is in
  the answer is the trigger's `answers.shows`, and, with none, the one place of a
  successful response's description that holds it. Of a request: a path in the answer as
  it is — `{{s.body.data.id}}` — as before. A call whose operation answers no single
  structure can be named by no hole.

- **A request step stays, for what no call says**: a rule of the protocol, a page no
  interface describes, a body no input names. A request that a call says exactly is a
  finding of the scenario's check, told to its builder with the call: it is not left to a
  preference.

- **The evidence does not change.** An exchange keeps the request as sent and the answer.
  An evidence is as written (ADR-0013) when each of its requests is the one its step
  gives — for a call, through the trigger. Nothing of a call is copied into it.

- **The builder is given, for each operation it may call, its inputs and what it
  answers**, computed from the readings each time.

## Alternatives

- *Every `sends` and `shows` written in its trigger, by a script or a reader*: 48
  operations of 50 need none. What a script derives is not stored.
- *A reader that completes a trigger without touching the rules*: no reading fails its
  check for a place left to the default; the two exceptions of the first target are two
  lines.
- *Request steps allowed in a scenario of the specification and counted* ("portable",
  a share of the proof): a number on a leak, and a name promising what nothing proves —
  no second target is replayed. The check says where a call was possible.
- *An empty form only when an input goes to it*: the request sent would depend on whether
  an input is given; twelve scenarios of the first target write the empty form, two none.
- *The older path's call (`{operation, with, caller}`) reused as it is*: a roles' step
  already says who calls, with `as`.

## Consequences

- Supersedes ADR-0023's "a scenario's steps stay requests". Amends ADR-0013 (what "as
  written" compares), ADR-0019 (a third key tells a step) and ADR-0010 (what a builder is
  given).
- **An evidence now rests on the readings of every operation its scenario calls.** An
  input renamed in one reading — a reader that reads anew keeps no name — makes stale the
  evidence of every scenario that calls it, where it made stale its own interface's only.
- The trigger, its `sends` and its `shows` serve both paths: they are not what a
  retirement of the older path removes. Each path fills a request with a function of its
  own — the roles' derives the places a trigger leaves out and keeps the values typed, the
  older one reads `sends` alone and writes a URL.
- An answer that is a list of a structure has no place by default; an input sent once
  per element of a list has none at all (`[each]` is a projection's, not a trigger's).
- A field's name in a hole is the structure's, which a first target's readings took from
  the wire. An actor is still a set of headers behind a name (ADR-0004). Both open.
- Nothing shows a scenario respected by a second target: none has been replayed.
