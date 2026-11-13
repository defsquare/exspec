import type { Extraction } from "../shapes/extraction.ts";
import type { Operation } from "../shapes/specification.ts";

type Verb = "answers" | "changes" | "takes" | "requires";

// what an operation does to one structure, each verb with the fields or the rules it is about:
//   { structure: "A", as: [{ verb: "answers", what: [] }, { verb: "takes", what: ["id", "name"] }] }
export type Touch = {
  readonly structure: string;
  readonly as: readonly { readonly verb: Verb; readonly what: readonly string[] }[];
};

// home: the structure an operation is filed under, null when it has none
export type Placed = {
  readonly operation: string;
  readonly home: string | null;
  readonly touches: readonly Touch[];
};

type Said = { readonly structure: string; readonly verb: Verb; readonly what?: string };

// A requirement touches the structures its fact reads: "requires r". A fact an effect
// changes, or waits for, is not followed to a structure.
function touchesOf(
  operation: Operation,
  known: ReadonlySet<string>,
  readBy: ReadonlyMap<string, readonly string[]>,
): readonly Touch[] {
  const said: readonly Said[] = [
    ...(operation.answers === null
      ? []
      : [{ structure: operation.answers, verb: "answers" as const }]),
    ...operation.effects.flatMap(({ then }) =>
      typeof then === "string" || "says" in then
        ? []
        : (then.field ?? []).map(({ of }) => ({
            structure: of[0],
            verb: "changes" as const,
            what: of[1],
          })),
    ),
    ...Object.values(operation.takes).flatMap((input) =>
      "field" in input
        ? [{ structure: input.field[0], verb: "takes" as const, what: input.field[1] }]
        : [],
    ),
    ...operation.requires.flatMap(({ rule, fact }) =>
      (readBy.get(fact) ?? []).map((structure) => ({
        structure,
        verb: "requires" as const,
        what: rule,
      })),
    ),
  ].filter(({ structure }) => known.has(structure));
  return [...new Set(said.map(({ structure }) => structure))].map((structure) => {
    const of = said.filter((s) => s.structure === structure);
    return {
      structure,
      as: [...new Set(of.map(({ verb }) => verb))].map((verb) => ({
        verb,
        what: [
          ...new Set(
            of.flatMap((s) => (s.verb === verb && s.what !== undefined ? [s.what] : [])),
          ),
        ],
      })),
    };
  });
}

// An operation is filed under the structure it answers; failing that, under the one
// structure its inputs name. One that names several, or none, has no home.
function homeOf(operation: Operation, known: ReadonlySet<string>): string | null {
  if (operation.answers !== null && known.has(operation.answers)) {
    return operation.answers;
  }
  const named = [
    ...new Set(
      Object.values(operation.takes).flatMap((input) =>
        "field" in input && known.has(input.field[0]) ? [input.field[0]] : [],
      ),
    ),
  ];
  return named.length === 1 && named[0] !== undefined ? named[0] : null;
}

// Every operation with the structures it touches and the one it is filed under, in the
// order of the files. No file says either: a reader walks the specification from its
// structures, and an operation has to be found under one.
export function placeOperations(extraction: Extraction): readonly Placed[] {
  const known = new Set(extraction.structures.map(({ structure }) => structure));
  const readBy = new Map(
    extraction.facts.map(({ fact, condition }) => [
      fact,
      condition.flatMap((term) =>
        "structure" in term && known.has(term.structure) ? [term.structure] : [],
      ),
    ]),
  );
  return extraction.operations.map(({ operation }) => ({
    operation: operation.operation,
    home: homeOf(operation, known),
    touches: touchesOf(operation, known, readBy),
  }));
}
