# ADR-0011 — A requirement says the input it is about, and the page gathers those under the input

Status: Accepted (2026-11-15) — the key chosen by the user over a deduction by the page;
the challenger's review taken.

## Context

A reader writes one requirement per condition an operation checks (ADR-0010). Most of them
are about the form or the presence of one input: on one target 137 of 174 requirements
answer the same refusal, and one operation has 17 of its 19. On the page each was a gate of
the operation's column, at the level of what the operation asks of the situation and of
what it does: wanted, but they hid the rest.

Nothing stored says which input a requirement is about. An input names the field it is
(`takes.<input>.field`), not what a rule says of it; the rule's name carries the input's on
most rules and not on all — 161 of 174 on that target.

## Decision

- **A requirement of a rules file may have `on`: the name of one entry of `takes`.** The
  reader writes it when the request alone, with nothing stored, is enough to tell whether
  the requirement is met, and it looks at that one input — its presence, its type, its
  length, its form, its range. A requirement that needs what is stored (it exists, it is
  not taken yet), who the caller is, or two inputs together has none. A shared rule has
  none.
- **The reader's check refuses an `on` that names no entry of `takes`.**
- **The judge is not given `on`**, as it is not given a rule's source nor the structure an
  answer names: the sentence of the rule says what it is about, `on` only files it. A
  judgement's hash does not move with it.
- **On the page, the requirements on an input share one stop of the operation's column**,
  drawn where the first of them is: a mark and a word per requirement, by input, each
  coloured by its judgement and opening the rule as a gate does. A requirement on an input
  that does not hold keeps a gate of its own as well: nothing that fails is tucked away.
  The counts and the operation's colour are those of its rules, each counted once.
- The extraction's rules declared under an input (`takes.<input>.rules`) are drawn the
  same way: one drawing for one idea.

## Alternatives

- **The page deduces the input from the rule's name.** Works on the readings kept; a
  heuristic on names, and the rules it misfiles are not seen.
- **The rules nested under the input** (`takes.<input>.requires`), as the extraction's
  shape does. A rule would be found in two places: the check, the hints, a scenario's
  `rule`, the judge's task and the page all walk `requires`.
- **Bounds on a structure's field.** Set aside by ADR-0010: a bound is a rule of the
  operation that checks it.
- **A kind — input or situation — instead of the input's name.** The page could not group
  by input.

## Consequences

- A reading written before the key draws as before, every requirement a gate, until read
  again.
- The reader decides, and may hesitate: a uniqueness check answers as a form check does and
  needs what is stored; a wrapper object is an input of its own. The instruction gives the
  test — the request alone is enough — and the page shows the result.
- The word on a mark is the rule's name without its input's when it starts with it, the
  whole name otherwise: a display, nothing rests on it.
