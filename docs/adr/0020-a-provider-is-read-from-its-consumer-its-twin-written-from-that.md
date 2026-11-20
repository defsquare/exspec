# ADR-0020 — A provider and the service it renders are read from the consumer, and the provider's twin written from that reading

Status: Accepted (2026-11-19, the service set apart from its provider on 2026-11-20) — the
design read twice by the challenger before it went to the user; "build with these
changes" each time, taken but for one point said below.

## Context

A provider a target calls is stood in for by a twin (ADR-0018), and renders a service of
the specification (ADR-0019). The first twins were written by hand, and what a scenario
builder knew of a provider was one sentence. Three runs on a first target showed what that
costs: a failure forced at a path the target never calls, a header the target reads
(`X-Pdf-Key`, `Location`) that lived in prose only, and an alternative the target's code
tells apart — a PDF answered with no key — that the hand-written twin could not be put in.

No specification of the real provider is at hand. What can be read is what the target
expects of it: the calls it makes, what it does with each answer.

## Decision

- **One reading of the target's code writes both sides**:

  ```
  exspec/services/<service>.yaml               the service and its conditions (ADR-0019)
  exspec/providers/<provider>/provider.yaml    the service it renders, the form of its state, what the target expects of it
  exspec/providers/<provider>/interfaces.yaml  where the target calls it — the notation of the target's own interfaces
  exspec/providers/<provider>/twin.ts          the program that stands for it
  ```

- **`interfaces.yaml` is the existing notation**, read by the existing schema and check. A
  response gains an optional `headers`, a map of header name to shape, for the headers the
  caller reads:

  ```yaml
  responses:
    "200": {body: any, headers: {x-a: string}}
  ```

- **`provider.yaml`**:

  ```yaml
  provider: p
  renders: s
  state:
    shape: {made: int, kept: [string]}
    says: made counts what was made; a key not in kept is gone
  expects:
    - expect: make-gives-key
      on: make                # an interface of interfaces.yaml
      says: a made item is answered with its key in x-a
      source: src/a/b.ts
  unsure:
    - whether a key is ever answered without x-a
  ```

  The state's form is a plain wire shape, not structures of a specification: nothing is
  computed from it. An entry of `expects` is named by `expect`, not `rule`: it is never
  judged, and does not borrow the name of a concept of the specification.

- **Two roles.** The *provider reader* reads the target's code — its tests and fakes of
  the provider included — and writes the service's file and the provider's two YAML files.
  The service's file says nothing of the wire: no path, no status, no header, no vendor.
  Every alternative the code tells apart in a provider's answer must be reachable through
  a condition of the service; one that is not goes under `unsure`. The *twin writer* reads
  those files alone, never the target's code, and writes `twin.ts`.

- **A twin is a module with a fixed contract, served by a file exspec writes.**

  ```ts
  export const fresh = () => ({ made: 0, kept: [], refused: [] });
  export const given = {
    "forgets-everything": (state) => ({ ...state, kept: [] }),
    refuses: (state, { address }) => ({ ...state, refused: [...state.refused, address] }),
  };
  export const answer = async (state, request, path) => new Response(…);
  ```

  `given` holds every condition of the service the provider renders: **the twin is what
  satisfies a condition**, a failure of the provider included. `exspec/providers/serve.ts`,
  the same text for every target, serves each folder that has a `twin.ts` under `/<name>/`
  on one port, and holds its state:

  ```
  GET /<p>/__state                     its state
  PUT /<p>/__state                     its state becomes fresh()
  PUT /<p>/__given {condition, with}   its state becomes given[condition](state, with)
                                       an unknown condition is answered 404, one that raises 400
  ```

  Nothing of exspec is imported by either file; exspec runs `serve.ts` itself when a
  command plays (ADR-0021), and writes it again each time it does: the stored copy is never
  older than the tool. A twin draws nothing at random, reads no clock and checks no
  credential.

- **The gate of a twin is over HTTP**: it is served, its state read; then each condition
  of the service is given to it on its starting state, with values made from the
  condition's parameters, and must be taken. A condition may leave a starting state as it
  is — "what was kept is forgotten", when nothing is kept yet. exspec never imports a
  `twin.ts`. That a twin answers as expected is shown where it matters: by replaying
  references recorded before against it.

- **A twin is a stored file with a role that writes it**: what holds a provider's place,
  written from what the target expects, stored as a judgement is. It is not a concept of
  the specification: nothing points at it, and it is not compared.

- **A scenario builder and an interface's reader read the services, never the providers.**

- Commands: `exspec providers read <dir>`, `exspec providers write-twin <dir>`, each with
  `--only <provider>`. An event of either role says its `provider`, where a role of an
  interface says its `interface` (ADR-0016).

## Alternatives

- *A provider's file mapping each condition to a state or a failure, as templates*: a
  language to write and a merge to define for what a function of the twin does.
- *A response dictated in the proxy for an alternative the state cannot reach* (the
  challenger's first): an answer with no key is a state of the provider — a backend that
  keeps no file — not a failure.
- *The state as structures of the specification*: nothing reads them.
- *A gate that generates requests from the shapes*: two modules for what a replay shows.
- *A twin in the target's language, or a container*: the twin is exspec's file, not the
  target's. It assumes Bun on the machine that starts the target.

## Consequences

- A response's headers are described but still not recorded in an evidence (ADR-0018): a
  rule about a header the target answers stays not shown.
- Nothing reconciles a provider's reading with the real provider. The reading is the
  consumer's side of a contract; the provider's side is not at hand.
- A failure can no longer be forced in front of a real provider: only a twin takes a
  condition.
