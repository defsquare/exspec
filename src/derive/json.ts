import type { Place } from "../shapes/scenario.ts";

export function isMap(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// {a: 1, b: [2]} and {b: [2], a: 1} are equal: the order of keys does not count
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  }
  if (isMap(a) && isMap(b)) {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every((key) => Object.hasOwn(b, key) && deepEqual(a[key], b[key]))
    );
  }
  return a === b;
}

// {a: [1, {b: 2}]}, [a, 1, b] -> 2;  a place that is not there -> undefined
export function valueAt(root: unknown, at: Place): unknown {
  return at.reduce<unknown>((value, key) => {
    if (typeof key === "number") return Array.isArray(value) ? value[key] : undefined;
    return isMap(value) && Object.hasOwn(value, key) ? value[key] : undefined;
  }, root);
}

function sameKeys(
  a: Readonly<Record<string, unknown>>,
  b: Readonly<Record<string, unknown>>,
) {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length && keys.every((key) => Object.hasOwn(b, key))
  );
}

// The places where a and b differ, as deep as both keep one form:
//   {x: 1, y: [1, 2], z: {k: 1}}  {x: 2, y: [1, 3], z: {j: 1}}
//   -> [x] 1 2,  [y, 1] 2 3,  [z] {k: 1} {j: 1}
// A map is walked when both have the same keys, a list when both have the same length;
// otherwise the whole value is one place.
export function differingPlaces(
  a: unknown,
  b: unknown,
  at: Place,
  skip: (at: Place) => boolean = () => false,
): readonly { readonly at: Place; readonly a: unknown; readonly b: unknown }[] {
  if (skip(at) || deepEqual(a, b)) return [];
  if (isMap(a) && isMap(b) && sameKeys(a, b)) {
    return Object.keys(a).flatMap((key) =>
      differingPlaces(a[key], b[key], [...at, key], skip),
    );
  }
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
    return a.flatMap((x, i) => differingPlaces(x, b[i], [...at, i], skip));
  }
  return [{ at, a, b }];
}
