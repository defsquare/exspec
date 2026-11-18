import { playSteps } from "../run/play-steps.ts";
import type { Event } from "../shapes/event.ts";
import type { Evidence, RoleScenario } from "../shapes/roles.ts";
import type { Credentials, Interface, Target } from "../shapes/target.ts";
import { evidenceAt, type RolesRun } from "./roles.ts";
import { builtOf } from "./roles-build.ts";

export type CheckedScenario = {
  readonly name: string;
  readonly slug: string;
  // "<interface>/<slug>"
  readonly path: string;
  readonly scenario: RoleScenario;
  readonly evidence: Evidence | undefined;
};

// The scenarios of the interfaces whose rules and scenarios pass the builder's check, by
// interface then slug; an interface that does not pass is told by its failed check.
export async function* checkedScenariosOf(
  rolesRun: RolesRun,
  interfaces: readonly Interface[],
  credentials: Credentials,
): AsyncGenerator<
  Event,
  { readonly scenarios: readonly CheckedScenario[]; readonly passed: boolean }
> {
  const files = await rolesRun.readFiles(rolesRun.dir);
  const considered: CheckedScenario[] = [];
  let passed = true;
  for (const bound of interfaces) {
    const name = bound.interface;
    const built = builtOf(files, bound, Object.keys(credentials));
    const findings =
      built === undefined
        ? ["rules.yaml or hints.yaml no longer pass their check"]
        : built.findings;
    if (built === undefined || findings.length > 0) {
      yield {
        type: "gate-checked",
        role: "builder",
        interface: name,
        ok: false,
        findings,
      };
      passed = false;
      continue;
    }
    for (const { slug, scenario } of built.scenarios) {
      const evidence = evidenceAt(files, name, slug);
      considered.push({ name, slug, path: `${name}/${slug}`, scenario, evidence });
    }
  }
  const scenarios = considered.toSorted(
    (a, b) => a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug),
  );
  return { scenarios, passed };
}

type Stack = {
  readonly rolesRun: RolesRun;
  readonly target: Target;
  readonly credentials: Credentials;
};

// a reset and the scenario's steps, the copy shown
export async function* playOnce(
  { rolesRun: { dir, io }, target, credentials }: Stack,
  { name, slug, scenario }: CheckedScenario,
): AsyncGenerator<Event, Evidence> {
  const { run, exchanges } = await playSteps({
    dir,
    target,
    io,
    credentials,
    steps: scenario.steps,
  });
  const evidence = { rule: scenario.rule, run, exchanges };
  yield { type: "steps-played", interface: name, scenario: slug, evidence };
  return evidence;
}
