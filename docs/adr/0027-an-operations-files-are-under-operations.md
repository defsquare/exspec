# ADR-0027 — An operation's files are under `operations/`; what is of no operation is at the root

Status: Accepted (2026-11-23) — a wider layout read by the challenger ("keep, with four
corrections"), then reduced by the user: the folder is renamed, its two files of no
operation leave it, the proof stays with its operation.

## Context

The three roles wrote under `exspec/roles/` (ADR-0010), a folder named when their reading
stood beside the computed specification: the name says who wrote, not what is held. Since
`extract` runs the roles (ADR-0014) it is the extraction itself. Under it, one folder per
operation, and two files that are of no operation — the rules shared by every operation
and what the target says of its wire (ADR-0023).

## Decision

```
before                              after
roles/common.yaml                   common.yaml
roles/protocol.yaml                 protocol.yaml
roles/<op>/rules.yaml               operations/<op>/rules.yaml
roles/<op>/hints.yaml               operations/<op>/hints.yaml
roles/<op>/trigger.yaml             operations/<op>/trigger.yaml
roles/<op>/scenarios/<slug>.yaml    operations/<op>/scenarios/<slug>.yaml
roles/<op>/evidence/<slug>.yaml     operations/<op>/evidence/<slug>.yaml
roles/<op>/judgements.yaml          operations/<op>/judgements.yaml
```

- **`operations/<op>/` holds all that is read, played and judged of one operation**: its
  rules, the trigger that binds it to its interface, the reader's note to the builder
  (`hints.yaml`), its scenarios, their evidence, their judgements.
- **`common.yaml` and `protocol.yaml` are at the root**, beside `structures.yaml` and
  `interfaces.yaml`: they are of no operation.
- **One layout is read.** An extraction that still has `exspec/roles/` is refused by every
  command, with the script to run: `scripts/migrations/0027-roles-to-operations.ts`.
  Read as it is, it would look empty and be made again.
- **No stored value changes.** A state's `path` is `<op>/<slug>`, a judgement names a slug,
  the text hashed for a judge names no file: a rewritten extraction keeps its references
  and its judgements.
- The commands keep their name (`exspec roles …`): a role is who works.

## Alternatives

- *The proof apart*, `proof/<op>/scenarios`, `evidence`, `judgements.yaml` — first
  decided, then set aside by the user: a builder would read one tree and write another,
  and an operation's files would be in two places.
- *The two shared files kept in the folder*, `operations/common.yaml`: the computed path
  reads `operations/<name>.yaml` as an operation; two names would have to be reserved.
- *Both layouts read*: two spellings of every path until the last old extraction is gone.
- *`hints.yaml` elsewhere*: it is neither of the specification nor a binding, but the
  reader writes it with the rules and one gate checks the two.

## Consequences

- Amends ADR-0010, ADR-0023 and ADR-0025 where they name `roles/`; their text is left as
  written.
- A checkout that holds both paths has `operations/a.yaml`, of the computed
  specification, beside `operations/a/`: read without a clash — a file, a folder — and
  told apart only by that, until the computed path is deprecated.
- The folder of an operation still holds files of three groups of the metamodel: the
  specification, a binding, the proof.
