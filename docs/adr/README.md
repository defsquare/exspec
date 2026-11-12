# Architecture decision records

Nygard format: Context / Decision / Alternatives / Consequences. An ADR is immutable: a
decision that changes is a new ADR, the old one marked `Superseded by ADR-XXXX`; the ADR of
a concept removed from the code is marked `Deprecated`.

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-observe-then-specify.md) | Observe, then specify: recorded scenarios are the oracle, the specification is hung on them | Accepted |
| [0002](0002-typescript-on-bun.md) | TypeScript on Bun, CLI first, events as data | Proposed |
| [0003](0003-extraction-as-yaml-files.md) | The extraction is a directory of YAML files in the target's checkout; no database | Proposed |
| [0004](0004-lifecycle-as-commands.md) | The target's lifecycle is commands of the target; two executions on two fresh stacks; no observable yet | Proposed |
| [0005](0005-noise-beside-the-copy.md) | A reference is a played copy, its noise kept beside it, in classes of equal values | Proposed |
| [0006](0006-extract-in-phases.md) | `extract` is phases with gates the CLI runs; the agent's tools are the CLI's commands; it never writes a reference | Proposed |
