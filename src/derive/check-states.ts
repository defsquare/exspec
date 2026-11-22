import { readYaml } from "../shapes/roles.ts";
import { type State, statesFileSchema } from "../shapes/state.ts";
import { twice } from "./check-reader.ts";

// a state's path: "f/a" -> {operation: "f", slug: "a"}
export function partsOfPath(path: string) {
  const [operation = "", slug = ""] = path.split("/");
  return { operation, slug };
}

// What was written of the states. No file is no state; a finding:
//   "states.yaml: s: \"B\" is not a structure"
export function checkStates({
  text,
  structures,
  interfaces,
}: {
  readonly text: string | undefined;
  readonly structures: readonly string[];
  readonly interfaces: readonly string[];
}): { readonly states: readonly State[]; readonly findings: readonly string[] } {
  if (text === undefined) return { states: [], findings: [] };
  const read = readYaml("states.yaml", text, statesFileSchema);
  if (!("value" in read)) return { states: [], findings: read.findings };
  const states = read.value;
  return {
    states,
    findings: [
      ...twice(states.map(({ state }) => state)).map(
        (state) => `states.yaml: "${state}" is named twice`,
      ),
      ...states.flatMap(({ state, of, path }) => {
        const { operation } = partsOfPath(path);
        return [
          ...of
            .filter((name) => !structures.includes(name))
            .map((name) => `states.yaml: ${state}: "${name}" is not a structure`),
          ...(interfaces.includes(operation)
            ? []
            : [
                `states.yaml: ${state}: the path ${path} names "${operation}", not an interface`,
              ]),
        ];
      }),
    ],
  };
}
