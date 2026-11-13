# feat/command-families

## Frame

Goal: the CLI's commands are told apart by family, in their names, and the family that
records or judges a reference is refused to the agent. Asked by the user while reviewing
ADR-0006, before accepting it. Non-goals: a sandbox for the agent's shell; any change to
the gates.

## Journal

- Challenger, on the design: go with changes — the refused family is named by what it
  touches (the references, and the agent itself), `replay` being there because it tears
  the stack down and judges; the SDK's `env` replaces the environment, so it is spread
  from `process.env`; the `command` of the events keeps its values; the refusal is a pure
  function with a test. All applied.
- Done in the main thread: `src/cli/command-line.ts`, the mark set in `driveAgent`, the
  instructions and the README renamed. Not run against a live agent session.

## Backlog

Nothing left.
