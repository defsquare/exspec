import { isAsWritten } from "../derive/evidence.ts";
import { builtOf, evidenceAt, folderOf, slugsIn, textAt } from "../derive/roles-files.ts";
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

// Each scenario without its evidence as written played, its evidence written by the tool;
// an evidence whose scenario is gone, removed. A step that could not be played is a finding.
async function* buildGate(
  { rolesRun, credentials, play }: Building,
  bound: Interface,
): AsyncGenerator<Event, readonly string[]> {
  const { dir, readFiles, writeFile, removeFile } = rolesRun;
  const name = bound.interface;
  const folder = folderOf(name);
  const files = await readFiles(dir);
  const built = builtOf(files, bound, Object.keys(credentials));
  if (built === undefined) return ["rules.yaml or hints.yaml no longer pass their check"];
  if (built.findings.length > 0) return built.findings;
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

async function* builder(
  building: Building,
  bound: Interface,
): AsyncGenerator<Event, boolean> {
  const { rolesRun, credentials, play } = building;
  const { dir, only, readFiles } = rolesRun;
  const { interface: name, method, pattern } = bound;
  const files = await readFiles(dir);
  const actors = Object.keys(credentials);
  const built = builtOf(files, bound, actors);
  const folder = folderOf(name);
  if (built === undefined) {
    return yield* roleSkipped(
      "builder",
      name,
      "its rules and hints do not pass their check",
    );
  }
  if (
    only === undefined &&
    built.findings.length === 0 &&
    built.scenarios.every((one) => hasEvidenceAsWritten(files, name, one))
  ) {
    return yield* roleSkipped(
      "builder",
      name,
      "every scenario passes and has its evidence as written",
    );
  }
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
          `Your folder: specimen/${folder}/ — rules.yaml and hints.yaml are there; write each scenario as scenarios/<slug>.yaml there.`,
          `The actors: ${actors.length === 0 ? "none" : actors.join(", ")}; null for a call by nobody.`,
        ].join("\n"),
        tools,
        mayRead: readsOf(dir, { checkout: false, allowed: own }),
        mayWrite: writesOf(dir, writable),
        confinement: `This session reads only specimen/interfaces.yaml, specimen/roles/common.yaml and, in specimen/${folder}/, rules.yaml, hints.yaml and scenarios/; it writes only scenarios/<slug>.yaml there. The system is reached through play alone.`,
        play: async (steps) => JSON.stringify((await play(steps)).exchanges, null, 2),
      },
      gate: () => buildGate(building, bound),
    }),
  );
}

// The target started once; then one builder per interface whose reading passes, `jobs` at
// a time, their plays one at a time; the target stopped at the end, also on a failure.
export function rolesBuild(rolesRun: RolesRun): AsyncGenerator<Event> {
  const { dir, io, jobs } = rolesRun;
  return rolesCommand("roles-build", rolesRun, async function* ({ target, interfaces }) {
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
  });
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
          ? { findings: [`no scenario at specimen/${file}`] }
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
