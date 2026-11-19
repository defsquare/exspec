# feat/rename-exspec

## Frame

**Goal.** The tool is named `exspec` — the spec extracted — and says so everywhere a reader
or a caller meets its name: the package, the executable, the command line's usage, the
directory of an extraction (`<dir>/exspec/`), the agent's instructions, the README, the
project instructions, the backlog. The page of `view` carries the mark `ex[spec]`.

The user settled the name, the directory and the mark (ADR-0015).

**Non-goals.** Editing `docs/brief/` or the text of the ADRs written before the rename:
they are records, and ADR-0015 says how to read the old name in them. Reading an
extraction left under `<dir>/specimen/`: it is moved by hand. Renaming the checkout's
folder on a disk, or a remote. An icon: the mark is text.

**How it is judged.** `bun run check` and `bun test` report nothing; no `specimen` is left
outside the records named above; `view` on a fixture shows the mark.

**The merge is the user's.** `feat/extract-runs-roles` is not in `main` and touches files
this branch renames: the second of the two to merge is rebased. The mechanical part of the
rename is one script, written in the body of its commit, so that it is run again after a
rebase rather than its conflicts resolved by hand.

## Journal

## Backlog

- [ ] The mechanical rename: the name in the code, the tests, the fixtures' directories,
  the agent's instructions, the docs that are not records.
- [ ] The README's opening paragraph explains the word "specimen": it explains `exspec`.
- [ ] The mark `ex[spec]` in the header of the page of `view`.
