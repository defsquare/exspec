import { noiseBetween } from "../derive/evidence.ts";
import { folderOf } from "../derive/roles-files.ts";
import { type InterfaceLeft, leftOf } from "../derive/roles-left.ts";
import { startTarget, stopTarget } from "../run/lifecycle.ts";
import type { Event } from "../shapes/event.ts";
import type { Evidence } from "../shapes/roles.ts";
import { type RolesRun, type RolesSetting, rolesCommand } from "./roles.ts";
import { type CheckedScenario, checkedScenariosOf, playOnce } from "./roles-scenarios.ts";

// The noise between a first copy and a second; stable, the first written with its noise.
async function* markAndWriteReference(
  { dir, writeFile }: RolesRun,
  { name, slug, path }: CheckedScenario,
  { first, second }: { readonly first: Evidence; readonly second: Evidence },
): AsyncGenerator<Event, boolean> {
  const marked = noiseBetween(first, second);
  if (!marked.stable) {
    yield { type: "scenario-unstable", path, differences: marked.differences };
    return false;
  }
  const { rule, run, exchanges } = first;
  await writeFile(
    dir,
    `${folderOf(name)}/evidence/${slug}.yaml`,
    Bun.YAML.stringify({ rule, run, exchanges, noise: marked.noise }, null, 2),
  );
  yield { type: "reference-written", path, noise: marked.noise.length };
  return true;
}

// The scenarios left to record, by "<interface>/<slug>": once, an evidence as written with no
// noise; built, a scenario with no evidence of it as written. Any other is a reference.
function waitingOf(left: readonly InterfaceLeft[]) {
  const paths = (
    of: (one: Extract<InterfaceLeft, { reading: "done" }>) => readonly string[],
  ) =>
    new Set(
      left.flatMap((one) =>
        one.reading === "done" && one.build.findings.length === 0
          ? of(one).map((slug) => `${one.interface}/${slug}`)
          : [],
      ),
    );
  return {
    once: paths(({ record }) => record),
    built: paths(({ build }) => build.scenarios),
  };
}

// Stack 1: a reference as written is kept, whatever version it was taken on; an evidence as
// written, of this version, is the first copy and played once more; any other scenario is
// played, to be played again on stack 2. Nothing waiting and not forced: no stack at all.
//   {rule: r, run: {version: v}, exchanges: e}            on v, a second play
//   -> {rule: r, run: {version: v}, exchanges: e, noise: n}
export async function* recordReferences(
  rolesRun: RolesRun,
  { target, interfaces }: RolesSetting,
  force: boolean,
): AsyncGenerator<Event, boolean> {
  const { dir, io, readFiles } = rolesRun;
  const { once, built } = waitingOf(
    leftOf({ files: await readFiles(dir), interfaces }).interfaces,
  );
  if (!force && once.size === 0 && built.size === 0) {
    const { scenarios, passed } = yield* checkedScenariosOf(rolesRun, interfaces);
    for (const { path } of scenarios) yield { type: "reference-kept", path };
    return passed;
  }
  const lifecycle = { dir, target, io };
  let ok = true;
  const remembered: { readonly one: CheckedScenario; readonly first: Evidence }[] = [];
  yield* stopTarget(lifecycle);
  try {
    yield* startTarget(lifecycle);
    const credentials = await io.readCredentials(dir, target);
    const stack = { rolesRun, target, credentials };
    const { scenarios, passed } = yield* checkedScenariosOf(
      rolesRun,
      interfaces,
      Object.keys(credentials),
    );
    ok = passed;
    for (const one of scenarios) {
      const { evidence, path } = one;
      const first =
        force || !once.has(path) || evidence === undefined ? undefined : evidence;
      if (!force && !once.has(path) && !built.has(path)) {
        yield { type: "reference-kept", path };
      } else if (first === undefined || first.run.version !== io.version) {
        remembered.push({ one, first: yield* playOnce(stack, one) });
      } else {
        const second = yield* playOnce(stack, one);
        ok = (yield* markAndWriteReference(rolesRun, one, { first, second })) && ok;
      }
    }
  } finally {
    yield* stopTarget(lifecycle);
  }
  if (remembered.length === 0) return ok;
  try {
    yield* startTarget(lifecycle);
    const credentials = await io.readCredentials(dir, target);
    const stack = { rolesRun, target, credentials };
    for (const { one, first } of remembered) {
      const second = yield* playOnce(stack, one);
      ok = (yield* markAndWriteReference(rolesRun, one, { first, second })) && ok;
    }
  } finally {
    yield* stopTarget(lifecycle);
  }
  return ok;
}

export function rolesRecord(rolesRun: RolesRun, force: boolean): AsyncGenerator<Event> {
  return rolesCommand("roles-record", rolesRun, (setting) =>
    recordReferences(rolesRun, setting, force),
  );
}
