# feat/shapes

## Frame

**Goal.** The data shapes of the four groups as zod schemas; an extraction read from the
YAML files of `<dir>/specimen/` (ADR-0003); the checks that need no execution; two commands
that need no target — `specimen check <dir>` and `specimen status <dir>` with its counts.
The example is Conduit's, translated by hand from `docs/brief/shapes.edn` into a fixture.

**Non-goals.** Anything that runs against a target: the played copy and the reference of a
scenario, `assert`, how a projection locates an instance, the verdicts. They come with the
branches that play.

**The session's plan**, challenged on 2026-11-12 (verdict: keep, with corrections — two
recordings on two stacks, noise kept apart from the copy, a projection declares the status
that means absent, a refusal that several false facts explain is ambiguous, the agent never
writes a reference): shapes, then playing and the reference in one branch, then a reduced
`extract`, then the readings and the verdicts.

## Journal

## Backlog

### The shapes as schemas, loaded from files

- **Seen.** Ten shapes drawn by instance, one operation of Conduit carried through all of
  them (`docs/brief/shapes.edn`).
- **Settled.** The specification declared whole; a scenario in three states; the bindings
  apart; the form of a value on the field of its structure; no verdict stored.
- **Next.** Decide the notation of the files (an ADR). Write the schemas, load Conduit's
  `unfavorite-article` and `register` whole, and the checks that need no execution: a
  binding pointing at a path its interface's schema does not have, a call whose inputs do
  not fit the operation's `:takes`, a rule no scenario points at, a structure no projection
  shows.
- **Source.** `docs/brief/shapes.edn`, `docs/brief/metamodel.md`.
