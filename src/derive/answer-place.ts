import type { Trigger } from "../shapes/bindings.ts";
import type { Interface, Shape } from "../shapes/target.ts";

// at: the path to the answered structure in the body; none: why there is no one place
export type AnswerPlace = { readonly at: readonly string[] } | { readonly none: string };

// Where a shape holds [schema, S], through a map or a maybe, not into a list:
//   {data: [maybe, [schema, S]], all: [[schema, S]]} -> [[data]]
function placesOf(
  shape: Shape,
  structure: string,
  at: readonly string[],
): readonly (readonly string[])[] {
  if (shape === null || typeof shape === "string") return [];
  if (Array.isArray(shape)) {
    const [head, inner] = shape;
    if (head === "schema") return inner === structure ? [at] : [];
    if ((head === "maybe" || head === "optional") && inner !== undefined) {
      return placesOf(inner, structure, at);
    }
    return [];
  }
  return Object.entries(shape).flatMap(([key, value]) =>
    placesOf(value, structure, [...at, key]),
  );
}

// Whether a shape holds [schema, S] in a list: {all: [[schema, S]]} -> true
function listed(shape: Shape, structure: string, inList = false): boolean {
  if (shape === null || typeof shape === "string") return false;
  if (Array.isArray(shape)) {
    const [head, inner] = shape;
    if (head === "schema") return inList && inner === structure;
    if (inner === undefined) {
      return typeof head !== "string" && listed(head, structure, true);
    }
    return typeof inner !== "string" && listed(inner, structure, inList);
  }
  return Object.values(shape).some((value) => listed(value, structure, inList));
}

// Where the structure an operation answers sits in the body it is answered with: the
// trigger's shows, else the one place a 2xx response's body holds [schema, S].
//   S, shows [], 201 answering {data: [schema, S]} -> {at: [data]}
//   S, shows [{structure: S, at: [r]}]              -> {at: [r]}
export function placeOfAnswer({
  structure,
  shows,
  bound,
}: {
  readonly structure: string | null;
  readonly shows: Trigger["answers"]["shows"];
  readonly bound: Interface;
}): AnswerPlace {
  if (structure === null) return { none: "the operation answers no structure" };
  const where = `${bound.method} ${bound.pattern}`;
  const shown = shows.filter((show) => show.structure === structure);
  const [one, ...more] = shown;
  if (one !== undefined && more.length === 0) return { at: one.at };
  if (one !== undefined) return { none: `the trigger shows "${structure}" twice` };
  const found = Object.entries(bound.responses)
    .filter(([status]) => status.startsWith("2"))
    .flatMap(([, { body }]) => placesOf(body, structure, []));
  const distinct = [...new Map(found.map((at) => [at.join("."), at])).values()];
  const [at, ...others] = distinct;
  if (at === undefined) {
    const inList = Object.entries(bound.responses).some(
      ([status, { body }]) => status.startsWith("2") && listed(body, structure),
    );
    return {
      none: inList
        ? `the 2xx responses of ${where} hold "${structure}" in a list, never one alone`
        : `no 2xx response of ${where} holds one "${structure}"`,
    };
  }
  if (others.length === 0) return { at };
  return {
    none: `the 2xx responses of ${where} hold "${structure}" at several places: ${distinct
      .map((place) => place.join(".") || "(body)")
      .join(", ")}`,
  };
}
