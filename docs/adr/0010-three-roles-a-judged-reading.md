# ADR-0010 — A judged reading by three roles: a reader, a scenario builder, a judge

Status: Accepted (2026-11-15) — by the user, after three whole targets were run through the
roles.

## Context

The specification grew terms so that every rule could be computed from what the target
answers: a spike that pushed them further proved 3 of the 11 rules of one operation, and
each new term was a step towards a test framework — the target's repository already has
its tests. One agent session wrote the rules, the scenarios meant to prove them, and decided
what to cover: on one target, three runs declared 18, 10 and 8 operations for 93 interfaces.

By hand, three roles kept apart gave, on two operations of two targets: the same rules in
substance from one run to the next, nearly every situation reached through HTTP alone, and a
judge that found 19 of 19 planted contradictions.

## Decision

- **Three roles, none judge and party**, each a session of its own:
  the **reader** reads the code and the repository's tests and writes what an operation is
  supposed to do, in sentences, with the place in the code each rule comes from, its doubts
  apart, and hints on how the tests reach each situation — it never sees the target run;
  the **scenario builder** writes calls that exercise each rule — it never sees the code;
  the **judge** concludes from the rule and the recorded exchanges alone, with a word
  (`holds`, `contradicted`, `refused-unexpectedly`, `not-shown`), a confidence and the
  evidence it rests on.
- **The tool walks the interfaces**: one reader, one builder, one judge per interface, the
  operation named as its interface. What is covered is the interface list, not a session's
  choice. What holds for every operation is read once, before, by a reader of its own.
- **The structures are read first, by a reader of their own**, into `structures.yaml` in
  its existing shape, without bounds — a bound is a rule of the operation that checks it.
  A reader names them: each input says the structure's field it is, the answer the
  structure it shows. That is what files an operation under a structure, by the rule
  `view` already has; the reading is walked in `view` from the structures to their
  operations to the evidence and the judgement, with no page of its own.
- **The separation is built, not asked**: the reader's target is not started; the builder
  has no shell and reads only the rules, the hints and the interface descriptions; the judge
  has no tool. This is where the decision departs from ADR-0006, which gave the agent a
  shell and the CLI's commands and set aside a tool of the agent's own: the builder's one
  access to the target is a tool, `play` — steps in, the target reset, the steps sent, the
  answers out — because a shell would let it read the code. `roles play` is the same thing
  as a command, for a person.
- **A scenario of a builder is raw calls to the interfaces** — arrange, before, the call,
  after — with no answer in it, and one kind of hole: a value of an earlier answer. The
  tool plays it from the starting state and records the evidence; the agent never writes an
  answer.
- **A judgement is stored**, beside the evidence, with the model, the time and a hash of
  exactly what the judge was given. It is not derivable: it is what a judge said once, as a
  reference is what the target answered once. A judgement whose rule or evidence changed is
  told stale from the hash.
- **A gate checks a form**; whether a scenario reaches its rule is the judge's `not-shown`,
  never the gate's.
- The files live under `specimen/roles/`, apart from the specification, the scenarios and
  the references, which are untouched.

## Alternatives

- **The reader writes `operations/*.yaml` in today's shape.** The user's wish is that the
  specification keeps its shape; folding the sentences into it changes `operationSchema`,
  the checks, the verdicts and the page before the trial has said which terms are still
  used. Decided after the runs.
- **A decision model as the judge.** Nearly free and right on plain cases, 18 of 19; it
  names no evidence, which a human reading needs. Possible later as a filter.
- **The builder with a shell and a brief that forbids the code.** What the trials by hand
  did; nothing holds it.
- **The judgement made again at each reading.** Costly, and two readings of one page would
  differ.

## Consequences

- A first run had the readers write no structure: nothing to walk the reading from, and
  a page apart to read it. The structures came back as the one concept of the
  specification the roles keep in its own shape.
- Two forms of specification live side by side until one is folded into the other; the
  facts' conditions, the projections and the triggers serve nothing in the roles' path.
- The evidence is played once: no second execution, no noise; it is not yet a reference,
  and comparing two versions of a target with it is to be built.
- A rule's name still moves from one run of the reader to the next; the place in the code
  it cites is steadier.
- What the builder chooses — a body's values, an actor — reaches the judge: a name such as
  "the-other-one" is a comment in disguise. Measured by reading, not prevented.
- A judge's confidence moves by a tenth from one run to the next: no sharp threshold on it.
