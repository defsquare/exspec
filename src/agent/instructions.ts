import type { AgentPhase } from "../derive/phases.ts";
import interfaces from "./instructions/phase-interfaces.md" with { type: "text" };
import scenarios from "./instructions/phase-scenarios.md" with { type: "text" };
import specification from "./instructions/phase-specification.md" with { type: "text" };
import target from "./instructions/phase-target.md" with { type: "text" };
import system from "./instructions/system.md" with { type: "text" };

export type Instructions = {
  readonly system: string;
  readonly phases: Readonly<Record<AgentPhase, string>>;
};

// specimen: the command line that runs this CLI, "bun /abs/src/cli/main.ts"
export function instructionsFor(specimen: string): Instructions {
  const fill = (text: string) => text.replaceAll("{{specimen}}", specimen);
  return {
    system: fill(system),
    phases: {
      target: fill(target),
      interfaces: fill(interfaces),
      specification: fill(specification),
      scenarios: fill(scenarios),
    },
  };
}
