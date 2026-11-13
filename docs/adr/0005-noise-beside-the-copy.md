# ADR-0005 — A reference is a played copy, and its noise is kept beside it

Status: Accepted (2026-11-13) — written by the main thread working alone, challenged,
reviewed by the user.

## Context

Two executions of one scenario never answer exactly the same: a date, a token, a generated
id. ADR-0001 settles that a reference is one played copy plus what differed between two,
equal noisy values keeping equal marks — noise as a wildcard per leaf let three mutants of
eight survive in the spike. The spike wrote the mark in place of the value (`[:noise 1]`),
which EDN could tell from anything a target answers. In YAML or JSON a mark inside a
recorded body is a value like another: a target may answer `{noise: 1}`.

## Decision

A reference is the first played copy, **untouched**, plus a list beside it:

```yaml
act:
  response: {status: 200, body: {a: "t1", b: "t1", c: "u1", d: 1}}
noise:
  - {at: [act, response, body, a], class: 1}
  - {at: [act, response, body, b], class: 1}    # equal to `a` in both executions
  - {at: [act, response, body, c], class: 2}
```

- A place is noisy when the two executions differ there. Two noisy places are in one
  class when their values are equal in the first execution **and** in the second.
- Where the two answers do not have the same form at a place (a key on one side only, two
  lists of different lengths), the whole value at that place is one noisy place.
- **A status that differs is not noise.** The scenario is unstable and gets no reference.
- A replay is one more played copy: outside the noisy places it must equal the reference;
  at a noisy place any value is accepted, but the places of one class must still be equal
  among themselves, and two classes must still answer two values — a date answered where
  another date was is a difference, though both are noise.
- Only answers are walked: what the scenario wrote is compared as a whole elsewhere (a
  reference whose written part no longer matches its scenario is stale).

## Alternatives

- **The mark in place of the value**, under a key unlikely to collide. Unlikely is not
  never, and a reference would no longer be a played copy: two schemas, two walkers.
- **A scrubber list** (patterns of fields to ignore). Written by hand, per target; what two
  executions show is derived instead. Still needed for what two executions do not show (a
  value that changes with the day) — not built.
- **No classes** (a wildcard per place). Measured in the spike: mutants survive.

## Consequences

- A value noisy with no equal elsewhere is a class of one; there is no second kind of mark.
- A reference keeps one real value at each noisy place: readable, and usable as an example.
- Two noisy values that may coincide by chance — two instants in one unit of a coarse
  clock — turn a replay red when they do. None was met; the day one is, that pair of
  classes is what a scenario would have to declare as free to coincide.
- The noise of a scenario is a measure to show: a reference where most of the answer is
  noisy compares little.
