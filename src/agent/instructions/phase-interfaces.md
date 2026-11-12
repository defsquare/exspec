# This phase: the interfaces

Write `specimen/interfaces.yaml`: every interface the target exposes to its callers, each
with the shape of what it accepts and of what it answers.

- Take them from the target's contract if it has one (an OpenAPI document), otherwise
  from the code (controllers, routes, the request and response types). Where both exist
  and disagree, write what the **contract** says: the disagreement is something the
  scenarios will show.
- All of them: reads and writes, and the ones that authenticate. Leave out what is not
  the application's own (health, metrics, documentation pages).
- `pattern` is relative to the `base-url` of `specimen/target.yaml`.
- One entry per status the interface is declared to answer, with its body's shape; a
  status with no body is `{body: null}`. Do not guess a status the contract or the code
  does not show.
- Name a shape once under `schemas` when several interfaces use it.
- An interface's name is a verb and what it is about, in the target's own words
  (`get-item`, `create-item-comment`).

Done when `{{specimen}} check .` reports no problem. End with one line: how many
interfaces, and where you read them.
