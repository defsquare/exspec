# ADR-0009 — `view` makes one page of the extraction, and it is the command's output

Status: Proposed (2026-11-13) — the form (a page made, not a server) chosen by the user
after the challenger's review; the text to be reviewed by the user.

## Context

ADR-0002 names three readers of the event stream: the terminal, `--format json`, a viewer.
An extraction is read by following references — a rule to its fact, the fact to the
structure it reads, a scenario to the operation it acts on — and the terminal shows lists.
What a reader of the extraction needs is not in the event stream: the stream carries what
a command found, not the specification.

## Decision

- **`specimen view <dir>` writes one HTML page on its output**, to be redirected to a file
  and opened. It starts nothing and writes nothing of its own. It is refused to the
  agent: the page is for a person, and would pour every recorded answer into a session
  that has `status` and `verdicts` for the same facts.
- **The page is made from the files, each time**: the extraction as parsed, its problems
  and gaps, every rule and trigger judged, and the links between the concepts. It holds
  them as data and draws from them; nothing in it is computed twice by hand.
- **The links between concepts are derived once, in `derive`**: every reference between
  the concepts the page has a sheet for, with the word the files use for it. What a
  scenario proves and the reference of a scenario are read from the verdicts and the path. Read backwards, it is what cites a
  concept — which no file says.
- **`view` is not a reader of the event stream.** It is the one command whose output is
  not events: a page is for a browser, and `--format json` on the other commands remains
  the data for a program.
- **The page is self-contained but for its fonts**, and uses no framework: one text file
  embedded in the tool.

## Alternatives

- **A local server**, recomputing at each reload. Always fresh; a port to keep on the
  machine, a process that does not end, a command to refuse to the agent. It can be put
  around the same page later.
- **A viewer of the event stream**, as ADR-0002 named it. The stream would have to carry
  the whole specification to be browsed.
- **A front-end application built with the tool.** A build step and a dependency for a
  page a few hundred lines draw.
- **Publishing the page somewhere.** A reference holds what the target answered, tokens
  included.

## Consequences

- `view` succeeds when the page is made, problems in the extraction or not: the page
  shows them.
- The page is as old as the command that made it, like any output of `status`; whoever
  redirects it decides where it is written, and the tool still writes only under
  `<dir>/specimen/`.
- It holds every answer recorded: sending it to someone sends the tokens in them. The
  page says so.
- What the page draws is untested code; what it draws *from* is derived and tested. A
  rule of display that grows into logic belongs in `derive`.
- With no network the page falls back on the system's fonts.
