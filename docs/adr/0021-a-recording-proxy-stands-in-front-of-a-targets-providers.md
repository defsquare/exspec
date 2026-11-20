# ADR-0021 — A recording proxy of exspec's stands in front of a target's providers, for the time of a command that plays

Status: Accepted (2026-11-19) — the proxy settled with the user; the keys below first run
as a spike on one target, then kept. 2026-11-20: a condition is the twin's to satisfy
(ADR-0019), and the proxy forces nothing.

## Context

What a target sends to a provider is compared (ADR-0018): something has to record it. A
provider is stood in for by a twin exspec writes (ADR-0020): something has to serve it and
pass it the conditions a scenario gives its service (ADR-0019).

A record that rests on generated code would be only as good as each twin.

## Decision

- **`target.yaml` declares the proxy and the providers together**, one never without the
  other:

  ```yaml
  proxy: {port: 9100, quiet: 150}
  observables:
    - {observable: p, kind: provider}
  ```

  The target is configured, by its own start lines, to call `http://127.0.0.1:<port>/p`
  where it would call the provider. The name is what that configuration and the provider's
  folder agree on.

- **Behind the proxy, each provider's twin**, `exspec/providers/p/twin.ts`, which exspec
  serves itself on a port it picks — no one but the proxy talks to a twin.

- **The proxy and the twins stand for the time of a command that plays the roles'
  scenarios** — `roles build`, `play`, `record`, `replay`, and `extract` — started by a
  named effect before the command and stopped after it, whatever happened. A command that
  plays nothing — a reader, the judge, `up`, `down` — stands none: it would only hold the
  port. The older `play`, `record` and `replay` stand none either.

- **A call is of the step during which it arrived.** A step ends when the proxy has been
  silent for `quiet` milliseconds (150 by default) after the target answered; the calls
  recorded since the last step are that step's `side-effects`, in the order received.

- **A condition a scenario gives a service goes to the twin of the provider that renders
  it**, and is never recorded as a call: it is the scenario's, not the target's. The proxy
  records and passes on; it dictates no answer and forces no failure.

- **Every play starts the providers from their start**: after the target's reset, what
  was recorded is forgotten and each twin is given its starting state.

- **A step whose calls could not be recorded keeps its answer and has no `side-effects`**:
  what the target sent is unknown, which is what an absent key says (ADR-0018).

## Alternatives

- *The twin records*: the record would rest on code an agent wrote.
- *A failure forced in the proxy, a state given to the twin* — what was built first: two
  mechanisms a scenario had to choose between, each written in the provider's wire.
- *Every arrangement through the proxy, answers dictated per scenario* (the challenger's
  first reading): a scenario would restate, call by call, what a twin knows once.
- *What stands behind a provider declared* (`behind`, a twin by default): no target used
  it. The proxy is where a real provider would be put behind, the day one is.
- *The twins started by the target's own lines*: tried first. A port to write in
  `target.yaml`, a reset to write by hand, for files exspec wrote.
- *A proxy for the whole time a target is up*: a target left up by `up` would need the
  proxy to outlive the command. Not asked for yet: a play is what records.

## Consequences

- Amends ADR-0004: a target's lifecycle lines no longer hold all of what the starting
  state is — the providers' part is exspec's.
- Each step waits `quiet` milliseconds. A target that calls a provider later than that
  after answering has the call attributed to the next step, or lost after the last one.
- Calls are paired by position: a target that sends two at once may swap them, and its
  scenario is told unstable.
- A key a target sends to a provider in a header is never stored; one sent in a query or a
  body would be. Nothing stops it yet.
- Two commands that play cannot run at once on one target: the port is one.
