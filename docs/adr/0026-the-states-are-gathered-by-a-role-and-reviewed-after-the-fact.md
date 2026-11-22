# ADR-0026 — The states are gathered by a role once every interface is read, and reviewed after the fact

Status: Accepted (2026-11-22) — two forms read by the challenger ("keep the direction,
reduce it", twice); decided by the user point by point.

## Context

ADR-0025 names a state and lets a scenario start from it; `states.yaml` was written by
hand for its measure. It said the states are gathered by a pass after the readers and
reviewed by the user *before any path is sought*.

Two things the user settled against that order. A stop in the middle of an extraction,
for a file to be read and corrected, breaks the run — and the user of exspec is not
expected to edit YAML. And a state scenarios start from is already useful and already
proven by operations: dropping one is unlikely; what the user brings is its **name**, and
later the states no agent saw.

What the review protects is not validity — a state is reached only by a scenario played
and judged — but whether the sentence and the name are the business's.

## Decision

- **A role, the states' reader, writes `states.yaml`.** It runs in the reading, after the
  readers, once every interface of `interfaces.yaml` is read and when the file does not
  exist. It reads `exspec/` alone — the structures, the interfaces, every operation's
  rules and hints — never the code. A reading is not done while the file is missing.

- **It names a state that serves as a start.** `serves` lists rules of two operations at
  least, each a rule of an operation read: the role's own check, asked of no file
  afterwards. A state nothing starts from, and a state the user says in words, are not of
  this decision.

- **Once written, `states.yaml` is the user's: no role rewrites it.** The review is after
  the fact and stops nothing.

- **The path of a gathered state is the scenario `answers` of the operation that last
  moves the system into the state**, and that scenario ends with an `after` step: the
  builder of such an operation is given the state's `seen` to show, and its check asks
  for the scenario and the step.

- **In an extraction the operations a path names go first, as far as their judgement**:
  they are built, recorded and judged, then every operation is built and recorded with
  the states now reached. Nothing of that order is stored: it is read from `states.yaml`.

- **A state not reached yet is a gap; a state its path does not show is a problem.**

  ```
  the path not written, unreadable, not recorded, the state not judged, or on another text   gap   state-not-reached
  the state judged, on today's text, other than `holds`                          problem
  the path starts from a state; an entry that does not parse                     problem
  ```

  The judgement is the state's (ADR-0025), on its `seen`: what the path's own rule is
  judged is a claim of the specification, not a matter of `states.yaml`.

- **A state is renamed by a command**, which rewrites its name in `states.yaml`, in the
  scenarios that start from it and in its judgement; it stales nothing: the name is in no
  evidence and in no hash.

## Alternatives

- **The review before the paths, by a file the user renames** (`states.proposed.yaml`).
  Rejected by the user: it stops the extraction and asks for YAML.
- **A refusal kept** — the user drops a state after the fact. Set aside: unlikely, and it
  costs the scenarios that started from it.
- **`states.yaml` gathered again at every reading, the names kept.** Nothing asks for it
  yet, and it needs what tells a state renamed from a state new.

## Consequences

- An extraction never waits for the user. The states are read on the page (`view`): for
  each, its sentence, its structures, the rules it serves, whether it is reached and what
  the judge saw, the scenarios that start from it.
- An operation a path names never starts from a state gathered in the same extraction: a
  path starts from none (ADR-0025).
- Interfaces read after the states were gathered bring no new state.
