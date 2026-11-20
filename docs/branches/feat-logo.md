# feat/logo

## Frame

**Goal.** The mark of exspec is drawn: the word, a cloche over `ex`, `spec` outside it —
the target put under glass, the spec taken out. Two files under `docs/logo/`: the mark, and
its animated form, where a beam sweeps under the cloche. The README and the page of `view`
carry the mark.

The user settled the two drawings (ADR-0017, which replaces the mark of ADR-0015).

**Non-goals.** A file for the small mark (a favicon, a tile): the cloche over the `x`
alone was drawn on a board and reads at 16 px, nothing asks for the file yet. The letters
as outlines. The mark in the terminal.

**How it is judged.** The two files open in a browser, on a light and on a dark page;
`view` on a fixture shows the mark; `bun run check` and `bun test` report nothing.

**The merge is the user's.**

## Journal

- The two drawings were settled on boards, thrown away: what each board set aside is in
  ADR-0017's alternatives. The red of the boards (`#e5383b`) became the accent of the page
  of `view` (`#f65e5e`), the ink its navy (`#1a2a36`).
- The challenger on ADR-0017 and the files, before the first commit: sound, with changes.
  Taken: a file opened alone on a dark system had white letters on a white canvas — the
  files declare `color-scheme`; the animation in CSS, so that a reader who asked for less
  motion gets the still beam; the ADR accepted, and cut of what no file does (the small
  mark, the terminal). Not taken: the beam stopped short of `spec` — it reaches the `s`,
  as the user saw it and settled it.
- The header of `view` draws the mark: seen on the page of `test/fixtures/roles`, the
  letters on the baseline of the header's links.

## Backlog
