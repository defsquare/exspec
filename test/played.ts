import type { PlayedScenario, TargetResponse } from "../src/shapes/scenario.ts";

export const run = {
  target: "t",
  version: "v",
  at: "2026-11-13T10:00:00.000Z",
  clock: null,
};

export function played(
  act: TargetResponse,
  arrange: readonly TargetResponse[] = [],
): PlayedScenario {
  return {
    scenario: "s",
    says: "s",
    proves: ["r"],
    run,
    arrange: arrange.map((response) => ({
      call: { operation: "g", with: {} },
      response,
    })),
    act: { call: { operation: "f", with: {} }, response: act },
  };
}
