import { type Step, stepSchema, type WrittenStep } from "../shapes/roles.ts";
import { anyHole } from "./holes.ts";

// a state that is reached, and the steps of its path
export type Path = { readonly state: string; readonly steps: readonly Step[] };

// a step's holes renamed on its JSON text, the step parsed back:
//   {path: "/a/{{c.id}}"}, c -> p-c  ->  {path: "/a/{{p-c.id}}"}
function renamed(step: unknown, rename: (hole: string) => string): Step {
  const text = JSON.stringify(step).replace(
    anyHole,
    (_, hole: string) => `{{${rename(hole)}}}`,
  );
  return stepSchema.parse(JSON.parse(text));
}

const nameOf = (step: Step) => ("name" in step ? step.name : undefined);

const namesOf = (steps: readonly Step[]) => steps.flatMap((step) => nameOf(step) ?? []);

type Replaced =
  | { readonly at: number; readonly fromState: boolean; readonly steps: readonly Step[] }
  | { readonly at: number; readonly finding: string };

// {when: arrange, state: s, name: p}, the path of s: [{arrange, name: c, …}, {call, name: d,
// path "/a/{{c.id}}"}, {after, …}]
//   -> [{arrange, name: p-c, …}, {arrange, name: p-d, path "/a/{{p-c.id}}"}]
// the path's before and after steps are left out; a hole {{p.c.id}} of a later step of the
// scenario becomes {{p-c.id}}; steps with no state step come back as they are
export function stepsFromStates(
  steps: readonly WrittenStep[],
  paths: readonly Path[],
): { readonly steps: readonly Step[] } | { readonly findings: readonly string[] } {
  const states = new Set(steps.flatMap((step) => ("state" in step ? [step.name] : [])));
  const fromState = (hole: string) => {
    const [name = "", step, ...rest] = hole.split(".");
    return states.has(name) && step !== undefined
      ? [`${name}-${step}`, ...rest].join(".")
      : hole;
  };
  const replaced = steps.map((step, at): Replaced => {
    if (!("state" in step)) {
      return {
        at,
        fromState: false,
        steps: [states.size === 0 ? step : renamed(step, fromState)],
      };
    }
    const path = paths.find(({ state }) => state === step.state);
    if (path === undefined) {
      return {
        at,
        finding: `step ${at + 1}: "${step.state}" is not a state that is reached`,
      };
    }
    const named = new Set(namesOf(path.steps));
    const under = (hole: string) => {
      const [name = "", ...rest] = hole.split(".");
      return named.has(name) ? [`${step.name}-${name}`, ...rest].join(".") : hole;
    };
    return {
      at,
      fromState: true,
      steps: path.steps
        .filter(({ when }) => when === "arrange" || when === "call")
        .map((one) => {
          const name = nameOf(one);
          return renamed(
            {
              ...one,
              when: "arrange",
              ...(name === undefined ? {} : { name: `${step.name}-${name}` }),
            },
            under,
          );
        }),
    };
  });
  const findings = replaced.flatMap((one) => {
    if ("finding" in one) return [one.finding];
    if (!one.fromState) return [];
    const elsewhere = new Set(
      replaced.flatMap((other) =>
        other.at === one.at || "finding" in other ? [] : namesOf(other.steps),
      ),
    );
    return [...new Set(namesOf(one.steps))]
      .filter((name) => elsewhere.has(name))
      .map((name) => `step ${one.at + 1}: the names collide on "${name}"`);
  });
  return findings.length > 0
    ? { findings }
    : { steps: replaced.flatMap((one) => ("finding" in one ? [] : one.steps)) };
}
