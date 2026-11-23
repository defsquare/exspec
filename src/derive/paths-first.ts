import type { SourceFile } from "../shapes/extraction.ts";
import type { Interface } from "../shapes/target.ts";
import { partsOfPath } from "./check-states.ts";
import { statesOf } from "./roles-files.ts";
import { pathsOf } from "./states-files.ts";

// The interfaces that go first in the proof: those a path of a state not reached names,
// built, recorded and judged before every interface is, so that the others start from it.
//   states [{state: s, path: f/answers}] not reached, interfaces [f, g, h]  -> [f]
//   s reached                                                                -> []
export function pathsFirst(
  files: readonly SourceFile[],
  interfaces: readonly Interface[],
): readonly Interface[] {
  const { states } = statesOf(files);
  const unreached = new Set(pathsOf(files, states).unreached.map(({ state }) => state));
  const named = new Set(
    states
      .filter(({ state }) => unreached.has(state))
      .map(({ path }) => partsOfPath(path).operation),
  );
  return interfaces.filter(({ interface: name }) => named.has(name));
}
