# The metamodel of the recorded cases

The concepts and links decided with the user on 2026-11-12 **for a rebuild**: the spike's
code under `dev/spike/` does not have this shape (it orders an operation's rules and takes
the first that holds, derives a scenario's rule by a classing, declares a structure's
projections on the structure). `restart.md` says how it was reached; `shapes.draft.edn`
holds one instance of every data shape; `<target>/shapes/fit.md` says what of Conduit and
Petclinic fits it.

`metamodel.edn` is the source: the concepts, their links, the paths that read through them
and each concept's place on the page. A concept names its group — the page draws one band
per group and lists the concepts under it — and gives one example as a sentence and one
instance of itself as data (`:instance`: the EDN, and where it is read from). The page is
generated, never edited:

```
clojure -M:dev -m spike.metamodel <out.html>              # the model as it is
clojure -M:dev -m spike.metamodel <out.html> <base-rev>   # and what changed since <base-rev>
clojure -M:dev -m spike.metamodel selfcheck
```

The same file gives the same page. With a base revision, a concept is the same concept by
its name and a link by its two ends; anything else that differs (a definition, an
attribute, a verb, a cardinality) makes it *changed*, and the page shows what it was. A
concept moved on the grid is not a change.

## What the links say

- Four groups. The proof by simulation (scenario, call, side effect), the specification
  (operation, rule, fact, structure, field), the bindings (projection, trigger, detects),
  the target (target, interface, observable). Every link points from the concept that
  holds the reference to the one it names: the specification points at nothing below it,
  the target at nothing above it, and only the bindings know both.
- `Scenario proves 1..n Rule` — declared by the scenario, verified by an execution. A rule
  no scenario points at is a missing scenario.
- `Scenario looks at 0..n Fact` — before and after the judged call; a fact's value before
  is what tells which requirement refused, where two refusals answer one status.
- `Rule` has three places in an operation: on an input (a constraint of its field
  violated), a requirement (a fact that must hold), an effect (what changes). Effects are
  independent; which refusal wins when two conditions fail is observed.
- `Structure holds Field`, and a field carries its form. A structure does not know its
  projections: `Projection claims to show Structure`. A structure no projection shows
  cannot be observed — checked, not stored. A field may be never shown.
- `Detects` — a change at a place of an observable concerns a structure or a fact. A side
  effect at a place no detector names is a blind spot; one on a structure or fact the
  scenario does not look at is a missing assert.
- `Scenario acts by 1 Call` — one call is judged; the others only arrange.
- No concept for the run, the observation, the reference, the report, the readings, the
  starting state or the actors: states and attributes of a scenario, keys of the target,
  or derived.
