import type { Trigger } from "../shapes/bindings.ts";
import type { Extraction, Problem } from "../shapes/extraction.ts";
import type { Interface, NamedShape } from "../shapes/target.ts";
import { refusalsOf } from "./operation.ts";
import { hasShapePath } from "./shape-path.ts";

const file = "bindings.yaml";

function problem(at: string, message: string): Problem {
  return { file, at, message };
}

// [path, a] -> request.path has a;  [body, a, b] -> request.body has a.b
function hasPlace(
  { request }: Interface,
  place: Trigger["sends"][string],
  schemas: readonly NamedShape[],
): boolean {
  if (place[0] === "body") {
    const [, ...steps] = place;
    return request.body !== undefined && hasShapePath(request.body, steps, schemas);
  }
  const [where, name] = place;
  const parameters = request[where];
  return parameters !== undefined && Object.hasOwn(parameters, name);
}

export function checkBindings({
  schemas,
  interfaces,
  structures,
  operations,
  projections,
  triggers,
}: Extraction): readonly Problem[] {
  const interfaceNamed = new Map(interfaces.map((i) => [i.interface, i]));
  const operationNamed = new Map(operations.map(({ operation: o }) => [o.operation, o]));
  const structureNames = new Set(structures.map(({ structure }) => structure));

  const checkShows = (
    at: string,
    shows: Trigger["answers"]["shows"],
    target: Interface | undefined,
    status: string,
  ): readonly Problem[] =>
    shows.flatMap((show, j) => {
      const unknown = structureNames.has(show.structure)
        ? []
        : [problem(`${at}.${j}.structure`, `unknown structure "${show.structure}"`)];
      if (target === undefined) return unknown;
      const response = target.responses[status];
      if (response === undefined) {
        return [
          ...unknown,
          problem(`${at}.${j}.at`, `"${target.interface}" has no response ${status}`),
        ];
      }
      return hasShapePath(response.body, show.at, schemas)
        ? unknown
        : [
            ...unknown,
            problem(
              `${at}.${j}.at`,
              `the response ${status} of "${target.interface}" has no ${show.at.join(".")}`,
            ),
          ];
    });

  const checkInterface = (at: string, name: string) =>
    interfaceNamed.has(name) ? [] : [problem(at, `unknown interface "${name}"`)];

  return [
    ...[...new Set(triggers.map(({ operation }) => operation))].flatMap((name) => {
      const bound = triggers.flatMap((t, i) => (t.operation === name ? [i] : []));
      return bound.length > 1
        ? [
            problem(
              `triggers.${bound[0]}.operation`,
              `${bound.length} triggers call "${name}"`,
            ),
          ]
        : [];
    }),
    ...projections.flatMap((projection, i) => [
      ...checkInterface(`projections.${i}.interface`, projection.interface),
      ...checkShows(
        `projections.${i}.shows`,
        projection.shows,
        interfaceNamed.get(projection.interface),
        "200",
      ),
    ]),
    ...triggers.flatMap((trigger, i) => {
      const at = `triggers.${i}`;
      const target = interfaceNamed.get(trigger.interface);
      const operation = operationNamed.get(trigger.operation);
      const refusals = operation ? refusalsOf(operation) : [];
      return [
        ...checkInterface(`${at}.interface`, trigger.interface),
        ...(operation
          ? []
          : [problem(`${at}.operation`, `unknown operation "${trigger.operation}"`)]),
        ...Object.entries(trigger.sends).flatMap(([input, place]) => [
          ...(operation && !Object.hasOwn(operation.takes, input)
            ? [
                problem(
                  `${at}.sends.${input}`,
                  `"${input}" is not an input of "${operation.operation}"`,
                ),
              ]
            : []),
          ...(target && !hasPlace(target, place, schemas)
            ? [
                problem(
                  `${at}.sends.${input}`,
                  `the request of "${target.interface}" has no ${place.join(".")}`,
                ),
              ]
            : []),
        ]),
        ...(operation
          ? Object.keys(operation.takes)
              .filter((input) => !Object.hasOwn(trigger.sends, input))
              .map((input) =>
                problem(
                  `${at}.sends`,
                  `"${input}" is taken by ${operation.operation} and sent nowhere`,
                ),
              )
          : []),
        ...(operation
          ? Object.keys(trigger.refuses)
              .filter((refusal) => !refusals.includes(refusal))
              .map((refusal) =>
                problem(
                  `${at}.refuses.${refusal}`,
                  `"${refusal}" is not a refusal of "${operation.operation}"`,
                ),
              )
          : []),
        ...checkShows(
          `${at}.answers.shows`,
          trigger.answers.shows,
          target,
          String(trigger.answers.status),
        ),
      ];
    }),
  ];
}
