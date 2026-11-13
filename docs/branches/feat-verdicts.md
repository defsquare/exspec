# feat/verdicts

## Frame

**Goal.** What is read before and after the judged call — the facts its operation cites,
through a projection that says how it locates an instance (ADR-0007) — and the verdicts
derived from it: a rule's, a binding's, the provenance of each over the references
(ADR-0008). `specimen status` shows the counts and every claim that is not verified;
`specimen verdicts` shows them all. The agent's instructions follow.

**Non-goals.** Side effects and observables; new terms for conditions and effects (a fact
about who wrote what, a count, a list); values generated at the bounds.

**Two open questions of the brief are answered here** (ADR-0007): who chooses what is
looked at — the facts the operation cites are read without being asked, a scenario's
`assert` adds looks; and a fact evaluated for another actor — a fact is evaluated for the
actor the reading is taken as.

## Journal

## Backlog

### The verdicts, derived

- **Seen.** On the spike's data every requirement verified (30 of 30 on each of two
  targets); no effect could be verified, none having a `:then`. Distinct refusals answer one
  status on both targets (401, 404): the fact evaluated before the call says which one.
- **Settled.** A rule's verdict from a played copy and the operation; a binding's from the
  answer and the trigger; the provenance of a rule from all its verdicts. Two kinds of gap:
  the rule refuted, or the binding refuted.
- **Next.** Derive both verdicts for the scenarios of item 4, including Conduit's unknown
  article (401 where 404 is declared), and show them in the terminal.
- **Source.** `docs/brief/shapes.edn` › "DÉRIVÉ"; `docs/brief/fit-*.md` › the verdict test.
