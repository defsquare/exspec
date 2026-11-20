import type { Extraction, Problem } from "../shapes/extraction.ts";
import type { Shape } from "../shapes/target.ts";
import { isTuple } from "./shape-path.ts";

const file = "interfaces.yaml";

// {a: [[schema, N]]}, "p"  ->  [{ at: "p.a.0", name: "N" }]
function schemasNamed(shape: Shape, at: string): readonly { at: string; name: string }[] {
  if (shape === null || typeof shape === "string") return [];
  if (!isTuple(shape)) {
    return Object.entries(shape).flatMap(([key, inner]) =>
      schemasNamed(inner, `${at}.${key}`),
    );
  }
  if (shape.length === 1) return schemasNamed(shape[0], `${at}.0`);
  return shape[0] === "schema" ? [{ at, name: shape[1] }] : schemasNamed(shape[1], at);
}

export function checkInterfaces({
  schemas,
  interfaces,
}: Pick<Extraction, "schemas" | "interfaces">): readonly Problem[] {
  const known = new Set(schemas.map(({ schema }) => schema));
  const shapes = [
    ...schemas.map(({ schema, shape }) => ({ at: `schemas.${schema}.shape`, shape })),
    ...interfaces.flatMap(({ interface: name, request, responses }) => {
      const at = `interfaces.${name}`;
      return [
        ...Object.entries(request.path ?? {}).map(([key, shape]) => ({
          at: `${at}.request.path.${key}`,
          shape,
        })),
        ...Object.entries(request.query ?? {}).map(([key, shape]) => ({
          at: `${at}.request.query.${key}`,
          shape,
        })),
        ...Object.entries(request.form ?? {}).map(([key, shape]) => ({
          at: `${at}.request.form.${key}`,
          shape,
        })),
        ...(request.body === undefined
          ? []
          : [{ at: `${at}.request.body`, shape: request.body }]),
        ...Object.entries(responses).flatMap(([status, { body, headers }]) => [
          { at: `${at}.responses.${status}.body`, shape: body },
          ...Object.entries(headers ?? {}).map(([key, shape]) => ({
            at: `${at}.responses.${status}.headers.${key}`,
            shape,
          })),
        ]),
      ];
    }),
  ];
  return shapes
    .flatMap(({ at, shape }) => schemasNamed(shape, at))
    .filter(({ name }) => !known.has(name))
    .map(({ at, name }) => ({ file, at, message: `unknown schema "${name}"` }));
}
