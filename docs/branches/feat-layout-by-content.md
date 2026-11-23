# feat/layout-by-content

## Frame

**Goal.** A folder of `exspec/` is named for what it holds, not for who wrote it: `roles/`
becomes `operations/`, and the two files that are of no operation — `common.yaml`,
`protocol.yaml` — go to the root. Nothing else changes: the same schemas, roles, checks
and verdicts. Measured on a copy of `trainings` and on the fixtures: an extraction
rewritten by the script shows the same `status`, and nothing left for `extract`.

**Non-goals.** The proof set apart from its operation. What `protocol.yaml` holds and who
reads it (the branch after this one). The phases of `extract` and the providers
(`feat/providers-in-extract`). The older path's files and their deprecation.

The design: ADR-0027 (Accepted).

## Journal

- **Opened** (2026-11-23), out of the design of `feat/providers-in-extract`: the user
  found `roles/` named for who wrote it; under it, files of three groups of the metamodel
  by operation, and two of no operation.
- **The paths challenged** (2026-11-23): "keep, with four corrections". No stored value
  holds a path — a state's `path` is `<op>/<slug>`, a judgement names a slug, the text
  hashed for a judge names none: nothing goes stale. To correct: `readSourceFile` passes
  over `roles/` alone, the new files would each be "not a file of an extraction" for
  `check`, `status` and `target up`; an extraction not rewritten would be read as empty
  and made again without a word — a `roles/` found is a problem that names the script;
  `common.yaml` stays at the root, under `operations/` the older path would read it as an
  operation; `hints.yaml` is a note to the builder, kept with the reading that writes it,
  and the ADR says so. The builder's reads and writes span two trees. The script goes
  under `scripts/migrations/`, as the two before it. Three commits: the paths behind one
  module, still `roles/`, no assertion changed; the layout switched; the ADR and the docs.
  About 15 modules, 4 briefs, 18 test files. Not yet decided by the user.

- **Decided by the user** (2026-11-23), after the verdict: the split is not taken — the
  folder is renamed, the proof stays in it, the two shared files go to the root rather
  than have two names reserved against the computed path's `operations/<name>.yaml`.

## Backlog

- The layout switched: the paths, what `readSourceFile` passes over, an extraction with
  `roles/` refused, the briefs, the script, the fixtures, the docs that name a path.
- `docs/backlog.md`, "Two specifications side by side": its step (1) says the reader's
  rules become `operations/*.yaml` — rewritten to what is left of it.
- `targets/trainings` rewritten by the script, once no extraction runs on it.
