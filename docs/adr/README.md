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
| [0010](0010-three-roles-a-judged-reading.md) | A judged reading by three roles kept apart — a reader, a scenario builder, a judge — one of each per interface; the builder's only access to the target is a tool of its own | Accepted — amended by [ADR-0023](0023-a-refusal-is-named-in-the-rule-its-wire-is-the-triggers.md) and [ADR-0024](0024-a-scenarios-step-calls-an-operation-the-trigger-gives-the-request.md) |
| [0011](0011-a-requirement-says-the-input-it-is-about.md) | A requirement may say the input it is about (`on`); the page gathers those under the input, in one stop of the operation's column | Accepted |
| [0013](0013-a-roles-evidence-is-a-reference.md) | A roles' evidence is a reference: its noise beside it, made by `roles record`, replayed with no agent; a judgement stands as long as its stored copy does | Accepted — amended by [ADR-0024](0024-a-scenarios-step-calls-an-operation-the-trigger-gives-the-request.md) |
| [0014](0014-extract-runs-the-roles.md) | `extract` runs the three roles, in five phases named for what they produce — target, interfaces, reading, evidence, judgement — each doing only what is left of it | Accepted |
| [0015](0015-the-tool-is-named-exspec.md) | The tool is named `exspec`, an extraction is `<dir>/exspec/`; the records written before keep the old name, `specimen` | Accepted — the mark superseded by ADR-0017 |
| [0016](0016-a-role-says-what-failed-it-a-step-how-many-it-runs.md) | A role says what failed it (`role-failed`), not `command-failed`; a roles' step says how many interfaces it was given (`roles-queued`) | Accepted |
| [0017](0017-the-mark-is-a-cloche-over-ex.md) | The mark is the word with a cloche over `ex` — a bracket laid down, in the accent colour — and `spec` outside it; animated, a beam sweeps under the cloche | Accepted |
| [0018](0018-what-a-target-sends-to-a-provider-is-compared.md) | What a target sends to a provider is compared: a side effect at an observable at its boundary, held by an exchange (`side-effects`); what the provider answers is kept, not compared | Accepted |
| [0019](0019-a-service-is-of-the-specification-a-provider-renders-it.md) | What survives the target being rewritten is of the specification: a service is, with its conditions; a provider, on the target's side, renders it; a scenario gives a service a condition and never names a provider | Accepted — amended by [ADR-0024](0024-a-scenarios-step-calls-an-operation-the-trigger-gives-the-request.md) |
| [0020](0020-a-provider-is-read-from-its-consumer-its-twin-written-from-that.md) | A provider and the service it renders are read from the consumer (`services/<service>.yaml`, `providers/<provider>/`), and the provider's twin written from that reading; the twin is what satisfies a condition (`given`); a response may describe its `headers` | Accepted |
| [0021](0021-a-recording-proxy-stands-in-front-of-a-targets-providers.md) | A recording proxy of exspec's stands in front of a target's providers for the time of a command that plays (`proxy`, `observables`); it records and passes on, and forces nothing | Accepted |
| [0022](0022-what-is-sent-as-a-form-what-is-kept-of-a-redirection-and-of-a-file.md) | A request may be sent as a form (`form`); a redirection is the target's answer, not followed; a file and a text too long to read are kept as `{bytes, sha256}` | Accepted |
| [0023](0023-a-refusal-is-named-in-the-rule-its-wire-is-the-triggers.md) | A rule names its refusal and says nothing of how it leaves; a reading writes a trigger beside the rules (`answers.status`, `refuses`, `protocol`); a rule about the wire alone is the target's, in `roles/protocol.yaml` | Accepted — its last decision superseded by [ADR-0024](0024-a-scenarios-step-calls-an-operation-the-trigger-gives-the-request.md) |
| [0024](0024-a-scenarios-step-calls-an-operation-the-trigger-gives-the-request.md) | A scenario's step calls an operation by its inputs' names (`call`); the trigger gives the request, `sends` and `shows` written only for an exception; a hole of a call reads the structure it answers; a request step stays for what no call says, and one a call says is a finding | Accepted |
| [0025](0025-a-state-is-named-what-is-seen-in-it-a-scenario-starts-from-it.md) | A state is of the specification, named by what is seen in it (`states.yaml`); it is reached when its sentence is judged to hold on its path, a scenario; a scenario starts from it (`state`), its evidence keeping the path's steps | Accepted |
| [0026](0026-the-states-are-gathered-by-a-role-and-reviewed-after-the-fact.md) | A role gathers the states once every interface is read, from `exspec/` alone; the user reviews after the fact and no role rewrites the file; the operations a path names go first, as far as their judgement; a state not reached yet is a gap (`state-not-reached`) | Accepted |
