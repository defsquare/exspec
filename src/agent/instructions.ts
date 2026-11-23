import type { Role, SessionStep } from "../shapes/event.ts";
import interfaces from "./instructions/phase-interfaces.md" with { type: "text" };
import target from "./instructions/phase-target.md" with { type: "text" };
import builder from "./instructions/role-builder.md" with { type: "text" };
import commonReader from "./instructions/role-common-reader.md" with { type: "text" };
import judge from "./instructions/role-judge.md" with { type: "text" };
import providerReader from "./instructions/role-provider-reader.md" with { type: "text" };
import reader from "./instructions/role-reader.md" with { type: "text" };
import statesReader from "./instructions/role-states-reader.md" with { type: "text" };
import structuresReader from "./instructions/role-structures-reader.md" with {
  type: "text",
};
import twinWriter from "./instructions/role-twin-writer.md" with { type: "text" };
import system from "./instructions/system.md" with { type: "text" };

export type Instructions = {
  readonly system: string;
  readonly steps: Readonly<Record<SessionStep, string>>;
};

// commandLine: "bun '/abs/src/cli/main.ts'" from the sources, "'/abs/exspec'" compiled
export function instructionsFor(commandLine: string): Instructions {
  const fill = (text: string) => text.replaceAll("{{exspec}}", commandLine);
  return {
    system: fill(system),
    steps: {
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
  "states-reader": statesReader,
  builder,
  judge,
  "provider-reader": providerReader,
  "twin-writer": twinWriter,
};
