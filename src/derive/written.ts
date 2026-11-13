import type { Scenario } from "../shapes/scenario.ts";
import { deepEqual } from "./json.ts";

type Written = Pick<Scenario, "scenario" | "says" | "proves" | "arrange" | "act"> & {
  readonly assert?: Scenario["assert"] | undefined;
};

// what a scenario wrote, its answers left out
function writtenPart({ scenario, says, proves, assert = [], arrange, act }: Written) {
  return {
    scenario,
    says,
    proves,
    assert,
    arrange: arrange.map(({ call }) => call),
    act: act.call,
  };
}

// a reference is of its scenario as long as the scenario is still written as it was played
export function writtenAlike(scenario: Written, reference: Written): boolean {
  return deepEqual(writtenPart(scenario), writtenPart(reference));
}
