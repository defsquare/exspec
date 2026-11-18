# feat/extract-flow

## Frame

**Goal.** On a terminal, `specimen extract` draws the extraction as a flow: one box per
phase, in order, each saying its state, its time, its cost and what it has produced; under
the flow, a panel for the running phase — the last gate's findings, the agent's last
sentence, its last tool. The lines of the other commands are printed once.

**Non-goals.** No keyboard, no pane, no scrolling. No new type of event: the flow is a
reading of the stream `--format json` already shows. Away from a terminal (a pipe, a CI)
the lines stay as they are.

## Journal

## Backlog

- **The counts in the stream of `extract`.** `extraction-counted` is emitted by `status`
  only; a box needs it at the start, at each gate and at each phase's end.
- **The flow.** A pure fold of the events into the state of the five boxes and the panel;
  an Ink component that draws it; `extract` on a terminal uses it.
- **Past lines printed once.** The terminal renderer prints the whole history again at
  every event once the output is taller than the window (seen on Kadai, 2026-11-13):
  render past events once (Ink's `Static`).
- **The same drawing for `roles-*`.** The roles as columns (reader, builder, judge), one
  row per interface, the sessions running side by side. After the flow of `extract` has
  been watched on a real run.
