import type { Extraction, Problem } from "../shapes/extraction.ts";

// a, b, a -> a problem at the second a: { file, at: "<prefix>2.<key>", message }
function declaredTwice(
  file: string,
  kind: string,
  prefix: string,
  names: readonly string[],
): readonly Problem[] {
  return names.flatMap((name, i) =>
    names.indexOf(name) < i
      ? [
          {
            file,
            at: `${prefix}${i}.${kind}`,
            message: `${kind} "${name}" is declared twice`,
          },
        ]
      : [],
  );
}

export function checkNames({
  schemas,
  interfaces,
  structures,
  facts,
  projections,
  triggers,
}: Extraction): readonly Problem[] {
  return [
    ...declaredTwice(
      "interfaces.yaml",
      "interface",
      "interfaces.",
      interfaces.map((i) => i.interface),
    ),
    ...declaredTwice(
      "interfaces.yaml",
      "schema",
      "schemas.",
      schemas.map((s) => s.schema),
    ),
    ...declaredTwice(
      "structures.yaml",
      "structure",
      "",
      structures.map((s) => s.structure),
    ),
    ...declaredTwice(
      "facts.yaml",
      "fact",
      "",
      facts.map((f) => f.fact),
    ),
    ...declaredTwice(
      "bindings.yaml",
      "projection",
      "projections.",
      projections.map((p) => p.projection),
    ),
    ...declaredTwice(
      "bindings.yaml",
      "trigger",
      "triggers.",
      triggers.map((t) => t.trigger),
    ),
  ];
}
