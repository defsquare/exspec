# feat/distribution

## Frame

**Goal.** The executable of `bun run build` can be handed to someone who has no checkout
of exspec: it says its version and its usage, `extract` has run whole from it, it is built
for the four platforms Bun compiles to, and the README says first what one installs and
types.

**Non-goals.** Where the executables are published — a remote, a release workflow, an
install script, a licence: the user decides them after this branch. A command removed or
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

## Backlog

- **`extract` whole from the executable.** Every step has run from it, the roles for one
  interface. Left: `extract <dir>` with no `--phase` on the eighteen other interfaces, which
  is also the first run of `--jobs` from the executable.
- **A `claude` older than the one the SDK pins.** `--version` shows the one found; nothing
  refuses or warns when it is older. No failure seen: the one found here is newer.
- **`darwin-x64` and `linux-x64` are built, not started.**
