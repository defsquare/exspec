# feat/extract

## Frame

**Goal.** `specimen extract <dir>`: an agent driven through four phases — target,
interfaces, specification and bindings, scenarios — each closed by a gate the CLI runs,
then the references recorded (ADR-0006). `specimen status <dir>` shows the phases. Run for
real on Conduit and on Petclinic.

**Non-goals.** `assert`, the readings and the verdicts (the next branch); a declared place
for what the agent could not reach; any observable.

## Journal

## Backlog

### The agent writes the scenarios and the specification

- **Seen.** In the spike one agent session wrote Conduit's 167 scenarios in 14 minutes;
  the rules, facts and structures were written by agents from the target's code.
- **Settled.** The agent is driven by the CLI and reports through the event stream; its
  instructions cite nothing of this project.
- **Next.** Frame it once items 2 to 5 exist: what the agent is asked for (a specification
  from the code, then scenarios for the rules no scenario points at), and how a refuted
  claim comes back to it or to a human.
- **Source.** `docs/brief/spike-journal.md` › Journal 2, 9, 14.
