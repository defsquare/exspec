# ADR-0004 — The target's lifecycle is commands of the target; specimen holds no driver

Status: Accepted (2026-11-13) — written by the main thread working alone, challenged,
reviewed by the user. Amended 2026-11-19: an observable is built, a provider, and
what the target sends to it is compared (ADR-0018); the providers' part of the starting
state is exspec's, not the lifecycle lines' (ADR-0021).

## Context

To play a scenario specimen must start the target, bring it to a starting state, bring it
back there before each scenario, and stop it. The spike did the restoring itself, through
JDBC: it knew the target's database, watched tables, and paid for it — 280 tables cost
sixteen minutes a pass on one target, a pool of ids held in the target's memory survived
the restore on another. The extraction is written by an agent working in the target's
checkout, with a shell.

## Decision

`target.yaml` holds the lifecycle as shell lines run from the checkout, and specimen runs
them without knowing what they do:

```yaml
start: [docker compose -f specimen/target/compose.yaml up -d]
alive: {method: get, path: /a, status: 200}     # a raw request: the target answers
seed:  [./specimen/target/seed.sh]              # from an empty target to the starting state
reset: [./specimen/target/reset.sh]             # back to the starting state
stop:  [docker compose -f specimen/target/compose.yaml down -v]
credentials: specimen/target/credentials.json   # written by the seed: {actor: {header: value}}
```

- **The starting state is what `seed` produces and `reset` restores.** What it holds
  besides the database is the scripts' business. A scenario starts from it: `reset` runs
  before each one.
- **An actor is a set of request headers** the seed writes for a name; a call names its
  caller. A call with no caller sends none.
- **A reference is taken from two executions on two fresh stacks**: stop, start, seed,
  play everything; then again. Two passes on one stack share what the seed drew (a
  timestamp, a salt, a token) and call it stable.
- **No observable is built yet.** A scenario records answers only: no side effect, no
  detector. Until one exists, "a refused call changed nothing" is not checked, and status
  says so.

## Alternatives

- **specimen restores the database itself** (a driver, truncate and reload). Gives a
  `database` observable for free; costs a driver per kind of target and makes specimen
  know the target's storage. Kept for the day an observable is built — which may then
  read without restoring.
- **A fresh stack per scenario.** No reset to trust; a JVM target starts in tens of
  seconds, times two executions, times every scenario.
- **Scenarios that do not depend on each other's state** (each arranges fresh data under
  fresh names). Fresh names are generated values in a scenario: predicted, not recorded.
- **Actors as a login call described in `target.yaml`** with a template for the header. A
  small language for what a seed script does in one line.

## Consequences

- A reset that restores too little is not seen by specimen as such: both executions
  accumulate the same changes in the same order. What guards it is a check on the
  interfaces alone — read, play a scenario that writes, reset, read again, compare — to
  build with the readings.
- State the scripts do not reach (a cache, a pool of ids in memory) survives a reset; the
  scripts may restart the target if that is what it takes.
- What the seed draws reaches a scenario through the credentials only. A target that
  draws the ids of what it creates (a third target does, at random, at each seed) leaves a
  scenario no way to name a seeded instance: written as a literal, the id is unknown on
  the next fresh stack and the accepted path is recorded as a refusal. Nothing here
  solves it; the two alternatives above about arranged data and a richer description of
  the target are the candidates.
- The scripts are part of the extraction and are versioned with it; what they produce (the
  credentials, a dump) is not.
