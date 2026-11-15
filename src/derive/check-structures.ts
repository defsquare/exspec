import type { Extraction, Problem } from "../shapes/extraction.ts";

export function checkStructures({
  structures,
}: Pick<Extraction, "structures">): readonly Problem[] {
  return structures.flatMap(({ structure, identity, fields }, i) =>
    Object.hasOwn(fields, identity)
      ? []
      : [
          {
            file: "structures.yaml",
            at: `${i}.identity`,
            message: `"${identity}" is not a field of ${structure}`,
          },
        ],
  );
}
