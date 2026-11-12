# feat/skeleton

## Frame

**Goal.** A `specimen` executable with one command, whose logic emits events as data and
prints nothing; two readers of that stream, the terminal and `--format json`; the checks
every later branch relies on — `bun test`, `bun run check`, the pre-commit hook, the
architecture test on imports.

**Non-goals.** Any data shape of the metamodel, any target, the agent. The command of this
branch, `specimen status <dir>`, only says that `<dir>` holds no extraction yet.

## Journal

- The skeleton — `specimen status <dir>`, the event stream, both renderers, the architecture
  test, the pre-commit hook. Reviewer: conformant, approved. Fixed after review: a stream
  that throws now ends the Ink renderer and reaches `main`; `directoryExists` rethrows
  anything but ENOENT; Biome no longer formats markdown. Minor, left for the pre-merge
  review: the exit code is kept in a module-level `let` fed by a wrapping generator;
  `status` joins its path by hand; the architecture test's import pattern also matches
  comments and strings.

## Backlog

### The skeleton: a command, the event stream, the checks

- **Seen.** Nothing is built. ADR-0002 is `Proposed`.
- **Settled.** CLI first; everything that runs emits events as data, read by a terminal
  renderer and by `--format json` (CLAUDE.md › The stack). The layers of CLAUDE.md.
- **Next.** One command that does nothing but emit three events and render them both ways;
  `bun test`, `bun run check`, the pre-commit hook, the architecture test on imports.
  Accept or amend ADR-0002 with what was actually installed.
- **Source.** `docs/adr/0002-typescript-on-bun.md`.
