import type { Extraction } from "../shapes/extraction.ts";

export type ConceptKind =
  | "operation"
  | "fact"
  | "structure"
  | "interface"
  | "projection"
  | "trigger"
  | "scenario";

export type Named = { readonly concept: ConceptKind; readonly name: string };

// as: what the first says of the second, in the words of the files —
//   { from: operation f, to: fact a, as: "requires" }
export type Link = { readonly from: Named; readonly to: Named; readonly as: string };

// Every reference one concept of an extraction makes to another, each once, in the order
// of the files. Read from `to`, it is what cites a concept: no file says that.
export function linksOf(extraction: Extraction): readonly Link[] {
  const { operations, facts, structures, projections, triggers, scenarios } = extraction;
  const links = [
    ...operations.flatMap(({ operation }) => {
      const from: Named = { concept: "operation", name: operation.operation };
      const to = (concept: ConceptKind, name: string, as: string): Link => ({
        from,
        to: { concept, name },
        as,
      });
      return [
        ...Object.values(operation.takes).flatMap((input) =>
          "field" in input ? [to("structure", input.field[0], "takes")] : [],
        ),
        ...operation.requires.map(({ fact }) => to("fact", fact, "requires")),
        ...(operation.answers === null
          ? []
          : [to("structure", operation.answers, "answers")]),
        ...operation.effects.flatMap(({ when, then }) => [
          // [given, a] names an input of the operation, not a fact
          ...(when === undefined || when[0] === "given"
            ? []
            : [to("fact", typeof when === "string" ? when : when[1], "when")]),
          ...(typeof then === "string" || "says" in then
            ? []
            : [
                ...Object.keys(then.fact ?? {}).map((fact) =>
                  to("fact", fact, "changes"),
                ),
                ...(then.field ?? []).map(({ of }) => to("structure", of[0], "changes")),
              ]),
        ]),
      ];
    }),
    ...facts.flatMap(({ fact, condition }) =>
      condition.flatMap((term): readonly Link[] =>
        "structure" in term
          ? [
              {
                from: { concept: "fact", name: fact },
                to: { concept: "structure", name: term.structure },
                as: "reads",
              },
            ]
          : [],
      ),
    ),
    ...structures.flatMap(({ structure, fields }) =>
      Object.values(fields).flatMap((field): readonly Link[] =>
        "structure" in field
          ? [
              {
                from: { concept: "structure", name: structure },
                to: { concept: "structure", name: field.structure },
                as: "refers to",
              },
            ]
          : [],
      ),
    ),
    ...projections.flatMap(({ projection, interface: through, shows }) => {
      const from: Named = { concept: "projection", name: projection };
      return [
        { from, to: { concept: "interface", name: through }, as: "reads through" },
        ...shows.map(
          ({ structure }): Link => ({
            from,
            to: { concept: "structure", name: structure },
            as: "shows",
          }),
        ),
      ] satisfies readonly Link[];
    }),
    ...triggers.flatMap(({ trigger, interface: through, operation, answers }) => {
      const from: Named = { concept: "trigger", name: trigger };
      return [
        { from, to: { concept: "interface", name: through }, as: "calls" },
        { from, to: { concept: "operation", name: operation }, as: "triggers" },
        ...answers.shows.map(
          ({ structure }): Link => ({
            from,
            to: { concept: "structure", name: structure },
            as: "shows",
          }),
        ),
      ] satisfies readonly Link[];
    }),
    ...scenarios.flatMap(({ path, scenario }) => {
      const from: Named = { concept: "scenario", name: path };
      return [
        {
          from,
          to: { concept: "operation", name: scenario.act.call.operation },
          as: "acts",
        },
        ...scenario.arrange.map(
          ({ call }): Link => ({
            from,
            to: { concept: "operation", name: call.operation },
            as: "arranges",
          }),
        ),
        ...scenario.assert.map(
          (look): Link =>
            "fact" in look
              ? { from, to: { concept: "fact", name: look.fact }, as: "looks at" }
              : {
                  from,
                  to: { concept: "structure", name: look.shows.structure },
                  as: "looks at",
                },
        ),
      ] satisfies readonly Link[];
    }),
  ];
  const seen = new Set<string>();
  return links.filter(({ from, to, as }) => {
    const key = JSON.stringify([from, to, as]);
    return seen.has(key) ? false : Boolean(seen.add(key));
  });
}
