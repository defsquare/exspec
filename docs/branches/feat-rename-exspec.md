# feat/rename-exspec

## Frame

**Goal.** The tool is named `exspec` — the spec extracted — and says so everywhere a reader
or a caller meets its name: the package, the executable, the command line's usage, the
directory of an extraction (`<dir>/exspec/`), the agent's instructions, the README, the
project instructions, the backlog. The page of `view` carries the mark `ex[spec]`.

The user settled the name, the directory and the mark (ADR-0015).

**Non-goals.** Editing `docs/brief/` or the text of the ADRs written before the rename:
they are records, and ADR-0015 says how to read the old name in them. Reading or
migrating an extraction left under `<dir>/specimen/`: it is made again. Renaming the checkout's
folder on a disk, or a remote. An icon: the mark is text.

**How it is judged.** `bun run check` and `bun test` report nothing; no `specimen` is left
outside the records named above; `view` on a fixture shows the mark.

**The merge is the user's.** Another branch that merges first touches files this branch
renames, and this one is then rebased. The mechanical part of the
rename is one script, written in the body of its commit, so that it is run again after a
rebase rather than its conflicts resolved by hand.

## Journal

- **ADR-0015** (18cdf50) — the name, the directory, the mark; ADR-0003 amended.
- **The rename** (b5ecdc8) — 69 files by the script of the commit's body, then the
  formatter; the README's opening paragraph by hand. `bun run check` clean, 206 tests pass.
- **The mark in the page** (4680fa0) — seen on a capture of `view` on the roles' fixture.
- **Rebased on `main` at 52d0b5a**, once `feat/extract-runs-roles` was merged: the rename
  commit was not merged by hand but made again — the script, the formatter, the README's
  paragraph — on the new `main`; it differs from the one reviewed only in the 49 files
  `main` had moved. The index keeps both rows, 0014 and 0015.
- **Reviewer (sonnet), the three together** — conformance yes, quality approved, nothing
  Critical or Important. Minor, for the challenger before the merge: the comment above
  `instructionsFor` describes its parameter in prose where the project shows the data (it
  was so before the rename); no test reads the mark of the header.
- **Challenger (opus), before the merge** — merge after fixes; nothing Critical. Important:
  the migration said `mv` alone, and an extraction's own files say the old path
  (`target.yaml`, `target/`). The user settled it: nothing is migrated, the extractions
  are made again — ADR-0015 says so. Minor, fixed by hand in the rename commit, to redo after the script if the
  branch is rebased again: `instructionsFor(commandLine)` and its comment as data; `const
  extraction` in `test/roles-fixture.ts`; "an `exspec/.gitignore`" in the system
  instructions; the backlog's settled line cites ADR-0015. Dropped: a test of the mark —
  it would assert a fragment of a template with a pattern.

## Backlog

Nothing open. If `main` moves again, this branch is rebased and the script run again.
