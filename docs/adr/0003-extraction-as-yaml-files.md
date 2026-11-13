# ADR-0003 — The extraction is a directory of YAML files in the target's checkout

Status: Accepted (2026-11-13) — written by the main thread working alone, challenged,
reviewed by the user.

## Context

What specimen extracts from a target — its description, the specification, the bindings,
the scenarios and their references — has to be kept somewhere. It is written by an agent
working in the target's checkout, read and corrected by a human, compared between two
versions, and read whole by every command. The spike kept it in EDN files; ADR-0002 left
the notation open. The user asked for no elaborate store: files, or one database file,
whichever is most practical.

## Decision

An **extraction** is the directory `<dir>/specimen/` of the target's checkout:

```
specimen/
  target.yaml                           what is started, and how
  target/                               the target's own files the lifecycle runs: a compose
                                        file, a seed, a reset — never parsed
  interfaces.yaml                       the interfaces and the named wire schemas
  structures.yaml
  facts.yaml
  operations/<operation>.yaml           one operation, whole
  bindings.yaml                         projections, triggers
  scenarios/<operation>/<slug>.yaml     a scenario as written, with its holes
  references/<operation>/<slug>.yaml    the played copy that is kept
```

The played copies of an execution are not written: they travel on the event stream.

- **YAML**, read and written with Bun's own parser (no dependency), every file parsed by a
  zod schema at the boundary. A key the schema does not know is an error, not ignored.
- **A hole is an absent key.** A scenario under `scenarios/` has no answer, no value seen
  before or after: its schema has no key for them, so a predicted value cannot be written.
- **The state of a scenario is where its file is**: written under `scenarios/`, kept under
  `references/` at the same relative path. No `status` key.
- **No database.** Every count, state and verdict a command shows is computed from these
  files each time.
- **An extraction is wrong, or incomplete.** A *problem* is a file that does not fit its
  schema or a name that points at nothing: the extraction cannot be trusted and
  `specimen check` fails. A *gap* is what is still missing for the extraction to be whole
  (a rule no scenario proves, a refusal no trigger translates): it is reported and fails
  nothing. The gaps measure what is missing, not what is wrong in what is there: a
  scenario whose accepted path is recorded as a refusal is neither a problem nor a gap.

Where the notation says something the spike's instances (`docs/brief/shapes.edn`) did not:

| in the brief | here | why |
|---|---|---|
| `:condition []` for a fact about the caller alone | `condition: [{caller: signed-in}]` | an empty condition meant both "about the caller" and "not written yet"; empty now only means not written |
| `:then {:field {["S" :f] [:minus 1]}}` | `then: {field: [{of: [S, f], change: [minus, 1]}]}` | a YAML key cannot be a list |
| `:start {:compose … :alive …}`, `:seed`, `:credentials {actor headers}` in the target | `start`, `seed`, `reset`, `stop` as shell lines, `alive` as a raw request, `credentials` as the path of a file the seed writes | the lifecycle is decided in ADR-0004 |
| `:status :planned/:played/:reference` | no key | the state is where the file is |

## Alternatives

- **JSON.** No dependency either, and no surprise in scalars (`no`, `0123`). Heavier to
  read and to review in a diff, no comment. The surprises of YAML are caught by the
  schemas: a field declared a string refuses a number.
- **TypeScript modules.** Typed while editing; but the agent writes them in a checkout that
  has no tooling for them, and loading one executes code.
- **A SQLite file.** Queries for free. Nothing a human reads, nothing a diff shows, and the
  agent needs a tool of its own to write to it.
- **Outside the target's checkout.** Keeps the target's repository untouched; loses the
  version of the extraction moving with the version of the target.

## Consequences

- The extraction is versioned with the target. `<dir>/specimen/` is the only place a
  command reads or writes: an extraction copied elsewhere is read only under a directory
  named `specimen`.
- Renaming a scenario's file orphans its reference: a check names a reference with no
  scenario, and a reference whose written part no longer matches its scenario.
- Reading everything on every command is the cost of storing nothing derived; a target of a
  few hundred scenarios is a few hundred small files.
- EDN's tagged vectors have no equivalent: a mark put *inside* a recorded value (`[:noise
  1]`) could collide with what a target answers, so what is said *about* a recorded value is
  kept beside it, never in it.
