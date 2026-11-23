# The commands

`<dir>` is a checkout of the target; the extraction is `<dir>/exspec/`. Every command but
`view` emits events: drawn on a terminal, one JSON object per line with `--format json`.
A command exits 0 when it succeeded, 1 when it failed, 2 when it was mistyped.

## An extraction

```
exspec extract <dir> [--phase <phase>] [--model <model>] [--jobs n] [--effort <low|medium|high>]
```

What is left of each phase — `target`, `interfaces`, `reading`, `evidence`, `judgement` —
in that order. `--phase` runs one; `--model` is the agent's model (`sonnet` when not
given); `--jobs` is how many sessions run at once (4).

```
exspec status <dir>             # its counts, its phases, what is verified, refuted or only declared, each claim not verified with its reason, the facts that block the most rules
exspec view <dir> > page.html   # one page, from a structure to its operations and their proof: the roles' reading when there is one, else the specification computed from terms
```

## One step, or one interface

What `extract` runs in its last three phases, by hand: for one interface (`--only`), or
again on purpose.

```
exspec roles read <dir> [--only <interface>] [--jobs n]     # the structures, then a reader per interface -> exspec/operations/, common.yaml, common-trigger.yaml
exspec roles build <dir> [--only <interface>] [--jobs n]    # target up, a scenario builder per interface, each scenario played -> scenarios/, evidence/
exspec roles record <dir> [--only <interface>] [--force]    # each scenario played again on fresh stacks: a reference, its noise beside it
exspec roles judge <dir> [--only <interface>] [--jobs n]    # a judge per interface, no tool -> judgements.yaml
exspec roles replay <dir> [--only <interface>]              # each reference played once on a fresh stack, compared outside its noise
exspec roles play <dir> <interface>/<slug>                  # on a target up: reset, play one written scenario
```

`read`, `build` and `judge` take `--model` and `--effort` as `extract` does.

## The providers a target calls

Before `extract`, on a target whose `target.yaml` says its `proxy` and `observables`.

```
exspec providers read <dir> [--only <provider>] [--jobs n]         # a reader per provider the target calls -> exspec/services/<service>.yaml, exspec/providers/<name>/interfaces.yaml, provider.yaml
exspec providers write-twin <dir> [--only <provider>] [--jobs n]   # serve.ts, then a twin writer per provider read -> exspec/providers/<name>/twin.ts, served, its state put back, each condition given
```

`read` and `write-twin` take `--model` and `--effort` as `extract` does.

## The states

```
exspec states rename <dir> <old> <new>   # the name rewritten in states.yaml, in the scenarios that start from it and in its judgement; stales nothing
```

Every file is rewritten in memory first, then written; a refusal writes none.

## The target

```
exspec target up <dir>      # start the target, wait until it is alive, seed it
exspec target down <dir>
```

## A specification computed from terms

These read `operations/`, `facts.yaml`, `bindings.yaml`, `scenarios/` and `references/`,
which `extract` no longer writes.

```
exspec check <dir>
exspec verdicts <dir>                                  # every rule and trigger, judged by the references
exspec record <dir> [<operation>/<slug>…] [--force]    # two fresh stacks -> references
exspec replay <dir> [<operation>/<slug>…]              # one fresh stack, compared with the references
exspec target play <dir> [<operation>/<slug>…]         # on a target up: reset, play once, judge
```
