# exspec

The behavioural contract of a software, extracted from what the software is seen to do.

exspec is the spec, extracted: read from the code of an existing system and from what the
running system answers. Its evidence is the **scenario**: a few calls to the system, and
what it answered. exspec records scenarios against the system, hangs a specification on
them — operations, rules, facts, structures — and says, for every claim of that
specification, what holds it.

## What it claims

| claim | standing |
|---|---|
| A scenario recorded on a system is reproduced, or the difference is shown | built: recorded on two fresh stacks and replayed, on two targets; on a target with a clock, only with the clock held — not built |
| A recording says what cannot be predicted (a hash, a slug, a page, a count) | built: what two executions disagree on is kept beside the reference, in classes of equal values |
| A rule is declared, and scenarios verify or refute it | built, and it says when it cannot tell: on the two targets most rules are still declared only, for want of terms to say their facts and effects |
| The system does what it should | out of reach by construction: a bug is recorded as it is. A declared rule that a scenario refutes is where intent and behaviour part, and a human decides |

## Status

`exspec extract <dir>` runs five phases, each named for what it leaves in the files:
`target` (how the target starts, its starting state, its reset) and `interfaces`, one agent
session each, closed by a check the tool runs itself; then what the roles run — `reading`
(the structures, what holds for every operation, the rules), `evidence` (the scenarios,
played and recorded as references) and `judgement` (the judge's word on each rule). A phase
does only what the files say is left of it, and is skipped when nothing is. `exspec
status <dir>` says where an extraction stands: its counts, its phases, how many rules and bindings are
verified, refuted or only declared, each claim that is not verified with its reason, and
the facts that block the most rules. The extraction is a directory of YAML files,
`<dir>/exspec/`, and nothing else is stored.

It has run end to end on two targets, a Conduit and a Petclinic. What it does not do yet
is in [`docs/backlog.md`](docs/backlog.md); the decisions are in [`docs/adr/`](docs/adr/README.md).
No side effect is observed: only what the target's interfaces answer.

The project starts from a spike made in another project, whose record is in
[`docs/brief/`](docs/brief/README.md): `framing.md` (what is kept, dropped, settled),
`shapes.edn` (every data shape as one instance, in the spike's notation),
`metamodel.md` (the concepts and what points at what).

## The idea in four groups

```
proof           a scenario: written with holes, filled by an execution, kept as a reference
specification   operations and their rules, facts, structures and their fields — declared whole
bindings        projection, trigger, detects — what ties a target's interface to the specification
target          what is started, the interfaces it exposes, the observables where what it did is captured
```

A rewrite of the system keeps the specification and the scenarios, and rewrites the bindings.

## Working here

`CLAUDE.md` holds the project's conventions; `docs/adr/` the decisions. Enable the hooks
once per clone: `git config core.hooksPath .githooks`.

## Build and run

```
bun install
bun test
bun run check
bun run build                               # dist/exspec, one executable; extract then needs `claude` on the PATH
bun run demo:flow                           # the flow of extract drawn from events written by hand, in a terminal; `bun run demo:flow 21` stops after 21 events
bun src/cli/main.ts status <dir>            # --format json for one JSON object per line
bun src/cli/main.ts check <dir>
bun src/cli/main.ts verdicts <dir>          # every rule and trigger, judged by the references
bun src/cli/main.ts view <dir> > page.html  # one page, from a structure to its operations and their proof: the roles' reading when there is one, else the extraction
bun src/cli/main.ts target up <dir>         # start the target, wait until alive, seed
bun src/cli/main.ts target play <dir> [<operation>/<slug>…]   # on a target up: reset, play once, judge
bun src/cli/main.ts target down <dir>
bun src/cli/main.ts record <dir> [<operation>/<slug>…] [--force]   # two fresh stacks -> references
bun src/cli/main.ts replay <dir> [<operation>/<slug>…]   # one fresh stack, compared with the references
bun src/cli/main.ts extract <dir> [--phase <phase>] [--model <model>] [--jobs n] [--effort <low|medium|high>]   # target, interfaces, reading, evidence, judgement: what is left of each
bun src/cli/main.ts roles read <dir> [--only <interface>] [--jobs n]    # the structures, then a reader per interface -> exspec/roles/
bun src/cli/main.ts roles build <dir> [--only <interface>] [--jobs n]   # target up, a scenario builder per interface, evidence played
bun src/cli/main.ts roles judge <dir> [--only <interface>] [--jobs n]   # a judge per interface, no tool -> judgements.yaml
bun src/cli/main.ts roles play <dir> <interface>/<slug>                  # on a target up: reset, play one written scenario
bun src/cli/main.ts roles record <dir> [--only <interface>] [--force]   # each evidence played again on fresh stacks, its noise beside it
bun src/cli/main.ts roles replay <dir> [--only <interface>]              # each reference played once on a fresh stack, compared outside its noise
bun run live                                # record and replay Conduit's fixture (Docker)
```
