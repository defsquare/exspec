import type { SourceFile } from "../shapes/extraction.ts";
import type { Interface } from "../shapes/target.ts";
import type { Callable } from "./callables.ts";
import { checkBuilt } from "./check-built.ts";
import { servicesIn } from "./check-service.ts";
import {
  actorsNamed,
  callablesOf,
  folderOf,
  readerFilesOf,
  slugsIn,
} from "./roles-files.ts";
import { pathsOf, statesOf, statesWithPathIn } from "./states-files.ts";

// what the builder wrote for one interface, checked against the actors given, or those its
// scenarios name; undefined when its reading does not pass. callables: those of the files,
// given when they are already computed
export function builtOf(
  files: readonly SourceFile[],
  bound: Interface,
  {
    actors,
    callables = callablesOf(files),
  }: {
    readonly actors?: readonly string[] | undefined;
    readonly callables?: readonly Callable[];
  } = {},
) {
  const { rules, trigger } = readerFilesOf(files, bound.interface);
  if (rules === undefined || trigger === undefined) return undefined;
  const written = slugsIn(files, `${folderOf(bound.interface)}/scenarios`);
  const { states } = statesOf(files);
  const { paths, unreached } = pathsOf(files, states);
  return checkBuilt({
    bound,
    rules,
    protocol: trigger.protocol ?? [],
    actors: actors ?? actorsNamed(written),
    services: servicesIn(files),
    callables,
    paths,
    unreached,
    states: statesWithPathIn(states, bound.interface),
    files: written,
  });
}
