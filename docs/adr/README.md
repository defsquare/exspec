# Architecture decision records

Nygard format: Context / Decision / Alternatives / Consequences. An ADR is immutable: a
decision that changes is a new ADR, the old one marked `Superseded by ADR-XXXX`; the ADR of
a concept removed from the code is marked `Deprecated`.

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-observe-then-specify.md) | Observe, then specify: recorded scenarios are the oracle, the specification is hung on them | Accepted |
| [0002](0002-typescript-on-bun.md) | TypeScript on Bun, CLI first, events as data | Accepted |
| [0003](0003-extraction-as-yaml-files.md) | The extraction is a directory of YAML files in the target's checkout; no database | Accepted |
| [0004](0004-lifecycle-as-commands.md) | The target's lifecycle is commands of the target; two executions on two fresh stacks; no observable yet | Accepted |
| [0005](0005-noise-beside-the-copy.md) | A reference is a played copy, its noise kept beside it, in classes of equal values | Accepted |
| [0006](0006-extract-in-phases.md) | `extract` is phases with gates the CLI runs; the agent's tools are the CLI's commands; it never writes a reference | Superseded by [ADR-0014](0014-extract-runs-the-roles.md) |
| [0007](0007-readings-around-the-judged-call.md) | What is read around the judged call: the facts its operation cites, through a projection that locates an instance | Accepted |
| [0008](0008-verdicts-derived.md) | The verdicts are derived, and say when they cannot tell | Accepted |
| [0009](0009-view-a-page-of-the-extraction.md) | `view` makes one page of the extraction — the structures, their operations, the verdicts — and it is the command's output | Accepted |
| [0010](0010-three-roles-a-judged-reading.md) | A judged reading by three roles kept apart — a reader, a scenario builder, a judge — one of each per interface; the builder's only access to the target is a tool of its own | Accepted |
| [0011](0011-a-requirement-says-the-input-it-is-about.md) | A requirement may say the input it is about (`on`); the page gathers those under the input, in one stop of the operation's column | Accepted |
| [0013](0013-a-roles-evidence-is-a-reference.md) | A roles' evidence is a reference: its noise beside it, made by `roles record`, replayed with no agent; a judgement stands as long as its stored copy does | Accepted |
| [0014](0014-extract-runs-the-roles.md) | `extract` runs the three roles, in five phases named for what they produce — target, interfaces, reading, evidence, judgement — each doing only what is left of it | Accepted |
| [0015](0015-the-tool-is-named-exspec.md) | The tool is named `exspec`, an extraction is `<dir>/exspec/`; the records written before keep the old name, `specimen` | Accepted — the mark superseded by ADR-0017 |
| [0016](0016-a-role-says-what-failed-it-a-step-how-many-it-runs.md) | A role says what failed it (`role-failed`), not `command-failed`; a roles' step says how many interfaces it was given (`roles-queued`) | Accepted |
| [0017](0017-the-mark-is-a-cloche-over-ex.md) | The mark is the word with a cloche over `ex` — a bracket laid down, in the accent colour — and `spec` outside it; animated, a beam sweeps under the cloche | Accepted |
