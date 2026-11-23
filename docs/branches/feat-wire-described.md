# feat/wire-described

## Frame

**Goal.** What a target says of its wire is described with its interfaces and no longer
proven: no rule of the wire, no scenario, evidence or judgement for one. `protocol.yaml`
and its concept go; each thing it held goes where it belongs — the forms to the
interfaces, what the start sets to the target, how the shared refusals leave to a
binding. Measured on the fixtures, then on a reading of `trainings`: the evidence of an
operation is of its own rules and the shared ones, where 332 of 1071 were of the wire.

**Non-goals.** The phases of `extract` and the providers (`feat/providers-in-extract`).
Whether a shared rule is proven on every operation or once (107 evidences on
`trainings`).

**Decided by the user** (2026-11-23): the wire is of the interface; its rules are no
longer proven by a scenario.

The design: ADR-0028 (Accepted).

## Journal

- **Opened** (2026-11-23) as `feat/wire-read-apart`, after `feat/layout-by-content`.
  Counted on `trainings`: `unauthenticated` said by 21 triggers — 9 with a body, 7 with a
  status alone, 5 with a header in the body's text; 332 evidences of the 11 rules of the
  wire, 107 of the 3 shared ones, of 1071.
- **Three homes for the file, with the user** (2026-11-23). A role of its own in the
  target's phase, the file cut in two: two sessions on one middleware, each taking a rule
  or neither. The whole file a binding, the shared trigger: it keeps rules that name
  nothing of the specification. Then the user's: it is of the interface —
  `interfaces.yaml` on `trainings` already says the envelope, the errors' form and `auth`
  per interface. What sets the two apart is that a rule of the wire is proven and a form
  is declared. Decided: the wire is no longer proven; the branch takes its name.
- **The design challenged** (2026-11-23): "keep, with five changes". No script: the text
  hashed for a judge holds the wire's rules and the shared `refuses`, so every judgement
  of a rewritten extraction is stale, and a trigger that names a wire rule's refusal
  fails its check — an extraction that still has `protocol.yaml` is refused, "extract
  again". `errors` goes with `refuses`, in the common reader's shared file: it is read in
  the error handler the common reader reads, and `interfaces.yaml` has one author. `contract`
  is read by agents and the page alone: dropped unless a run shows a reader uses it. A
  shared refusal is not said again by an operation's trigger — "the same" would have to
  say whether a body left out is equal. The common reader's sorting is ADR-0019's, what
  survives the target being rewritten, lest `common.yaml` swell with the wire. `runs-with`
  in `target.yaml` is in the judge's hash: a target's session run again that rewords a
  line stales every judgement, said in the ADR. Lost: little — headers are not in an
  evidence, a rule about one was `not-shown` at best; an envelope or a status that
  changes still shows at a replay. Not yet decided by the user.

- **Decided by the user** (2026-11-23): the five changes taken; no script, every
  extraction made before is extracted again; `contract` dropped; `common-trigger.yaml`.

- **The code** (`ce51bad`, 2026-11-23, one item: the pieces do not compile apart).
  Reviewer: conforms, approved; each session reads and writes what it did but for the
  file; the page's staleness and the judge's hash read `runs-with` the same way. Taken:
  the common reader was skipped on `common.yaml` alone — a shared trigger missing left
  the reading to do and nothing to do it; it runs when either file is left. Minor, left:
  the script of ADR-0027 still moves a `protocol.yaml`, which is then refused.

- **Before the merge, the challenger** (2026-11-23): "merge after fixes" — the code and
  ADR-0028 say the same, the concept is out of the code, the metamodel and `CLAUDE.md`.
  Taken: three passages of the backlog that spoke of the protocol; the shared rules'
  107 evidences, a non-goal here, written as an item; the script of ADR-0027 says what
  becomes of a `protocol.yaml`; the working file's first name gone from the history.
  Not taken: `ExtractionToExtractAgain` — the refusal beside it is named for what was
  found, `ExtractionUnderRoles`, and the two keep one form.

## Backlog
