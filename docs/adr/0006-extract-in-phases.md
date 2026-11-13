# ADR-0006 — `extract` is phases with gates, and the agent's tools are the CLI's commands

Status: Proposed (2026-11-13) — written by the main thread working alone, challenged, to be
reviewed by the user.

## Context

`specimen extract <dir>` has an agent write the extraction of the target checked out in
`<dir>`. In the spike one agent session wrote a target's scenarios in fourteen minutes, and
other sessions the rules, from the code — with no check between the steps: a wrong
description of the target was found once the scenarios were written. ADR-0001 keeps two
things out of an agent's hands: what the target answers is recorded, never written; a
declaration the target contradicts is decided by a human.

## Decision

- **Four phases, in order, then the recording**: the target (how it starts, its starting
  state, its reset), the interfaces, the specification and the bindings, the scenarios;
  then `record`, with no agent. Each phase is one agent session in the target's checkout.
- **Each phase has a gate the CLI runs itself** — the static checks, and for the target and
  the scenarios, the target actually started, reset, played. A gate that fails sends its
  findings back to the same session, three times at most; a phase that fails stops the
  extraction.
- **The agent's tools are the CLI's own commands** (`check`, `up`, `down`, `play`), run
  through its shell. It is told that a file is right when the tool says so. The gate does
  not take its word: it runs the same commands again.
- **The files are the state.** A phase whose gate's static part already passes is skipped;
  nothing records progress. What `status` shows of the phases is computed from the
  extraction.
- **The agent never writes a reference**: its file tools are confined to `specimen/` and
  refused under `specimen/references/`; `record` belongs to the CLI and keeps a reference
  that exists. A scenario's schema has no place for an answer.
- **The agent does not bend a declaration to an answer.** Its instructions say: when the
  target contradicts what was declared, read the code again; correct a misreading; leave
  and report a real contradiction.
- **Its instructions cite nothing of specimen's**: the notation and the rules are written
  out in them, with examples a test parses with the schemas.

## Alternatives

- **One session, one brief.** No gate between the steps; the cost of a wrong first step
  is everything after it.
- **Tools of the agent's own** (an MCP server exposing check and play). Typed calls; a
  second surface to keep in step with the commands, for what a shell line does.
- **A progress file** (which phase is done, which session). Something stored that the
  files already say; and a file that can disagree with them.
- **The agent records and iterates until green.** Fast; it is the agent deciding what the
  reference is.

## Consequences

- A gate checks that the files hold together and that every scenario plays. It does not
  check that a scenario reaches the rule it says it proves: both targets passed every gate
  on the first session, one of them with a scenario answered 400 by a missing identifier
  where it claims to prove "not found". That is what a rule's verdict says, once it
  exists; a gate is not made stricter with heuristics meanwhile.
- The agent has a shell: the confinement of its file tools is a guard against a mistake,
  not a sandbox. `extract` is run on a checkout one is willing to let it work in.
- A phase's "already done" is weaker than its gate (the target is not restarted to find
  out): `--phase` runs one again.
- The notation is described twice — the schemas, and the agent's instructions; the test
  that parses the instructions' examples is what keeps them in step.
- What the agent could not reach or could not explain comes back as prose in its last
  message, shown on the event stream and kept nowhere: a declared place for it is to
  design.
