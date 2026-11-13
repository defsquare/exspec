# ADR-0008 — The verdicts are derived, and say when they cannot tell

Status: Proposed (2026-11-13) — written by the main thread working alone, challenged, to be
reviewed by the user.

## Context

ADR-0001 gives every claim a provenance — declared only, verified, refuted — computed
from the scenarios and never stored, and names two kinds of gap: the system does not do
what a rule says, or it does and says it otherwise (the binding). On the spike's targets
distinct refusals answer one status: an answer alone does not say which rule refused.

## Decision

A verdict is computed from one reference, its operation and its trigger, for the rules the
scenario says it proves:

- **A requirement** is verified when its fact was false before the judged call, the call
  was refused, and **nothing else explains the refusal**: no other required fact false or
  unknown, no input violated, whose refusal the trigger translates to the status observed.
  Refused with another explanation at hand: *ambiguous*.
  False and accepted: refuted. True: not exercised. Unknown: not judged.
- **An input rule** the same way, the violation computed from the values the call gives
  and the form its field carries.
- **An effect** is verified when the call was accepted, its condition held before, and
  what it says changes is seen between the readings before and after. An effect written
  as a sentence is not judged; one that needs a reading nobody took is not judged.
- **The binding** is judged apart: an accepted answer shows what the trigger says where
  it says; a refusal has the status the trigger gives the refusal the scenario proves.
- **Accepted** is the trigger's accepted status; **refused** is a 4xx; anything else is
  neither, and refutes the binding.
- **A rule's provenance** over all references: refuted if one scenario refutes it,
  verified if one verifies it, declared only otherwise — with the reason (no scenario, no
  reference yet, not exercised, ambiguous, not judged).

`status` shows the counts and every claim that is not verified; a refuted claim is a
finding for a human, not a failure of the command.

## Alternatives

- **Judge a requirement on the refusal alone** when its fact cannot be read. More green;
  on a target that answers 401 to four different refusals it verifies anything.
- **A fifth provenance, "refused, fact not read".** A weaker "verified" that would have to
  be explained everywhere it is shown; the reason beside *declared only* says it.
- **Judge every rule of the operation in every scenario**, not only those it proves.
  Finds accidental verifications; a scenario's intent — what it was written to isolate —
  is what makes its verdict mean something.

## Consequences

- One fact that cannot be read makes ambiguous every rule of its operation whose refusal
  answers the same status: on a target with one status for every refusal, a rule is
  verified only once all the facts of its operation are readable.
- A scenario that denies two facts at once proves nothing, and is told so: the measure
  pushes scenarios to deny one thing at a time.
- With no observable, "a refused call changed nothing" is not part of a requirement's
  verdict; `status` says side effects are not observed.
- One verifying scenario is enough for *verified*: how well a rule is held — both sides of
  a bound, a mutant killed — is not said by the provenance.
- A refuted binding with a verified rule is the common case on a target that answers one
  status for many refusals; it is shown as that, not as a red rule.
