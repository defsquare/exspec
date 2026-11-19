import type { AgentEvent, Event } from "../shapes/event.ts";
import type { Drive, Session } from "./drive.ts";

export type Rounds = {
  readonly drive: Drive;
  // the first round's session; the next rounds resume it with the gate's findings
  readonly session: Session;
  // the most rounds that follow a failed gate
  readonly rounds: number;
  // the first line of the prompt that sends findings back
  readonly failedGate: string;
  // who the events come from: an agent's event and a gate's, labelled
  readonly label: (event: AgentEvent) => Event;
  readonly checked: (findings: readonly string[]) => Event;
  // the session's last words given: what is still wrong, [] when it passes; a generator
  // when the gate has events of its own to show
  readonly gate: (
    said: string | undefined,
  ) => AsyncGenerator<Event, readonly string[]> | Promise<readonly string[]>;
};

export class SessionEndedInError extends Error {
  readonly type = "session-ended-in-error";
}

// One session, then its gate; a failed gate's findings are the next prompt of the same
// session, `rounds` times at most. false: the gate still fails. A session that ends in
// error is raised: whoever runs the rounds says it.
export async function* sessionRounds({
  drive,
  session,
  rounds,
  failedGate,
  label,
  checked,
  gate,
}: Rounds): AsyncGenerator<Event, boolean> {
  let { prompt } = session;
  let resume: string | undefined;
  for (let round = 0; ; round++) {
    const driven = drive({
      ...session,
      prompt,
      ...(resume === undefined ? {} : { resume }),
    });
    let said: string | undefined;
    let next = await driven.next();
    for (; !next.done; next = await driven.next()) {
      if (next.value.type === "agent-said") said = next.value.text;
      yield label(next.value);
    }
    const ended = next.value;
    if (!ended.ok) {
      const how = ended.how === undefined ? "" : ` (${ended.how})`;
      throw new SessionEndedInError(`the agent's session ended in error${how}`);
    }
    const gated = gate(said);
    const findings = gated instanceof Promise ? await gated : yield* gated;
    yield checked(findings);
    if (findings.length === 0) return true;
    if (round === rounds) return false;
    resume = ended.session;
    prompt = [failedGate, "", ...findings].join("\n");
  }
}
