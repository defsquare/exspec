# The brief — where specimen comes from

The record of the spike `spike/recorded-cases` of the project **specy**
(`specy-poc-loop`, commit `6bc2296c`), copied here on 2026-11-12. These files are read,
never edited: a decision that changes one of their statements is an ADR in `docs/adr/`.

They cite paths of that repository (`dev/spike/…`, `docs/adr/…`, ADR numbers of specy):
those paths are not here. What was worth carrying is in this folder.

| file | what it is | read it for |
|---|---|---|
| `framing.md` | the framing written at the end of the spike | what the rebuild may claim, what is kept and dropped, what was settled with the user, the experiments left. Where two of its sections disagree, the later one holds |
| `shapes.edn` | every data shape as one instance, Conduit's values, comments in French | the shapes to build. EDN is the notation of the spike, not a decision for this project |
| `metamodel.edn`, `metamodel.md` | the 14 concepts, their links, their groups | what points at what |
| `fit-conduit.md`, `fit-petclinic.md` | the shapes confronted with two targets' recorded data | what fits, and the list of what does not, with its reason. Measured before inputs were given their place (`:takes`, `:sends`, the form of a field) |
| `clock.md` | a target with a clock (Fineract, the life of a loan) | why a reference holds only on the day it was taken, and what holding the target's clock must cover |
| `spike-journal.md` | the spike's working file: 22 journal entries, measures, the challenger's verdicts | what was tried and measured, in order |
| `debate/` | a debate between three model families on the pivot, a defence, a fact-check, two syntheses | the objections, and the experiments that would settle them |

## What the spike's code was

A probe in Clojure, never reviewed, **not to be ported**: the framing says so. Its recorded
data for three targets (Conduit, Petclinic, Fineract — scenarios, references, rules) stays in
the source repository and is the natural first test set for this one.

## The three things to hold on to

1. **Observe, then specify.** A scenario is what was observed; the specification is hung
   on it, derived or declared then verified, with as little inference as possible.
2. **Only what the target's interfaces expose is compared.** The database detects and
   explains; it is never the reference.
3. **Generating data applies to the inputs of an operation, and only there**: a valid
   value, and the values on each side of a bound. Bringing the system to a situation where
   a fact holds is a matter of arranged calls — building a world from a predicate is what
   the previous approach foundered on.
