# Architecture decision records

Nygard format: Context / Decision / Alternatives / Consequences. An ADR is immutable: a
decision that changes is a new ADR, the old one marked `Superseded by ADR-XXXX`; the ADR of
a concept removed from the code is marked `Deprecated`.

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-observe-then-specify.md) | Observe, then specify: recorded scenarios are the oracle, the specification is hung on them | Accepted |
| [0002](0002-typescript-on-bun.md) | TypeScript on Bun, CLI first, events as data | Proposed |
