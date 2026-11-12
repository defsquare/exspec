# ADR-0002 — TypeScript on Bun, CLI first, events as data

Status: Proposed (2026-11-12) — the language is decided by the user; the libraries below
are the main thread's proposal and are accepted or changed when the first code is written.

## Context

The tool is used from a terminal, drives an agent, and reports its progress there; a viewer
is secondary. It manipulates data shapes that will keep moving, talks HTTP to a target,
reads the target's database, and must generate input values that respect or violate a
field's constraints.

specy was written in Clojure on the JVM. Its strengths were the data manipulation and the
JDBC drivers; its weaknesses, for this tool, the start time of a command and the rendering
of a terminal.

## Decision

- **TypeScript, strict**, run and compiled to a single executable with **Bun**.
- **Ink** for the terminal.
- **zod** for the data shapes: the schema is the source, the type is inferred, a file is
  parsed into a shape at the boundary.
- **fast-check** for generated values, always with a seed.
- The agent driven through the **Claude Agent SDK**, its stream turned into events.
- **Biome** for the linter and the formatter, with the TypeScript compiler's type-check:
  the two halves of `bun run check`, run by the pre-commit hook. Markdown is left alone.
- A database driver per kind of target, added when a target needs it (PostgreSQL first).
- **CLI first**: every capability is a command; everything that runs emits events as data,
  read alike by the terminal renderer, by `--format json` and by a viewer.

## Alternatives

- **Clojure on the JVM.** Data as EDN, one schema language for validation and generation
  (malli), a driver for every database. Rejected for the start time and the terminal.
- **Python** (Rich, Hypothesis). The strongest generation library; the user does not work
  in Python.

## Consequences

- The shapes of `docs/brief/shapes.edn` are written in another notation here: which one
  (TypeScript modules, YAML, JSON) is to decide with the first shape that is loaded.
- A database with no good Node driver is a cost paid target by target.
- Validation and generation are two libraries to keep in step: a constraint of a field is
  stated once and both are derived from it.
- Nothing of the spike's code is reused.
