import type { Callable } from "../derive/callables.ts";
import { serviceFileOf, servicesIn } from "../derive/check-service.ts";
import { isAsWritten } from "../derive/evidence.ts";
import { operationsTold } from "../derive/operations-told.ts";
import {
  builtOf,
  callablesOf,
  evidenceAt,
  folderOf,
  pathsOf,
  slugsIn,
  statesOf,
  textAt,
  unownedScenarios,
} from "../derive/roles-files.ts";
import { type InterfaceLeft, interfaceLeft, leftOf } from "../derive/roles-left.ts";
import { stepsFromStates } from "../derive/steps-from-states.ts";
import { startTarget, stopTarget } from "../run/lifecycle.ts";
import { oneAtATime, type PlayedSteps, playSteps } from "../run/play-steps.ts";
import type { Event } from "../shapes/event.ts";
import type { SourceFile } from "../shapes/extraction.ts";
import {
  type Evidence,
  type PlayableScenario,
  readYaml,
  roleScenarioSchema,
  type Step,
} from "../shapes/roles.ts";
import type { Credentials, Interface } from "../shapes/target.ts";
import { readsOf, under, writesOf } from "./access.ts";
import { inParallel } from "./pool.ts";
import {
  type RolesRun,
  type RolesSetting,
  roleJob,
  roleRounds,
  roleSkipped,
  rolesCommand,
} from "./roles.ts";

const tools = ["Read", "Glob", "Grep", "Write", "Edit"];

const rounds = 3;

type Building = {
  readonly rolesRun: RolesRun;
  readonly credentials: Credentials;
  // a reset and its steps, one play at a time on the one target
  readonly play: (steps: readonly Step[]) => Promise<PlayedSteps>;
};

const hasEvidenceAsWritten = (
  files: readonly SourceFile[],
  name: string,
  { slug, scenario }: { readonly slug: string; readonly scenario: PlayableScenario },
  callables: readonly Callable[],
) => {
  const evidence = evidenceAt(files, name, slug);
  return evidence !== undefined && isAsWritten(scenario, evidence, callables);
};

// A scenario file no rule can own is removed: the builder cannot. Its evidence follows in
// the gate. The slugs removed.
async function removeUnownedScenarios(
  { dir, readFiles, removeFile }: RolesRun,
  name: string,
): Promise<readonly string[]> {
  const unowned = unownedScenarios(await readFiles(dir), name);
  for (const slug of unowned) {
    await removeFile(dir, `${folderOf(name)}/scenarios/${slug}.yaml`);
  }
  return unowned;
}

// Each scenario without its evidence as written played, its evidence written by the tool;
// an evidence whose scenario is gone, removed. A step that could not be played is a finding.
async function* buildGate(
  { rolesRun, credentials, play }: Building,
  bound: Interface,
): AsyncGenerator<Event, readonly string[]> {
  const { dir, readFiles, writeFile, removeFile } = rolesRun;
  const name = bound.interface;
  const folder = folderOf(name);
  // a file the session has just written under a name no rule can own is removed too: left
  // there it could never pass, whatever the builder wrote in it. The builder is told, with
  // what the check then finds.
  const removed = await removeUnownedScenarios(rolesRun, name);
  const files = await readFiles(dir);
  const callables = callablesOf(files);
  const built = builtOf(files, bound, { actors: Object.keys(credentials), callables });
  if (built === undefined) return ["rules.yaml or hints.yaml no longer pass their check"];
  if (built.findings.length > 0) {
    return [
      ...removed.map(
        (slug) =>
          `scenarios/${slug}.yaml: its name starts with no rule of rules.yaml — removed`,
      ),
      ...built.findings,
    ];
  }
  const findings: string[] = [];
  const toPlay = built.scenarios.filter(
    (one) => !hasEvidenceAsWritten(files, name, one, callables),
  );
  for (const { slug, scenario } of toPlay) {
    const { run, exchanges, notTaken } = await play(scenario.steps);
    const evidence: Evidence = { rule: scenario.rule, run, exchanges };
    for (const why of notTaken) findings.push(`scenarios/${slug}.yaml: ${why}`);
    await writeFile(
      dir,
      `${folder}/evidence/${slug}.yaml`,
      Bun.YAML.stringify(evidence, null, 2),
    );
    yield { type: "steps-played", interface: name, scenario: slug, evidence };
    for (const exchange of exchanges) {
      if ("unplayable" in exchange) {
        findings.push(
          `scenarios/${slug}.yaml: a ${exchange.when} step cannot be played: ${exchange.unplayable}`,
        );
      }
    }
  }
  const kept = new Set(built.scenarios.map(({ slug }) => slug));
  for (const { slug } of slugsIn(files, `${folder}/evidence`)) {
    if (!kept.has(slug)) await removeFile(dir, `${folder}/evidence/${slug}.yaml`);
  }
  return findings;
}

// why a builder has nothing to do, undefined when it has: an interface asked for is built,
// done or not, once its reading passes
function builderSkip(left: InterfaceLeft, only: string | undefined): string | undefined {
  switch (left.reading) {
    case "to-do":
      return "its rules and hints do not pass their check";
    case "done":
      return only === undefined &&
        left.build.findings.length === 0 &&
        left.build.scenarios.length === 0
        ? "every scenario passes and has its evidence as written"
        : undefined;
    default: {
      const unreachable: never = left;
      return unreachable;
    }
  }
}

// The builder's task. A service an operation rests on is told by its file; nothing of the
// providers that render it.
export function builderPrompt({
  bound: { interface: name, method, pattern },
  actors,
  files,
}: {
  readonly bound: Interface;
  readonly actors: readonly string[];
  readonly files: readonly SourceFile[];
}): string {
  const folder = folderOf(name);
  const told = operationsTold(callablesOf(files));
  // what every builder of a target is told comes first, word for word the same: a prefix
  // the provider of the model may serve again from one builder to the next
  return [
    `The actors: ${actors.length === 0 ? "none" : actors.join(", ")}; null for a call by nobody.`,
    ...servicesIn(files).map(
      ({ service, says }) =>
        `A service: ${service} — ${says}. Its conditions: exspec/${serviceFileOf(service)}.`,
    ),
    ...(told.length === 0
      ? []
      : [
          "The operations a step may call, by their inputs, and what each answers:",
          ...told,
        ]),
    `The operation: ${name}, ${method.toUpperCase()} ${pattern}.`,
    `Your folder: exspec/${folder}/ — rules.yaml, hints.yaml and trigger.yaml are there; write each scenario as scenarios/<slug>.yaml there.`,
  ].join("\n");
}

// services/<name>.yaml, never a provider's file
const serviceReading = (path: string) => /^services\/[^/]+\.yaml$/.test(path);

async function* builder(
  building: Building,
  bound: Interface,
): AsyncGenerator<Event, boolean> {
  const { rolesRun, credentials, play } = building;
  const { dir, only, readFiles } = rolesRun;
  const { interface: name } = bound;
  const files = await readFiles(dir);
  const skip = builderSkip(interfaceLeft(files, bound), only);
  if (skip !== undefined) return yield* roleSkipped("builder", name, skip);
  await removeUnownedScenarios(rolesRun, name);
  const actors = Object.keys(credentials);
  const folder = folderOf(name);
  const pathsOfStates = statesOf(files).states.map(
    ({ path }) =>
      `${folderOf(path.split("/")[0] ?? "")}/scenarios/${path.split("/")[1]}.yaml`,
  );
  const own = (path: string) =>
    [
      "interfaces.yaml",
      "states.yaml",
      ...pathsOfStates,
      "roles/common.yaml",
      "roles/protocol.yaml",
      `${folder}/rules.yaml`,
      `${folder}/hints.yaml`,
      `${folder}/trigger.yaml`,
    ].includes(path) ||
    under(`${folder}/scenarios`)(path) ||
    serviceReading(path);
  const writable = (path: string) =>
    /^[^/]+\.yaml$/.test(path.slice(`${folder}/scenarios/`.length)) &&
    path.startsWith(`${folder}/scenarios/`);
  return yield* roleJob("builder", name, () =>
    roleRounds({
      rolesRun,
      role: "builder",
      name,
      rounds,
      session: {
        prompt: builderPrompt({ bound, actors, files }),
        tools,
        mayRead: readsOf(dir, { checkout: false, allowed: own }),
        mayWrite: writesOf(dir, writable),
        confinement: `This session reads only exspec/interfaces.yaml, exspec/roles/common.yaml, exspec/roles/protocol.yaml, in exspec/${folder}/, rules.yaml, hints.yaml, trigger.yaml and scenarios/, exspec/states.yaml and the scenario file each state of it names, and exspec/services/; it writes only scenarios/<slug>.yaml in its folder. The system is reached through play alone.`,
        // a state step replaced by its path's steps; one that cannot be: nothing is played
        play: async (steps) => {
          const { paths, unreached } = pathsOf(await readFiles(dir));
          const replaced = stepsFromStates(steps, paths, unreached);
          return "findings" in replaced
            ? replaced.findings.join("\n")
            : JSON.stringify((await play(replaced.steps)).exchanges, null, 2);
        },
      },
      gate: () => buildGate(building, bound),
    }),
  );
}

// The target started once, when a builder has something to do; then one builder per
// interface whose reading passes, `jobs` at a time, their plays one at a time; the target
// stopped at the end, also on a failure.
export async function* runBuilders(
  rolesRun: RolesRun,
  { target, interfaces }: RolesSetting,
): AsyncGenerator<Event, boolean> {
  const { dir, io, jobs, only, readFiles } = rolesRun;
  yield { type: "roles-queued", role: "builder", count: interfaces.length };
  const skipped = leftOf({
    files: await readFiles(dir),
    interfaces,
  }).interfaces.flatMap((left) => {
    const why = builderSkip(left, only);
    return why === undefined ? [] : [{ name: left.interface, why }];
  });
  if (skipped.length === interfaces.length) {
    for (const { name, why } of skipped) yield* roleSkipped("builder", name, why);
    return true;
  }
  const lifecycle = { dir, target, io };
  try {
    yield* startTarget(lifecycle);
    const credentials = await io.readCredentials(dir, target);
    const lock = oneAtATime();
    // a builder writes scenarios, never a reading: the operations it may call stay as read
    const callables = callablesOf(await readFiles(dir));
    const building: Building = {
      rolesRun,
      credentials,
      play: (steps) =>
        lock(() => playSteps({ dir, target, io, credentials, callables, steps })),
    };
    const done = yield* inParallel(
      interfaces.map((bound) => () => builder(building, bound)),
      jobs,
    );
    return done.every(Boolean);
  } finally {
    yield* stopTarget(lifecycle);
  }
}

export function rolesBuild(rolesRun: RolesRun): AsyncGenerator<Event> {
  return rolesCommand("roles-build", rolesRun, (setting) =>
    runBuilders(rolesRun, setting),
  );
}

// On a target already up: one written scenario played after a reset, its exchanges shown.
// Nothing is written.
export function rolesPlay(rolesRun: RolesRun, scenario: string): AsyncGenerator<Event> {
  const { dir, io, readFiles } = rolesRun;
  const [name = "", slug = ""] = scenario.split("/");
  return rolesCommand(
    "roles-play",
    { ...rolesRun, only: name },
    async function* ({ target }) {
      const file = `${folderOf(name)}/scenarios/${slug}.yaml`;
      const files = await readFiles(dir);
      const text = textAt(files, file);
      const read =
        text === undefined
          ? { findings: [`no scenario at exspec/${file}`] }
          : readYaml(file, text, roleScenarioSchema);
      if (!("value" in read)) {
        for (const message of read.findings) yield { type: "command-failed", message };
        return false;
      }
      const { paths, unreached } = pathsOf(files);
      const replaced = stepsFromStates(read.value.steps, paths, unreached);
      if ("findings" in replaced) {
        for (const finding of replaced.findings) {
          yield { type: "command-failed", message: `${file}: ${finding}` };
        }
        return false;
      }
      const credentials = await io.readCredentials(dir, target);
      const { rule } = read.value;
      const { run, exchanges, notTaken } = await playSteps({
        dir,
        target,
        io,
        credentials,
        callables: callablesOf(files),
        steps: replaced.steps,
      });
      for (const message of notTaken) {
        yield { type: "problem", file, at: "steps", message };
      }
      yield {
        type: "steps-played",
        interface: name,
        scenario: slug,
        evidence: { rule, run, exchanges },
      };
      return true;
    },
  );
}
