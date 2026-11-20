# ADR-0017 — The mark is a cloche over `ex`

Status: Accepted (2026-11-20) — the two drawings settled by the user, the challenger's
review of this record taken but for the beam's length, the user's.
Replaces the mark of ADR-0015; the name and the directory it decides stand.

## Context

ADR-0015 made the mark text: `ex[spec]`, the brackets around what is extracted. The user
came back to it with a picture: an application put under a glass cloche, and a behavioural
specification taken out of it. The brackets of `ex[spec]` do not draw that picture, and to
a reader of command lines brackets say "optional".

## Decision

- **The mark is the word, with a cloche over `ex`.** `exspec` in lower-case monospace; a
  square bracket laid down, open at the bottom, stands on the baseline over `ex`; `spec`
  is outside it, on the right. What is under glass is on the left, what is taken out on
  the right.

  ```
  ┌──┐
  │ex│spec
  ```

- **The cloche carries the accent colour**, and is drawn heavier than the letters. The
  letters are in ink.
- **The animated mark turns the colours round**: the cloche in ink, and a beam in the
  accent colour that sweeps from under the ceiling down to the baseline and back, leaving
  through the right wall towards `spec` — the target is being analysed. Where the animation
  is not played — a reader who asked for less motion — the beam lies on the baseline, and
  closes the cloche.
- **Two files, `docs/logo/exspec.svg` and `docs/logo/exspec-animated.svg`.** The letters
  are text, not outlines: each sets its ink for a light and a dark page.
- **The page of `view` carries the mark in its header**, as it carried `ex[spec]`: drawn
  by the page, its letters white on the header's navy.

## Alternatives

- **Keep `ex[spec]`.** Text everywhere, nothing to draw. Set aside by the user: it says a
  notation, not the cloche.
- **`[ex]spec`**, the brackets upright around `ex`. Reads "spec, optionally ex".
- **A pictogram beside the word** — a cloche over a `x`, standing on three lines of text.
  A second object to keep beside the word; the bracket laid on the word says it in one.
- **The beam in the still mark**, at mid-height of the letters: it strikes `ex` through,
  as deleted text. Under the ceiling: it reads as a doubled wall.
- **Several beams converging on the `x`.** With the `x` they draw a crossed box, and
  nothing under 64 px.

## Consequences

- The brackets ADR-0015 calls the house's are still there, as one bracket laid down.
- The letters are drawn by the reader's monospace font: their width is fixed in the files,
  their shape is not. A use that needs the same shape everywhere — print, a tile — asks
  for the letters as outlines.
- The ink of a file follows the reader's colour scheme, and a file opened alone darkens
  its own canvas with it. A page whose theme is not the system's — a forge set to dark on
  a light system — shows the wrong ink.
- ADR-0015 still holds for a tile: the mark is the whole word, never two letters.
