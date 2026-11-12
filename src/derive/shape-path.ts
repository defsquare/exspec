import type { NamedShape, Shape } from "../shapes/target.ts";

function isTuple(shape: Shape): shape is Extract<Shape, readonly unknown[]> {
  return Array.isArray(shape);
}

// [maybe, X] [optional, X] -> X;  [schema, N] -> the shape named N (undefined if none)
function unwrap(
  shape: Shape,
  schemas: readonly NamedShape[],
  seen: readonly string[] = [],
): Shape | undefined {
  if (!isTuple(shape) || shape.length !== 2) return shape;
  if (shape[0] !== "schema") return unwrap(shape[1], schemas, seen);
  const name = shape[1];
  if (seen.includes(name)) return undefined;
  const named = schemas.find(({ schema }) => schema === name);
  return named && unwrap(named.shape, schemas, [...seen, name]);
}

function step(
  shape: Shape,
  key: string,
  schemas: readonly NamedShape[],
): Shape | undefined {
  const inner = unwrap(shape, schemas);
  if (inner === undefined || inner === null || typeof inner === "string")
    return undefined;
  if (isTuple(inner)) return key === "each" && inner.length === 1 ? inner[0] : undefined;
  return Object.hasOwn(inner, key) ? inner[key] : undefined;
}

// {a: [[schema, S]]}, [a, each, b]  ->  true when S has a key b
export function hasShapePath(
  shape: Shape,
  steps: readonly string[],
  schemas: readonly NamedShape[],
): boolean {
  return (
    steps.reduce<Shape | undefined>(
      (at, key) => (at === undefined ? undefined : step(at, key, schemas)),
      shape,
    ) !== undefined
  );
}
