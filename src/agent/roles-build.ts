import { isAsWritten } from "../derive/evidence.ts";
import {
  builtOf,
  evidenceAt,
  folderOf,
  slugsIn,
  textAt,
  unownedScenarios,
} from "../derive/roles-files.ts";
import { type InterfaceLeft, interfaceLeft, leftOf } from "../derive/roles-left.ts";
import { startTarget, stopTarget } from "../run/lifecycle.ts";
import { oneAtATime, type PlayedSteps, playSteps } from "../run/play-steps.ts";
import type { Event } from "../shapes/event.ts";
import type { SourceFile } from "../shapes/extraction.ts";
import {
  type Evidence,
  type RoleScenario,
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
  { slug, scenario }: { readonly slug: string; readonly scenario: RoleScenario },
) => {
  const evidence = evidenceAt(files, name, slug);
  return evidence !== undefined && isAsWritten(scenario, evidence);
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
  const built = builtOf(files, bound, Object.keys(credentials));
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
  const toPlay = built.scenarios.filter((one) => !hasEvidenceAsWritten(files, name, one));
  for (const { slug, scenario } of toPlay) {
    const { run, exchanges } = await play(scenario.steps);
    const evidence: Evidence = { rule: scenario.rule, run, exchanges };
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

async function* builder(
  building: Building,
  bound: Interface,
): AsyncGenerator<Event, boolean> {
  const { rolesRun, credentials, play } = building;
  const { dir, only, readFiles } = rolesRun;
  const { interface: name, method, pattern } = bound;
  const skip = builderSkip(interfaceLeft(await readFiles(dir), bound), only);
  if (skip !== undefined) return yield* roleSkipped("builder", name, skip);
  await removeUnownedScenarios(rolesRun, name);
  const actors = Object.keys(credentials);
  const folder = folderOf(name);
  const own = (path: string) =>
    [
      "interfaces.yaml",
      "roles/common.yaml",
      `${folder}/rules.yaml`,
      `${folder}/hints.yaml`,
    ].includes(path) || under(`${folder}/scenarios`)(path);
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
        prompt: [
          `The operation: ${name}, ${method.toUpperCase()} ${pattern}.`,
          `Your folder: exspec/${folder}/ — rules.yaml and hints.yaml are there; write each scenario as scenarios/<slug>.yaml there.`,
          `The actors: ${actors.length === 0 ? "none" : actors.join(", ")}; null for a call by nobody.`,
        ].join("\n"),
        tools,
        mayRead: readsOf(dir, { checkout: false, allowed: own }),
        mayWrite: writesOf(dir, writable),
        confinement: `This session reads only exspec/interfaces.yaml, exspec/roles/common.yaml and, in exspec/${folder}/, rules.yaml, hints.yaml and scenarios/; it writes only scenarios/<slug>.yaml there. The system is reached through play alone.`,
        play: async (steps) => JSON.stringify((await play(steps)).exchanges, null, 2),
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
    const building: Building = {
      rolesRun,
      credentials,
      play: (steps) => lock(() => playSteps({ dir, target, io, credentials, steps })),
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
      const text = textAt(await readFiles(dir), file);
      const read =
        text === undefined
          ? { findings: [`no scenario at exspec/${file}`] }
          : readYaml(file, text, roleScenarioSchema);
      if (!("value" in read)) {
        for (const message of read.findings) yield { type: "command-failed", message };
        return false;
      }
      const credentials = await io.readCredentials(dir, target);
      const { steps, rule } = read.value;
      const { run, exchanges } = await playSteps({ dir, target, io, credentials, steps });
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
