# feat/providers-in-extract

## Frame

**Goal.** `exspec extract <dir>` on a checkout with no `exspec/` ends with the providers
the target calls declared, read and stood in for by a twin, before any scenario is played:
nothing is written by hand in `target.yaml`, and no `providers` command is typed between
two phases. `extract` runs three phases — target, specification, proof — the groups of
the metamodel. Measured on `trainings`, from an empty `exspec/`: `typst` and `resend`
declared, their twins served, the calls sent to them recorded in the evidence.

**Non-goals.** A provider's reading set against the real provider. What an evidence holds
of a provider (headers, a late call, the twin's digest). The two sessions of the checkout
made roles. A step asked for by name.

The design: ADR-0029 (Accepted).

## Journal

- **Opened** (2026-11-23). Seen on a whole extraction of `trainings`: the target's session
  writes no `proxy` and no `observables`, `extract` runs no provider's role, and the
  README says the order by hand.
- **A sixth phase challenged** (2026-11-23): "keep, with three changes" — the phase after
  `interfaces`, a phase of the roles being refused while no interface is declared; the
  providers stood at the start of the phase that plays, through a function of `io`, the
  roles' run built again with what was stood, else the evidence records no `side-effects`
  key and nothing says so; the target's gate checks in the files that the start names
  the proxy's address for each provider. Without the standing moved, a second `extract`
  raises `TwinsNotServed` before its first event.
- **The user**: building the providers is of the target and is not patched into another
  phase; the phases are revised. **Three phases challenged**: "take it, reduced" — the
  two sessions do not become roles; the flow's panel takes its kind from the step that
  runs; the keys of the sessions' briefs, writes and confinement are steps, a type of
  their own; `--phase target` named would run the target's session again to ask for the
  interfaces alone. About 15 modules against 8.
- **Two branches first** (2026-11-23), merged: the layout (`roles/` is `operations/`,
  ADR-0027) and the wire (no rule of it, `protocol.yaml` gone, ADR-0028). With them the
  specification's phase writes the specification and its bindings and nothing of the
  target; the name `reading`, kept by the challenger for that reason, goes.
- **Decided** (2026-11-23): ADR-0029. A phase does what is left of it, named or not; a
  session runs again when its file is removed.

- **The three phases** (`5f18c00`, 2026-11-23): `extract` does what it did, in three
  phases; a session's event says its step; the proof's box counts references, the
  judgements told by their verdicts. Reviewer: conforms, approved, nothing Critical or
  Important; the judges run after a recording that passed, as two phases in a row did.
  Seen, not a defect: a proof with only judges left runs the builders and the recording
  again, each skipped with its event. Minor, for before the merge: two of the commit's
  five `Decision:` lines — one keeps a behaviour and decides nothing, one says two things.

- **The providers in the target's phase** (`cc130fa`, 2026-11-23): the session is told
  of `proxy` and `observables` — its briefs never said them; its gate checks the pointing
  before the lifecycle; the providers' readers then the twin writers run after the two
  sessions; the providers are stood once, when the proof starts, and an evidence of the
  proof holds what they recorded — the test fails with the command's own `io`. Reviewer:
  conforms, approved, nothing Critical or Important; every path that stands ends stopped.
  Taken: the pointing checked once, said in ADR-0029's consequences; an interruption
  during the standing, an old loose end, written in the backlog. Left: `main.ts`'s
  standing and stopping is read, not tested; `:9100/p_x` names `p` for the naive check.

- **Before the merge, the challenger** (2026-11-23): "merge after fixes" — its defects on
  the design each closed in the code; ADR-0029 right, and of concepts and rules alone.
  Taken: five passages of the backlog; the names of what is a session and was called a
  phase — the briefs' files, their titles, the confinement and the failed gate's words,
  `sessionTools`, `Instructions.sessions` —, `ioForProof` for the argument that answers an
  `Io`, `readStartFiles`, `checkPointedAtProxy`. To do at the squash: two `Decision:`
  lines of the phases' commit. The measure on `trainings` need not hold the merge; it
  alone shows whether the target's session, with its new brief, declares the two
  providers and points at the proxy.

- **The measure** (2026-11-23): `extract --phase target` on a copy of `trainings`' checkout
  with no `exspec/`, no local state and none of the settings an earlier start had left;
  sonnet. The target's session declared a proxy and the two providers and pointed the
  start at it, from a container (`host.docker.internal:<port>/<name>`), its gate passing
  at the first round; then the interfaces' session, 47 interfaces; two providers'
  readers, one sent back once for a shape; two twin writers, each gate passing. `status`:
  the target's phase done. 1.34 USD, six sessions, about six minutes of them. Not shown:
  that the target in its container reaches a proxy that listens on the host's loopback —
  only a call recorded in the proof shows it.

## Backlog
