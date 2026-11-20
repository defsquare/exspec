# ADR-0015 — The tool is named exspec; an extraction is `<dir>/exspec/`

Status: Accepted (2026-11-19) — the name, the directory and the mark settled by the user.
The mark superseded by [ADR-0017](0017-the-mark-is-a-cloche-over-ex.md).

## Context

The tool was named `specimen`: an example taken from the real thing to characterize it. The
word names what is observed — a scenario, or the target itself — and not what the tool
makes. Said in one sentence, the tool extracts a behavioural specification from a static
and a dynamic analysis of an application; the product is a spec, and the act is an
extraction.

The name is in the notation of the files: an extraction is the directory `<dir>/specimen/`
of the target's checkout (ADR-0003), and the agent's instructions, the access rules of the
roles and every path the tool reads or writes are relative to it.

## Decision

- **The tool is named `exspec`**: the spec, extracted. The package, the executable
  (`dist/exspec`), the usage of the command line, the name of the MCP server that carries
  the builder's tool (`exspec`, its tool `mcp__exspec__play`) and the variable that marks an
  agent's session (`EXSPEC_AGENT`).
- **An extraction is the directory `<dir>/exspec/`** of the target's checkout. Nothing else
  of ADR-0003 changes: the files, their names and their notation are as they were.
- **No second name is read.** An extraction left under `<dir>/specimen/` is not found, and
  is not migrated: the extraction is made again.
- **The mark is text**: `ex[spec]`, the brackets around what is extracted, in the accent
  colour — the brackets are the house's. The page of `view` carries it in its header.
- **The records keep the old name.** `docs/brief/` and the ADRs written before this one
  are not edited: read `specimen` there as `exspec`, and `<dir>/specimen/` as
  `<dir>/exspec/`.

## Alternatives

- **Keep `specimen`.** It holds "spec" too, and costs nothing. Set aside by the user: it
  does not say the extraction.
- **Rename the tool, keep the directory `specimen/`.** No extraction to make again; but `exspec`
  would write into a directory nothing explains any more.
- **Read both directories for a time.** A second name in every path, for three extractions
  on one disk, none of them tracked.
- **Other names** — `ethogram` (the catalogue of a species' behaviours, made by
  observation: exact, too learned), `retrospec` (taken on npm by a tool for selecting
  regression tests), `asbuilt`, `witness`.

## Consequences

- Two repositories on GitHub are already named `exspec`, both about specifications — one
  runs plain-text specs with agents, where "ex" is "executable". The user kept the name
  knowing it. The package name is free on npm.
- "Ex" on a tile reads as a spreadsheet's name: the mark is the whole word, never two
  letters.
- A reader of an older ADR meets `specimen` and `<dir>/specimen/`; this ADR is where the
  index sends them.
- A branch opened before the rename and merged after it is rebased over it: the mechanical
  part of the rename is one script, kept in the body of its commit, to be run again.
