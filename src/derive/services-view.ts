import type { Provider } from "../shapes/provider.ts";
import type { Service } from "../shapes/service.ts";
import type { Interface } from "../shapes/target.ts";
import type { Line, StepView } from "./roles-view.ts";

// a provider's folder, parsed: providers/<p>/provider.yaml and its interfaces.yaml
export type ReadProvider = {
  readonly provider: Provider;
  readonly interfaces: readonly Interface[];
};

type ReadOperation = {
  readonly operation: string;
  readonly lines: readonly Pick<Line, "rule" | "short" | "service">[];
};

type ReadScenario = {
  readonly path: string;
  readonly steps: readonly Pick<StepView, "service" | "is" | "sideEffects">[];
};

// What the provider rendering a service is on this target, with what was recorded of it:
//   calls: side effects sent to it, scenarios: the scenarios holding one at least
function providerOf(
  { provider, interfaces }: ReadProvider,
  scenarios: readonly ReadScenario[],
) {
  const calls = scenarios.map(
    ({ steps }) =>
      steps.flatMap(({ sideEffects }) =>
        (sideEffects ?? []).filter(({ observable }) => observable === provider.provider),
      ).length,
  );
  return {
    provider: provider.provider,
    calls: calls.reduce((a, b) => a + b, 0),
    scenarios: calls.filter((n) => n > 0).length,
    interfaces: interfaces.map(({ interface: name, method, pattern }) => ({
      interface: name,
      method,
      pattern,
    })),
    expects: provider.expects,
    unsure: provider.unsure,
  };
}

// Each service as view draws it: the operations and rules resting on it, the scenarios that
// give each of its conditions, and the provider rendering it on this target, null when none.
//   rule r of f with {service: s}, step {service: s, is: c} of f/a
//     -> {service: s, in: [{operation: f, rules: 1}], rules: [{operation: f, rule: r, …}],
//         conditions: [{condition: c, given: ["f/a"], …}], provider: …}
export function viewOfServices({
  services,
  providers,
  operations,
  scenarios,
}: {
  readonly services: readonly Service[];
  readonly providers: readonly ReadProvider[];
  readonly operations: readonly ReadOperation[];
  readonly scenarios: readonly ReadScenario[];
}) {
  return services.map(({ service, says, conditions, unsure }) => {
    const rules = operations.flatMap(({ operation, lines }) =>
      lines
        .filter((line) => line.service === service)
        .map(({ rule, short }) => ({ operation, rule, says: short })),
    );
    const rendering = providers.find(({ provider }) => provider.renders === service);
    return {
      service,
      says,
      unsure,
      in: [...new Set(rules.map(({ operation }) => operation))].map((operation) => ({
        operation,
        rules: rules.filter((r) => r.operation === operation).length,
      })),
      conditions: conditions.map(({ condition, takes, says }) => ({
        condition,
        takes: takes ?? {},
        says,
        given: scenarios
          .filter(({ steps }) =>
            steps.some((step) => step.service === service && step.is === condition),
          )
          .map(({ path }) => path),
      })),
      rules,
      provider: rendering === undefined ? null : providerOf(rendering, scenarios),
    };
  });
}
