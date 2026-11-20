# feat/distribution

## Frame

**Goal.** The executable of `bun run build` can be handed to someone who has no checkout
of exspec: it says its version and its usage, `extract` has run whole from it, it is built
for the four platforms Bun compiles to, and the README says first what one installs and
types.

Then, the user having settled them — a public repository, `defsquare/exspec`, under
Apache-2.0: the licence, a workflow that publishes the four executables on a tag, a script
that installs the one of the machine.

**Non-goals.** Creating the repository and pushing: the user said to push nothing for now,
and whether the history is rewritten first is not decided. A command removed or
merged: the README sorts the commands, it does not change them. Carrying `claude` inside
the executable (ADR-0002).

**How it is judged.** `dist/exspec --version` and `--help` answer and exit 0; `extract`
runs to its end from `dist/exspec` on a target, and says which `claude` it found;
`bun run build` leaves four executables; `bun run check` and `bun test` report nothing.

**The merge is the user's.**

## Journal

- `--help` and `--version` answer, exit 0; `--version` from the executable says the
  `claude` it found: `2.1.328`, where the SDK pins `2.1.323`. An unknown option is named,
  then the usage, exit 2.
- `bun run build all` leaves four executables, 67 to 98 MB. Started: `darwin-arm64` here,
  `linux-arm64` in a `debian:stable-slim` container. Not started: `darwin-x64`,
  `linux-x64`. The Linux ones are linked against glibc.
- The README goes: what it is, install and what it requires, the four commands of an
  extraction, the five phases; every command is in `docs/commands.md`, sorted by what one
  is doing. The command after an `extract` is `roles replay`, not `replay` (ADR-0014).
- From `dist/exspec`, on a Conduit with no `exspec/`, `sonnet`, the `claude` of the PATH:

  ```
  extract --phase target       gate ok   16 turns  803 s  0.19 USD
  extract --phase interfaces   gate ok    5 turns  198 s  0.11 USD   19 interfaces
  roles read    --only delete-article-comment   3 gates ok   0.34 USD   structures, common, the interface
  roles build   --only delete-article-comment   gate ok      0.14 USD   10 scenarios
  roles record  --only delete-article-comment   ok                      10 references
  roles judge   --only delete-article-comment   gate ok      0.05 USD   5 holds, 5 contradicted
  roles replay  --only delete-article-comment   ok                      10 replayed, no difference
  ```

  The agent calls the executable by its own path: in the interfaces phase it ran `check .`
  and read "check ok", with no `exspec` on the PATH. The builder's `play` tool, served from
  inside the executable to the `claude` of the PATH, played its ten scenarios.
  The user chose one interface over the whole run. Not seen: the last three phases through
  `extract` itself, and several sessions at once (`--jobs`).

- `LICENSE` (Apache-2.0), `.github/workflows/release.yml`, `install.sh`. The script was
  run against `dist/` as the release (`EXSPEC_RELEASE=file://…`): on darwin-arm64 and in a
  `debian:stable-slim` container it installs and the executable answers; with a checksum
  that does not match it installs nothing and exits 1. The workflow has not run: nothing
  is pushed. It builds on a macOS runner, the one host the four were seen built from.

- The user: exspec stays in alpha for now. The version says it, `0.1.0-alpha.1`, and the
  README before the install line. A release is not marked as a pre-release on GitHub:
  `releases/latest/download`, which the script reads, skips those.

- Rebased on `main` after calls in the evidence. Its twins were served by `bun
  exspec/providers/serve.ts`: a `bun` on the PATH, which a machine that installed the
  executable does not have. They are served by the Bun exspec itself runs on
  (`process.execPath`, `BUN_BE_BUN`). Seen: `BUN_BE_BUN=1 dist/exspec <file>.ts` runs a
  file, here and in a Debian container with no Bun. Not seen: `providers write-twin` from
  the executable. `test/io/twins.test.ts` timed out twice while the machine was loaded
  (load average 42), with and without the change; it passes since.

## Backlog

- **The providers from the executable.** `providers read` and `providers write-twin` have
  not run from it, nor an `extract` on a target that calls providers.

- **Nothing is public yet.** `defsquare/exspec` does not exist; the README's install line
  answers 404 until the repository is there with a first release. Before the push, the
  user decides whether the history is rewritten: the 148 commits carry a personal address
  and the links of the sessions. Then: create the repository, push `main`, tag `v0.1.0-alpha.1`,
  watch the workflow run for the first time, run the install line for real.

- **`extract` whole from the executable.** Every step has run from it, the roles for one
  interface. Left: `extract <dir>` with no `--phase` on the eighteen other interfaces, which
  is also the first run of `--jobs` from the executable.
- **A `claude` older than the one the SDK pins.** `--version` shows the one found; nothing
  refuses or warns when it is older. No failure seen: the one found here is newer.
- **`darwin-x64` and `linux-x64` are built, not started.**
