import { expect, test } from "bun:test";
import type { Drive } from "../../src/agent/drive.ts";
import { sessionRounds } from "../../src/agent/rounds.ts";
import type { Event } from "../../src/shapes/event.ts";

test("a round that resumes a session costs what was spent since the round before", async () => {
  const said = [0.25, 0.5, 1];
  const drive: Drive = async function* () {
    yield { type: "agent-ended", turns: 1, seconds: 1, cost: said.shift() ?? 0 };
    return { session: "s", ok: true };
  };
  const ended: Event = {
    type: "agent-ended",
    role: "reader",
    interface: "f",
    turns: 1,
    seconds: 1,
  };
  const checked = (findings: readonly string[]): Event => ({
    type: "gate-checked",
    role: "reader",
    interface: "f",
    ok: findings.length === 0,
    findings: [...findings],
  });
  const gates = [["a"], ["b"], []];
  const events = await Array.fromAsync(
    sessionRounds({
      drive,
      session: {
        prompt: "p",
        system: "",
        cwd: ".",
        model: "m",
        tools: [],
        mayRead: () => true,
        mayWrite: () => true,
        confinement: "",
      },
      rounds: 2,
      failedGate: "again",
      label: (event): Event => ({ ...event, role: "reader", interface: "f" }),
      checked,
      gate: async () => gates.shift() ?? [],
    }),
  );
  expect(events).toEqual([
    { ...ended, cost: 0.25 },
    checked(["a"]),
    { ...ended, cost: 0.25 },
    checked(["b"]),
    { ...ended, cost: 0.5 },
    checked([]),
  ]);
});
