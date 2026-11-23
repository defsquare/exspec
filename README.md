<img src="docs/logo/exspec.svg" alt="exspec" width="260">

The behavioural contract of a software, extracted from what the software is seen to do.

exspec is the spec, extracted: read from the code of an existing system and from what the
running system answers. Its evidence is the **scenario**: a few calls to the system, and
what it answered. exspec records scenarios against the system, hangs a specification on
them — operations, rules, facts, structures — and says, for every claim of that
specification, what holds it.

## Install

exspec is in alpha: the commands and the notation of the files change from one version to
the next, and an extraction made with one version may not be read by another.

```
curl -fsSL https://raw.githubusercontent.com/defsquare/exspec/main/install.sh | sh
```

One executable for macOS or Linux, arm64 or x64, checked against the release's checksums
and put in `~/.local/bin` (`EXSPEC_INSTALL` to put it elsewhere). Or from the sources, with
[Bun](https://bun.sh): `bun install && bun run build` leaves `dist/exspec`.

`extract`, `roles` and `providers` drive an agent: they need
[Claude Code](https://claude.com/claude-code) — `claude` on the PATH, signed in — and the
installed `exspec --version` says which one it found. The system is started by commands
of its own, kept in `exspec/target.yaml`; those `extract` writes go through a compose
file, so Docker.

## Use it

exspec works in a checkout of the system, its **target**, and writes one directory there,
`<dir>/exspec/`: YAML files, and nothing else is stored.

```
exspec extract <dir>            # read the code, start the target, play scenarios, judge each rule
exspec status <dir>             # where the extraction stands; each claim that is not verified, and why
exspec view <dir> > page.html   # one page, from a structure to its operations and their proof
exspec roles replay <dir>       # later: every recorded scenario played on a fresh stack, the differences shown
```

`extract` runs five phases, each named for what it leaves in the files:

```
target      how the target starts, its starting state, its reset
interfaces  the list of its interfaces
reading     the structures, what holds for every operation, the rules
evidence    the scenarios, played and recorded as references
judgement   a judge's word on each rule and its reference
```

A phase does only what the files say is left of it, and is skipped when nothing is:
stopped, `extract` goes on from where the files stand. On a terminal it draws a flow;
piped, or with `--format json`, it prints every event.

Every command, with its options: `exspec --help` and [`docs/commands.md`](docs/commands.md). How an extraction flows, phase by phase: [`docs/extraction-flow.md`](docs/extraction-flow.md).

## What it claims

| claim | standing |
|---|---|
| A scenario recorded on a system is reproduced, or the difference is shown | built: recorded on two fresh stacks and replayed, on two targets; on a target with a clock, only with the clock held — not built |
| A recording says what cannot be predicted (a hash, a slug, a page, a count) | built: what two executions disagree on is kept beside the reference, in classes of equal values |
| A rule is declared, and scenarios verify or refute it | built, and it says when it cannot tell: on the two targets most rules are still declared only, for want of terms to say their facts and effects |
| The system does what it should | out of reach by construction: a bug is recorded as it is. A declared rule that a scenario refutes is where intent and behaviour part, and a human decides |

## The idea in four groups

```
proof           scenario, call, side effect          points at the specification
specification   operation, rule, fact, structure, field, service, condition    points at nothing below it
bindings        projection, trigger, detects, renders    the only shapes that know both sides
target          target, interface, observable (a provider is one)    points at nothing above it
```

A rewrite of the system keeps the specification and the scenarios, and rewrites the bindings.

A target that calls providers (a service is what the system needs of someone else, a
provider the system it calls to get it) is set up in this order: `proxy` and `observables`
written by hand in `target.yaml`; `exspec providers read`; `exspec providers write-twin`;
then `extract` or the `roles` commands. `extract` reads no provider.

## Status

It has run end to end on three targets, a Conduit, a Petclinic and a trainings platform that calls providers. What it does not do yet
is in [`docs/backlog.md`](docs/backlog.md); the decisions are in [`docs/adr/`](docs/adr/README.md).
Only what the target says outward is compared: what its interfaces answer and what it sends to a provider (ADR-0018).

The project starts from a spike made in another project, whose record is in
[`docs/brief/`](docs/brief/README.md): `framing.md` (what is kept, dropped, settled),
`shapes.edn` (every data shape as one instance, in the spike's notation),
`metamodel.md` (the concepts and what points at what).

## Developing

`CLAUDE.md` holds the project's conventions; `docs/adr/` the decisions. Enable the hooks
once per clone: `git config core.hooksPath .githooks`.

```
bun install
bun test
bun run check
bun src/cli/main.ts <command> …   # any command, from the sources
bun run build                     # dist/exspec, for this machine
bun run build all                 # dist/exspec-<platform>: darwin-arm64, darwin-x64, linux-x64, linux-arm64
bun run demo:flow                 # the flow of extract drawn from events written by hand; `bun run demo:flow 21` stops after 21 events
bun run live                      # record and replay Conduit's fixture (Docker)
```

A release is a tag: the version of `src/cli/main.ts`, then `git tag v<version>` pushed —
the workflow builds the four executables and publishes them with their checksums.

exspec is under the [Apache License 2.0](LICENSE).
