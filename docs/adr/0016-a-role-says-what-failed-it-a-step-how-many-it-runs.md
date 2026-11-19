# ADR-0016 — A role says what failed it, and a roles' step how many interfaces it was given

Status: Accepted (2026-11-19) — by the user, the challenger's review of the design taken.
Adds to ADR-0002 (events as data) and to ADR-0014 (the phases of the roles).

## Context

A phase of the roles runs one session per interface, several at once, their events
interleaved (ADR-0010, ADR-0014). The readers of the stream — the lines of a terminal,
`--format json`, the flow drawn by `extract` — could not say two things.

**Which session failed, and of what.** A session that ended in error, or a role's job that
raised, was told by `command-failed {message}`: no role, no interface. The event's meaning
is "what ended a command before its end", and here the command had not ended: the other
sessions went on. Tying the message to the `role-finished {ok: false}` that follows it does
not hold either: between two events of one job the pool passes on the events of the others.

**How far a phase is.** The pool starts a job when another ends. Each interface ends up
telling one `role-started` or one `role-skipped`, so the number of sessions of a step is in
the stream only once the step is over: "12 read", never "12 of 56".

## Decision

- **`role-failed {role, interface?, message}`** — what ended a role's job with no gate to
  say it: its session ended in error, or the job raised. It is told by the job itself, so
  it comes before that job's `role-finished {ok: false}` and belongs to it. A role whose
  gate still fails after its rounds tells no `role-failed`: its `gate-checked` says why.

  ```
  role-started   {role: reader, interface: f}
  role-failed    {role: reader, interface: f, message: "the agent's session ended in error (error_max_turns)"}
  role-finished  {role: reader, interface: f, ok: false}
  ```

- **`command-failed` is no longer told from inside a role's job.** It keeps its meaning:
  the command, or the phase of `extract`, stops there.

- **A session that ends in error is raised**, by the rounds of a session, as an error that
  carries how the agent's SDK says it ended — nothing when the SDK files the end under
  "success". Whoever runs the rounds says it in its own terms: a role's job as
  `role-failed`, a phase of `extract` as `command-failed`, as before.

- **`roles-queued {role, count}`** — told once by a step of the roles before it runs its
  sessions: `count` is the number of interfaces it was given, those that will tell
  `role-skipped` included. The readers of the structures and of what is common run before
  it and are not in it. It is a fact when it is told, the length of a list, not a forecast.

  ```
  roles-queued   {role: reader, count: 3}
  role-skipped   {role: reader, interface: f, why: w}
  role-started   {role: reader, interface: g}
  …                                                      2 of 3 once g is finished
  ```

## Alternatives

- **A key `why` on `role-finished`.** `role-skipped` has one. But the key would mean
  something only when `ok` is false, and a failed gate already has its event: a variant of
  its own is the pendant of `gate-checked` for an end with no gate.
- **`role` and `interface` added to `command-failed`.** It would still say a command failed
  when it has not.
- **The size from `extraction-counted`,** told by `extract` when a phase of the roles
  starts: no event added. It serves `extract` alone — a command of `roles` reads two files
  of the extraction and would count the rest as zero — and ignores `--only`.
- **The size as a key of `phase-started`.** The commands of `roles` have no phase.
- **The drawing reads `interfaces.yaml`.** A reader of the stream reads the stream.
- **One event per interface queued.** Fifty events for one number.
- **A callback given to the rounds** to label a session's error, as they are given one for
  a gate. A third callback for what is not an expected outcome: a session of the agent
  that ends in error is an error.

## Consequences

- A reader of `--format json` that looked for `command-failed` to know that a role failed
  finds `role-failed`; a command whose roles failed still ends with
  `command-finished {ok: false}`.
- What a role raises outside its job — an evidence file that does not parse, read before
  the judge starts — still ends the whole command, and is told by `command-failed`.
- The count is derivable from the files, and is told all the same, as `extraction-counted`
  and `roles-counted` are: an event is said, not stored.
- The flow of `extract` puts a failure beside its session and says "15 of 56"; nothing of
  the flow is in the stream — it stays a fold of it.
