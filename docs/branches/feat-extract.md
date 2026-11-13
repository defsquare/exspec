# feat/extract

## Frame

**Goal.** `specimen extract <dir>`: an agent driven through four phases — target,
interfaces, specification and bindings, scenarios — each closed by a gate the CLI runs,
then the references recorded (ADR-0006). `specimen status <dir>` shows the phases. Run for
real on Conduit and on Petclinic.

**Non-goals.** `assert`, the readings and the verdicts (the next branch); a declared place
for what the agent could not reach; any observable.

## Journal

- `specimen extract` — the phases derived from the files and shown by `status`, the
  agent's instructions (their examples parsed by a test), one session through the Claude
  Agent SDK (its own system prompt, six tools, no setting of the machine, file writes
  confined to `specimen/` and refused under `references/`), the loop of phases and gates.
  Reviewer: conformant; its Important — the agent's shell can write anywhere — is the
  limit ADR-0006 states (a guard against a mistake, not a sandbox). Fixed after review and
  after the first run: the guard compared `references` by case; an input with a default
  had to be given; the instructions did not say when references are recorded. Minor, left
  for the pre-merge review: the gate of the target catches any error, a bug of specimen's
  included, and hands it to the agent as a finding; the compiled binary does not build
  (an optional dependency of Ink) and the command line given to the agent is not quoted;
  the instructions' examples parse one by one but do not make one consistent extraction;
  in the scenarios phase a failing `stop` can hide the session's error.
- **Conduit, live** (`specimen-targets/conduit`, a clean clone at d8f34f0, model sonnet).
  Every gate passed on the first session of its phase.

  | phase | turns | time | cost |
  |---|---|---|---|
  | target | 13 | 292 s | $0.21 |
  | interfaces | 8 | 27 s | $0.14 |
  | specification | 9 | 59 s | $0.23 |
  | scenarios | 13 | 83 s | $0.24 |
  | record | — | two fresh stacks, 68 scenarios | — |

  19 interfaces, 4 structures, 10 facts, 16 operations, 64 rules, 5 projections, 16
  triggers, 68 scenarios, 68 references; no rule left without a scenario. What the agent
  reported and did not bend: an unknown article, user or comment, and a caller who is not
  the author, answer 401 where the code raises 404 and 403 (declared as the code says);
  creating an article with no tag list throws inside the target. What the terms could not
  say: six facts of ten have an empty condition (who wrote what, is this value already
  taken, do these credentials match), every effect is a sentence.
- **Petclinic, live** (`specimen-targets/petclinic`, a clean clone at afc8fc1, model
  sonnet). Every gate passed on the first session of its phase.

  | phase | turns | time | cost |
  |---|---|---|---|
  | target | 22 | 214 s | $0.28 |
  | interfaces | 6 | 26 s | $0.11 |
  | specification | 19 | 130 s | $0.51 |
  | scenarios | 21 | 222 s | $0.36 |
  | record | — | two fresh stacks, 192 scenarios | — |

  36 interfaces, 8 structures, 11 facts, 24 operations, 165 rules, 12 projections, 24
  triggers, 192 scenarios, 192 references; no rule left without a scenario. The agent
  moved the target to its Postgres profile and turned its security on (three actors by
  basic auth, written by the seed). Reported and not bent: a caller with the wrong role
  answers 500 where 403 is declared (24 operations); the contract says 200 where the code
  answers 201 on a create and 204 on an update or a delete; a telephone must be exactly
  ten digits where the contract allows twenty; `update-pet-type` is never accepted as
  bound (the body needs the id the trigger sends in the path); deleting an owner who has
  pets fails where the declared effect says they go with it. Seen on the agent's side:
  the gate of the target passed although the agent had not confirmed that a reset gives
  the same identifiers back; it wrote the 192 scenarios with a generator script of its
  own; it left out the scenarios at a bound the target refuses (a twenty-digit telephone)
  instead of keeping them as contradictions; its final messages — the only place these
  contradictions are told — live on the event stream alone.

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
