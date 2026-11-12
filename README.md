# specimen

The behavioural contract of a software, extracted from what the software is seen to do.

A specimen is an example taken from the real thing to characterize it. Here it is a
**scenario**: a few calls to a running system, and what the system answered. specimen
records scenarios against an existing system, hangs a specification on them — operations,
rules, facts, structures — and says, for every claim of that specification, what holds it.

## What it claims

| claim | standing |
|---|---|
| A scenario recorded on a system is reproduced, or the difference is shown | held on three targets in the spike; on a target with a clock, only with the clock held |
| A recording says what cannot be predicted (a hash, a slug, a page, a count) | held |
| A rule is declared, and scenarios verify or refute it | the shape is drawn; nothing is built |
| The system does what it should | out of reach by construction: a bug is recorded as it is. A declared rule that a scenario refutes is where intent and behaviour part, and a human decides |

## Status

**Nothing is built.** This repository starts from a spike made in another project; its
record is in [`docs/brief/`](docs/brief/README.md). Read, in this order:

1. [`docs/brief/framing.md`](docs/brief/framing.md) — what is kept, dropped, settled, left open.
2. [`docs/brief/shapes.edn`](docs/brief/shapes.edn) — every data shape as one instance.
3. [`docs/brief/metamodel.md`](docs/brief/metamodel.md) — the concepts and what points at what.
4. [`docs/backlog.md`](docs/backlog.md) — what to build first.

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
bun src/cli/main.ts status <dir>            # --format json for one JSON object per line
bun src/cli/main.ts check <dir>
bun src/cli/main.ts up <dir>                # start the target, wait until alive, seed
bun src/cli/main.ts play <dir> [<operation>/<slug>…]     # on a target up: reset, play once
bun src/cli/main.ts down <dir>
bun src/cli/main.ts record <dir> [<operation>/<slug>…] [--force]   # two fresh stacks -> references
bun src/cli/main.ts replay <dir> [<operation>/<slug>…]   # one fresh stack, compared with the references
bun src/cli/main.ts extract <dir> [--phase <phase>] [--model <model>]   # an agent writes the extraction, phase by phase
bun run live                                # record and replay Conduit's fixture (Docker)
```
