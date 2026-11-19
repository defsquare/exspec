# feat/flow-of-the-roles

## Frame

**Goal.** The flow of `exspec extract` on a terminal says what a phase of the roles is
doing. Three of the five phases run several sessions at once, one per interface; the flow
was drawn for one session and its rounds, and reads them wrong:

- a failed gate of one session stays in the panel after that session has passed, and at
  the end of a failed phase the panel shows the last gate that failed, of whichever
  interface, as what is left;
- a phase that fails with no gate (a scenario that does not replay the same) shows no reason;
- "round 1" is all a roles' phase ever says, its sessions having no round in the fold;
- the lines `agent` and tool are of the last session that spoke, unnamed;
- a box counts what was written, not what runs, failed, or was done already;
- the count of the judgements by verdict, the result of the run, is not drawn.

The fix is in the fold and the drawing: the sessions running, one line each; what is wrong
in the phase, by session, taken away when the session passes; the counts of a box; the
verdicts once counted.

**Settled.** A drawing is a reading of the event stream: a pure fold into a state, an Ink
component that draws it; no event is added for it. The two agent phases (`target`,
`interfaces`) keep their panel: one session, its rounds, its gate.

**Non-goals.** A new event or a key added to one: the size of a phase and the session a
`command-failed` comes from are in `docs/backlog.md`. The commands of `roles`, which print
one line per event. The roles as columns with a row per interface: fifty interfaces do not
fit a terminal, and the lines of the running sessions say the same.

**How it is judged.** `bun run check` and `bun test` report nothing; a stream of events of
a roles' phase, several sessions interleaved, drawn on a terminal and read by the user.

## Journal

- The fold and its drawing, one item (implementer sonnet, one round). Reviewer (sonnet):
  conformance yes, quality approved, nothing Critical or Important; its Minor findings
  fixed in the commit — the roles' phases read from the one map of role to phase, a type
  no longer exported, the comment of the panel's keys. Left for the challenger: a trouble
  drawn by `running ? … : …` three times in one `<Text>`, two components would read better.
- The drawing read on a pseudo-terminal of 120 columns, a stream written by hand (a
  reading with three sessions, one gate failed then passed, one session ended in error;
  an evidence that fails on a builder's gate and an unstable scenario): the session of a
  gate that passed leaves with its trouble, the failed phase shows both troubles whole.
  Seen there and fixed: an interface longer than its column ran into the time — the
  column is as wide as the longest interface drawn. Not seen: a real extraction, a window
  under 100 columns.
- The stream written by hand is kept, on the user's request: `bun run demo:flow` draws a
  whole extraction — an agent phase with a round, the three phases of the roles, a
  judgement that fails — with no target and no agent. `scripts/` is type-checked now.
- Seen, left: `flow.failed`, the message of the last `command-failed`, stays drawn under
  the panel in the phases that follow — as before this branch.

## Backlog

- [x] The fold keeps the roles' sessions that run, what is wrong by session, the counts of
  a phase (written, running, failed, done already, kept, unstable) and the verdicts; the
  panel draws them. `turns`, kept and never drawn, goes.
- [ ] Taken from `docs/backlog.md`, "The roles drawn as a flow", and not done here — goes
  back at the merge: the flow of `extract` has been watched by the user on real
  extractions of one target and what it showed was not reported back; the commands of
  `roles` still print one line per event, the sessions of several interfaces interleaved
  under a `[interface]` prefix. Source: `docs/branches/feat-extract-flow.md` at `b8300ed`.
