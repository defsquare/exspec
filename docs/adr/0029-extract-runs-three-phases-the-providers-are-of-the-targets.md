# ADR-0029 — `extract` runs three phases, the groups of the metamodel; the providers are built in the target's

Status: Accepted (2026-11-23) — by the user, after a sixth phase and then this regrouping
were read by the challenger ("take it, reduced"; its changes taken). Supersedes ADR-0014.

## Context

`extract` ran five phases (ADR-0014): target, interfaces, reading, evidence, judgement. A
target that calls providers was set up by hand around them (ADR-0020, ADR-0021): the
providers declared in the target's description, then two commands to read them and write
their twins, then `extract`. Seen on a whole extraction of a target with two providers:
the target's session declares none, no phase runs a provider's role, and the proxy is
stood when the command starts, from a description that does not exist yet — the evidence
is played with nothing in front of the providers, and says so nowhere.

The five phases were already uneven: the evidence ran the judges for the states' paths
(ADR-0026); the reading was four roles in a row where the first two phases were one
session each. And building the providers is of the target: the user would not have it
patched into a phase of something else.

## Decision

- **Three phases, each named for the group of the metamodel it writes.**

  ```
  target          how the target starts and is reset, its interfaces, the providers it
                  calls: each read from its consumer, then its twin written
  specification   the structures, the shared rules, each operation's rules, the states —
                  and their bindings: a binding knows both sides, it is written where the
                  specification is
  proof           the scenarios built, recorded as references, judged
  ```

- **A phase is steps in order — a session, or a role on its subjects — each skipped when
  the files say it is done.** A phase does what is left of it, asked for by name or not.
  The target's and the interfaces' sessions are no longer run again by naming their
  phase: a session runs again when its file is removed.
- **The target's session declares the providers** the target calls and points the target
  at the proxy. Its gate checks, in the files, that each provider's address at the proxy
  is named where the target is started, then the lifecycle. That the target does reach
  the proxy is shown only by a call recorded.
- **The providers are stood when the proof starts**, from the description read then — the
  proof is the one phase that plays. A command that plays outside `extract` stands them
  at its start, as before.
- **Kept from ADR-0014**: what is left is told from the files alone, by role and by
  subject, in one definition the roles' skips, the phases and `status` read; the roles'
  and the providers' commands stay, for one step or one subject; the reader of the
  structures reads the code alone; phases have gates the tool runs, a failed gate's
  findings sent back to the same session.

## Alternatives

- *A sixth phase, `providers`*: a third seam in a list already uneven, and the providers
  set beside the target rather than in it.
- *The providers' roles at the head of the reading*: a twin is not a reading; `status`
  would say a reading is left when a twin is.
- *The two sessions made roles*, so that a phase is only roles: they hold a shell, read
  everything and have no subject; no target asked for it.
- *A step asked for by name* (`--step`): the roles' and the providers' commands already
  run one step; a session is run again by removing its file.
- *The providers stood again after their phase*, the standing at the command's start
  kept: a second `extract`, the providers declared and no twin yet, fails before its first
  event.

## Consequences

- One file is written outside its group: a service, of the specification, by a provider's
  reader in the target's phase (ADR-0020).
- A provider the target's session does not declare is detected by nothing.
- That the target is pointed at the proxy is checked by the session's gate, once: a step is
  told done from the description alone, as the lifecycle is, and what starts the target
  changed afterwards is read by nothing.
- `status` shows three phases; `--phase` takes three names.
- An extraction made before, with no provider declared, has its target's phase done.
- Amends ADR-0021 (who declares the providers, when they are stood) and ADR-0026 (the
  judges of the states' paths run inside the proof).
