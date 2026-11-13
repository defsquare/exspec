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

- The readings and the verdicts — `locates` and `absent` on a projection, `assert` on a
  scenario, the readings taken before and after the judged call and kept whole, noise and
  replay over them; a rule's verdict, a binding's, the provenance over the references;
  `status` shows the counts and every claim not verified, `verdicts` all of them, `play`
  judges each copy; the agent's instructions follow. Live on the fixture: as expected —
  `leaves-favorites` verified (favorited true then false, the count 2 then 1),
  `password-length` ambiguous (the email fact is unknown, both refusals answer 400),
  `exists` unjudged (the reading of an unknown article answers 401), its binding refuted
  (404 declared, 401 answered). Reviewer: two Important, fixed by the same implementer —
  `nothing-changes` was verified with nothing readable read, and a value missing from a
  2xx answer counted as false; a binding is no longer judged on a rule the scenario did
  not exercise.
- **Conduit, extracted again** with the new instructions (specification, scenarios,
  `record --force`; $0.25): the agent added `locates` and `absent: 404` to the two
  projections that show one instance, changed no scenario, read the verdicts and told
  what they mean. Of 64 rules: 13 verified (twelve `signed-in`, one input rule), 0
  refuted, 51 declared only — 20 effects written as a sentence, 12 rules ambiguous beside
  a fact that is unknown, 9 unjudged because reading an unknown instance answers 401, 8
  on a fact with no condition, 1 on a fact no projection can read (a comment by its id),
  1 not exercised. Of 16 bindings: 7 verified, 9 refuted, all "404 or 403 declared, 401
  answered". Petclinic, not extracted again (its references predate the readings): 79
  rules verified, 86 declared only; all 24 bindings refuted, each by its wrong-role
  scenario answering 500.
- Left for the pre-merge review: `seen-by` stays in the schema and changes nothing; a
  format other than email is not computed and does not count as another explanation of a
  refusal; `nothing-changes` compares the readings a scenario's `assert` adds too, and a
  change seen outweighs a reading that was unreadable; `play` judges without the noise;
  `binding-judged` carries the refusal's name inside a text.

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
