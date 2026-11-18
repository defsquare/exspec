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

- The counts in the stream of `extract`, the flow, past lines printed once: implementer
  (sonnet), reviewer approved both verdicts, no Critical or Important. Fixed in the thread
  after a look at the screen (tmux, 120 and 90 columns): a negative time at the first
  frame, the stacked boxes collapsing, unequal widths, the panel's labels unaligned.
- Not seen yet: a real extraction through the flow.
- For the challenger (reviewer's Minor): a failed gate adds a round even when it is the
  last, so a failed phase would say one round too many — not shown today, a failed box
  shows no round; the fold has no test for `phase-finished` not ok nor for an
  `agent-ended` without a cost.

## Backlog

- **The same drawing for `roles-*`.** The roles as columns (reader, builder, judge), one
  row per interface, the sessions running side by side. After the flow of `extract` has
  been watched on a real run.
