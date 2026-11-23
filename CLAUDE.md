# Project instructions — exspec

exspec: the behavioural contract of a software, extracted from what the software is seen
to do. A CLI records scenarios against a running target, hangs a specification on them —
operations, rules, facts, structures — and says, for every claim, what holds it.

**Project context — refer to it, do not duplicate here:**
- What the project is, how to build and run it → **`README.md`**
- Where it comes from, what is settled, what is kept and dropped → **`docs/brief/`** (start
  with `docs/brief/README.md`); the data shapes by instance → **`docs/brief/shapes.edn`**
- Architecture decisions (the *why*) → **`docs/adr/`** (index `docs/adr/README.md`)
- What is left to do → **`docs/backlog.md`**, the only backlog

`docs/brief/` is the record of the spike this project starts from. It is read, never
edited: a decision that changes one of its statements is an ADR here.

## Language

Commits, code, and documentation in **English** — including this instructions file.

## Branch discipline

**Never create specs, design docs, or implementation plans (nor any feature work)
directly on `main`.** Always start a dedicated branch first (e.g. `feat/<topic>`), do the
work there, and integrate via merge only when the work is done.

**Before a merge, the branch's history is cleaned and its tree is clean.** Clean history:
the fix-ups are squashed into the commit they fix, a step undone by a later step disappears
with it, no "wip" — each commit left is one step with the message and trailers it had to
carry. Clean tree: `git status` shows nothing, no stray file (screenshots, scratch scripts,
a copied target). The merge is fast-forward only (`--ff-only`): `main` stays linear, and the
branch's last commit — the one that deletes its working file — carries the challenger's
verdict.

## Backlog

**One backlog, `docs/backlog.md`; one working file per branch, `docs/branches/<branch>.md`.**
An item lives in exactly one of them. Opening a branch, write its working file with three
sections — *Frame* (goal, non-goals), *Journal* (runs, measures, the challenger's
verdicts), *Backlog* (this branch's items) — and **move** the items it takes out of
`docs/backlog.md`, never copy them. What the branch finds and will not do goes straight
into `docs/backlog.md`.

At the merge, empty the working file: each open item goes back to `docs/backlog.md` or is
dropped with its reason in the commit that deletes the file; a design worth keeping becomes an ADR; then
delete the file — the branch's commits are its record. An item that goes back is written
to be picked up cold — *Seen*, *Settled*, *Next*, *Source* — its Source pinned to the last
commit that holds the working file. A done item is deleted from `docs/backlog.md`, never
ticked: its commit says which item it closes.

**Never cite a backlog item from code or an ADR.** Items move and vanish; write what the
item says. A commit may cite one.

## The metamodel

**A concept exists because a target uses it.** Adding, removing or renaming
a concept is what calls for an ADR — the index is not a list of the concepts; a concept
removed from the code gets its ADR marked `Deprecated`. Keep no concept because it
already exists, and add none a target has not asked for: the spike's fit test
(`docs/brief/fit-*.md`) lists what two targets need.

Four groups, and the direction of every reference (the spike's drawing:
`docs/brief/metamodel.md`). `docs/metamodel.md` draws the concepts the roles' reading
writes, from `docs/metamodel.yaml`: a schema that adds, removes or renames one of them, or a
link between two, changes that file in the same commit. `fact`, `projection` and `detects`
are of the computed path only and are not drawn there.

```
proof           scenario, step, evidence, side effect, judgement    points at the specification
specification   operation, rule, fact, structure, field, service, condition, state    points at nothing below it
bindings        projection, trigger, detects, renders    the only shapes that know both sides
target          target, interface, observable (a provider is one)    points at nothing above it
```

**What survives the target being rewritten is of the specification; what may not is of the
target** (ADR-0019). A service — what the system needs of someone else — is of the
specification; the provider this target calls to get it is of the target.

**A state is a business situation a scenario starts from** (ADR-0025): a name, the
structures it is about, and what a reading of the system shows once in it — never how it
was reached, never a row of the store. It is of the specification. Its path — the scenario
that reaches it, and the state's sentence judged on that scenario's recording — is of the
proof; a state is reached when that judgement holds. One entry of `states.yaml` holds both,
the state and the name of its path: the one place a file of the specification names a
scenario. A state belongs to scenarios, not to a rule: the scenarios of one rule may start
from different states.

Three rules the design rests on — a change to one of them is an ADR:

- **The specification is declared whole; a scenario is written with holes and an execution
  fills them.** Nothing is predicted.
- **Only what the target says outward is compared**: what it answers at its interfaces and
  what it sends to a provider. What a provider answers it is kept, not compared. An
  observable inside the target (a database, a trace) detects and explains; it is never the
  reference (ADR-0018).
- **Nothing derivable is stored.** A verdict, a provenance, a report are computed from the
  scenarios and the specification, every time.

**Before a merge into `main`**, the `challenger` reads `git diff main...<branch>` against
the ADR index and the branch's working file: a concept added without an ADR, one the branch
made obsolete and left standing, a name that no longer says what the code does. Names are
judged on Deep Roots' *Naming as a Process* ladder — missing, nonsense, honest, honest and
complete, does the right thing, intent, domain abstraction: make a name honest about what
the code does before restructuring the code to fit it.

## The stack

TypeScript, strict, run and built with Bun; the terminal rendered with Ink; the data
shapes as zod schemas; generated values with fast-check; the agent driven through the
Claude Agent SDK (ADR-0002). Add no dependency for what the platform or a few lines do.

**CLI first.** Every capability is a command. Anything that runs emits **events as data**;
the terminal renderer, `--format json` and a viewer are three readers of that one stream.
A command never prints from the middle of its logic: it emits, a renderer prints.

## Layers

A module imports only its own layer or the layers below it — never one above.

```
shapes   the data shapes as schemas, their types, reading a file into them     pure
derive   verdicts, provenance, checks, generated values                        pure
run      playing a scenario, recording, replaying — plain data in and out      effects through `io`
agent    the briefs, driving the agent, turning its stream into events
cli      commands, the event renderers                                         the entry point
io       http, the observables, the target's lifecycle, files                  required by run, agent, cli only
```

Each layer is a directory under `src/`. `shapes` and `derive` are pure: no file, network,
clock, random source or environment variable — a clock and a seed are arguments. An
architecture test enforces the imports.

**One module, one step.** A module that chains several steps is several modules. Past ~300
lines, ask which step it is doing.

## Data and types

- **The schema is the source, the type is inferred** (`z.infer`). Never write a type and a
  schema for the same shape.
- **Data is plain and immutable**: `readonly` objects and arrays, no class for a shape, no
  method on data. A variant is a discriminated union on a literal field, matched
  exhaustively (`never` in the default branch). One exception, decided by
  ADR-0019, ADR-0024 and ADR-0025: a scenario's step is told by the key it alone has —
  `call`, `request`, `service` or `state`; no literal field repeats the notation.
- **No `any`, no non-null `!`, no `as` cast** outside a schema's parse boundary. What
  comes from outside (a file, an answer, the agent) is `unknown` until a schema parses it.
- **Destructure by name.** A tuple wider than two is an object.

## Effects and errors

A function with a side effect lives in `io`, `run`, `agent` or `cli`, and its name says the
effect (`writeReference`, `startTarget`). Functions of `run` take what they need as
arguments — the target, a clock — and return plain data.

Raise an `Error` subclass carrying a literal `type`; catch only in `cli` or at the top of a
run. Never swallow: a `catch` returns a diagnostic the caller shows, or rethrows. An
expected outcome (a scenario refused, a rule refuted) is data, not an exception.

## Comments and docs

**Show the data, do not describe it.** A comment explaining a transformation in three
sentences is one example long: write the input and the output, aligned, and keep in prose
only what an example cannot carry — why this order matters, what breaks without that check.
Keep the example **generic**: `f`, `a`, `"es"` carry the form; a name borrowed from a real
fixture makes the reader read a domain instead of a shape.

Never cite a section number of a design document from code. ADR numbers are citable: an ADR
is an immutable record.

**The agent's instructions cite nothing of exspec's** — its system prompt and briefs name
no ADR, no doc, no backlog item: the agent runs in the target's checkout and reads none of
them. Write what the decision says.

## Tests

`bun test` always passes with no setup: no target started, no network. A test that needs a
running target lives apart and is run by its own command.

**Tests are documentation: an assertion shows the expected data.** Compare a whole value
with `toEqual` rather than asserting a predicate on a fragment dug out with `some`, a
regex or a chain of accessors. No explanatory comment inside a test: the `test("…")` name
carries the label.

A test reads an example as an input — a scenario file, a target's description — and asserts
nothing a developer edits to run it (a port, a URL, credentials). Derive such a value from
the file the test read, or read a copy under `test/fixtures/`.

Non-trivial logic leaves one runnable check behind. A one-liner needs none.

## Lint and format

`bun run check` — the type-check, the linter and the formatter — reports nothing before
every commit, enforced by `.githooks/pre-commit` once the tooling exists (enable hooks once
per clone: `git config core.hooksPath .githooks`). Fix a warning at its cause; silence one
only with a comment saying why.

## Refactoring commits

A `refactor:` commit changes no behaviour: tests may follow a moved or renamed module, but
no assertion changes. If an assertion has to change, that is a separate commit, and it says
why.

## Workflow — who writes the code

**The model follows the task, not the session.** The main thread runs on Opus: it frames
the branch, splits it into items, writes each item's brief, gives the verdict on the work
and does the ADR pass and the commits of its own. Fable is never called by a rule — the
user switches to it with `/model` for brainstorming, design or a debugging that goes round
in circles.

| Role | Agent | Model |
|---|---|---|
| Item with its data and test written in the brief | `implementer` | sonnet |
| Heavy item — several layers, the run, the derivations | `implementer` | opus |
| Mechanical batch — renames, doc sync, lint, one dispatch for the batch | `implementer` | haiku |
| Review of each item — conformance to the brief, CLAUDE.md conventions | `reviewer` | sonnet |
| Design review, pre-merge review | `challenger` | opus |
| Search across the code | `Explore` | haiku |

Always pass `model` at dispatch: an omitted model inherits the session's.

**The loop, per item.** The brief is a file, the implementer's report is a file next to it
(both under the scratchpad, never committed); the branch file's *Journal* holds one line per
item done — it is the ledger, there is no other. After the implementer, the `reviewer` gives
two verdicts; a Critical or Important finding goes back to the same implementer, two rounds
at most, then one round with a fresh implementer one model up; still open, the main thread
stops and puts it to the user. Minor findings go to the Journal for the pre-merge
challenger. One implementer at a time when a target is running: it is shared.

**Stay in the thread** for a fix under ~30 lines in one module, above all one found during
a run, when the context is already loaded: a dispatch costs more than it saves.

**What the main thread does not delegate:** a decision an ADR or one of the metamodel's
three rules depends on — it goes to the user, through the challenger when "Challenge before
proposing" says so. An implementer that meets one reports it instead of deciding.

## Challenge before proposing

Before putting a design to the user, have the `challenger` agent review it when any of:
- it needs a new ADR, or amends or supersedes one;
- it adds a concept, or a key to a data shape;
- it is the second heuristic in a row for the same problem (a sign the approach is wrong);
- it makes something derivable stored, or something observed predicted.

Report its verdict alongside the proposal — agreeing or not — and let the user decide.
Not for bug fixes, renames, or a change an accepted ADR already decides.

## Mandatory ADR pass before every commit

**What gets an ADR, and what does not.** An ADR records a decision that matters on one of
three subjects:

- the **architecture** — the layers and what may import what, the stack, a dependency that
  shapes the code, how the tool talks to a target or to the agent;
- the **overall design** — one of the three rules the design rests on, the notation of the
  files, the event stream, how a scenario is played, recorded and compared;
- the **metamodel** — a concept added, removed or renamed, a link between two concepts, a
  key added to a data shape.

Everything else is told in the **body of the commit message**: the choice made, the reason,
what was set aside — a local implementation choice, the layout of a module, a term added
inside an existing shape, a library's option, a fix. When in doubt: would someone rewriting
this module in a year have to know the decision to avoid undoing it by accident? If not,
the commit carries it.

Before **every** `git commit`, do a pass over the ADRs:

1. Compare the staged diff (`git diff --cached`) against the ADRs in `docs/adr/`.
2. **Create** a new ADR (Nygard format: Context / Decision / Alternatives / Consequences)
   for any decision of the diff on one of the three subjects above; write any other
   decision in the commit body.
3. **Supersede** — status `Superseded by ADR-XXXX` + link — any ADR made obsolete;
   **deprecate** — status `Deprecated`, one line on what replaced it — the ADR of a concept
   the diff removes.
4. Include in the commit message an `ADR-Reviewed: <what was checked / created /
   superseded>` trailer — or `ADR-Reviewed: none — no architectural decision touched`.

This pass is **enforced by the git hook `.githooks/commit-msg`**: a commit made by an agent
without an `ADR-Reviewed:` trailer is blocked; a commit typed by hand is not.

Update the index `docs/adr/README.md` whenever an ADR is created, superseded or deprecated.
