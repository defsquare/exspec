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

## Backlog

- **`--help` and `--version`.** Both throw from `parseArgs` and print a stack. No version
  exists: none in `package.json`, none given to the build.
- **`extract` whole from the executable, and the `claude` it found.** Taken from "Loose
  ends of `extract`": the agent calling the executable's own path is untried, and nothing
  says which version of `claude` was found on the PATH, older or newer than the one the SDK
  pins. Run `extract` from the executable; show the version found.
- **Four platforms.** `scripts/build.ts` builds for the machine it runs on. Bun compiles
  across: `darwin-arm64`, `darwin-x64`, `linux-x64`, `linux-arm64`.
- **The README says first what one types.** "Build and run" lists twenty command lines
  flat, each as `bun src/cli/main.ts …`. First: what it is, what it requires (`claude`,
  what the target's commands need), the commands of one extraction — `extract`, `status`,
  `view`, `replay`; the whole list goes to `--help` and a page of its own, what a developer
  of exspec runs to a section at the end.
