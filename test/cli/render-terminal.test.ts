import { expect, test } from "bun:test";
import { describeEvent } from "../../src/cli/render-terminal.tsx";
import type { Event } from "../../src/shapes/event.ts";

test("describeEvent words each event", () => {
  const events: readonly Event[] = [
    { type: "command-started", command: "status", dir: "/abs/dir" },
    { type: "extraction-not-found", dir: "/abs/dir", expected: "/abs/dir/specimen" },
    {
      type: "extraction-counted",
      counts: {
        interfaces: 9,
        structures: 3,
        facts: 5,
        operations: 5,
        rules: 20,
        projections: 4,
        triggers: 5,
        scenarios: 4,
      },
    },
    { type: "problem", file: "f.yaml", at: "a.0", message: "m" },
    { type: "problem", file: "f.yaml", at: "", message: "m" },
    { type: "gap", kind: "rule-without-scenario", name: "f/r", message: "m" },
    { type: "command-finished", command: "check", ok: false },
  ];
  expect(events.map(describeEvent)).toEqual([
    "status /abs/dir",
    "no extraction in /abs/dir: /abs/dir/specimen is missing",
    "9 interfaces, 3 structures, 5 facts, 5 operations, 20 rules, 4 projections, 5 triggers, 4 scenarios",
    "problem  f.yaml a.0: m",
    "problem  f.yaml: m",
    "gap      rule-without-scenario f/r",
    "check failed",
  ]);
});
