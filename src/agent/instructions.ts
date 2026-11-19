import type { AgentPhase } from "../derive/phases.ts";
import type { Role } from "../shapes/event.ts";
import interfaces from "./instructions/phase-interfaces.md" with { type: "text" };
import target from "./instructions/phase-target.md" with { type: "text" };
import builder from "./instructions/role-builder.md" with { type: "text" };
import commonReader from "./instructions/role-common-reader.md" with { type: "text" };
import judge from "./instructions/role-judge.md" with { type: "text" };
import reader from "./instructions/role-reader.md" with { type: "text" };
import structuresReader from "./instructions/role-structures-reader.md" with {
  type: "text",
};
import system from "./instructions/system.md" with { type: "text" };

export type Instructions = {
  readonly system: string;
  readonly phases: Readonly<Record<AgentPhase, string>>;
};

// commandLine: "bun '/abs/src/cli/main.ts'" from the sources, "'/abs/exspec'" compiled
export function instructionsFor(commandLine: string): Instructions {
  const fill = (text: string) => text.replaceAll("{{exspec}}", commandLine);
  return {
    system: fill(system),
    phases: {
      target: fill(target),
      interfaces: fill(interfaces),
    },
  };
}

// the system prompt of each role; its task comes in the prompt
export const roleInstructions: Readonly<Record<Role, string>> = {
  "structures-reader": structuresReader,
  "common-reader": commonReader,
  reader,
  builder,
  judge,
};
