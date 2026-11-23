# ADR-0028 — The wire is described with the interfaces, not proven; the protocol goes

Status: Accepted (2026-11-23) — by the user, after three homes for the file were weighed
and the challenger read the last ("keep, with five changes", all taken). Supersedes
ADR-0023's decision "a rule about the wire is the target's".

## Context

ADR-0023 took the rules about the wire out of the specification and kept them as rules of
the target, in `protocol.yaml`: written by the common reader, named by each trigger
(`protocol: [p]`), proven as a rule is — a scenario, an evidence, a judgement, on every
operation that names them.

Read on one whole target, 50 operations:

- 332 of 1071 evidences are of the 11 rules of the wire; "every answer says it is not to
  be cached" is proven 45 times. A header is not kept in an evidence (ADR-0020): such a
  rule is `not-shown` at best.
- The sorting "about the wire and nothing else" fails in one session: the key "is known
  and not revoked" is written on both sides, from one file of the code.
- The file is of the target's group and names the specification: `refuses` says how each
  refusal *of `common.yaml`* leaves.
- `interfaces.yaml` already says, interface by interface, the envelope of an answer, the
  form of an error and whether a caller is needed.
- A shared refusal is said again by 21 triggers, in three forms; nothing holds them to
  one.

## Decision

- **No rule of the wire is written, and none is proven.** How something is carried — a
  header, the form of a body, an envelope, caching, the order of two checks — is of the
  interface, whose description says its forms. `protocol.yaml`, the concept `protocol`
  and a trigger's `protocol` list go; a builder builds no scenario and a judge is given
  nothing for them.
- **What the file held goes where it belongs.**

  ```
  rules          not written
  contract       not written
  refuses        common-trigger.yaml     how each refusal of common.yaml leaves
  errors         common-trigger.yaml     how a refusal is answered, by kind
  runs-with      target.yaml             what the start of the target sets
  ```

- **`common-trigger.yaml` is the trigger of the shared rules**, written by the common
  reader with `common.yaml`:

  ```yaml
  refuses:
    r: {status: 401, body: "{error: {code: X}}"}
  errors:
    - {kind: "a field breaks a constraint", status: 400, body: "…", source: "…"}
  ```

  Every refusal a rule of `common.yaml` names has its entry under `refuses`, and no other
  name has one.
- **A shared refusal is said once.** An operation's trigger does not say a refusal of
  `common-trigger.yaml`: an operation that answers it another way has another refusal,
  with another name (ADR-0023).
- **The common reader sorts by what survives the target being rewritten** (ADR-0019): a
  rule that would hold on another framework or another protocol is a shared rule; what
  would not is not written.
- **`target.yaml` takes `runs-with`**, written by the session that writes the start:

  ```yaml
  runs-with:
    - {setting: "security is on", source: "exspec/target/compose.yaml:12"}
  ```

- **An extraction that still has `protocol.yaml` is refused**, by every command: it is
  extracted again. No script: the text a judge is given held the wire's rules and the
  shared refusals, so every judgement of a rewritten extraction would be stale, and its
  triggers name refusals no rule names any more.

## Alternatives

- *A role of its own reading the wire before any rule, the file cut in two*: two sessions
  on one middleware, each taking a rule or neither, and no check sets two sentences
  against each other.
- *The whole file a binding*, the shared trigger keeping the rules of the wire: rules
  that name nothing of the specification, still proven on every operation.
- *`errors` in `interfaces.yaml`*: it is read in the error handler, which the common
  reader reads; the interfaces' file would have two authors.
- *A repeated refusal held to the same status and body*: whether a body left out is equal
  would have to be said.
- *`contract` kept*: read by the agents and the page alone, and a reader reads the
  contract itself.
- *A script that rewrites an extraction*: it would keep the references and no judgement.

## Consequences

- A rule about a header or the form of a body has no verdict any more. An envelope or a
  status that changes still shows at a replay, which compares bodies and statuses
  (ADR-0013).
- `runs-with` is in the text hashed for a judge: the target's session run again, a line
  reworded, stales every judgement.
- Amends ADR-0010 (what the common reader, a reader and a builder read and write),
  ADR-0024 (a trigger's shape) and ADR-0027 (`protocol.yaml` at the root).
- The page of `view` no longer draws the wire on the target's side.
- The migration of ADR-0023, which wrote `protocol.yaml`, is removed with it.
