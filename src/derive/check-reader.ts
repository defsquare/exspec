import { z } from "zod";
import {
  type Common,
  commonSchema,
  hintsSchema,
  type Rules,
  readYaml,
  rulesSchema,
} from "../shapes/roles.ts";
import { type Structure, structureSchema } from "../shapes/specification.ts";
import { checkStructures } from "./check-structures.ts";

const findingsOf = (read: { readonly findings: readonly string[] } | object) =>
  "findings" in read ? read.findings : [];

// undefined text: the file is not there
export function checkCommon(text: string | undefined): {
  readonly common?: Common;
  readonly findings: readonly string[];
} {
  if (text === undefined) return { findings: ["common.yaml: missing"] };
  const read = readYaml("common.yaml", text, commonSchema);
  return "value" in read ? { common: read.value, findings: [] } : read;
}

const bounds = ["min-length", "max-length", "min", "max"] as const;

// What the reader of the structures wrote. structures: the list as it parses, findings or
// not; a finding:
//   "structures.yaml: Item.name: a bound (max-length) is a rule of an operation, not of a field"
export function checkStructuresFile(text: string | undefined): {
  readonly structures?: readonly Structure[];
  readonly findings: readonly string[];
} {
  if (text === undefined) return { findings: ["structures.yaml: missing"] };
  const read = readYaml("structures.yaml", text, z.array(structureSchema).readonly());
  if (!("value" in read)) return read;
  const structures = read.value;
  return {
    structures,
    findings: [
      ...(structures.length === 0 ? ["structures.yaml: no structure is declared"] : []),
      ...checkStructures({ structures }).map(
        ({ at, message }) => `structures.yaml: ${at}: ${message}`,
      ),
      ...structures.flatMap(({ structure, fields }) =>
        Object.entries(fields).flatMap(([name, field]) => {
          const bound = bounds.filter((key) => key in field);
          return bound.length === 0
            ? []
            : [
                `structures.yaml: ${structure}.${name}: a bound (${bound.join(", ")}) is a rule of an operation, not of a field`,
              ];
        }),
      ),
    ],
  };
}

const twice = (names: readonly string[]) => [
  ...new Set(names.filter((name, i) => names.indexOf(name) !== i)),
];

// What a reader wrote for one operation, checked before a builder is handed it. A finding
// is a line the reader can fix:
//   "rules.yaml: the rule \"a\" is declared twice", "hints.yaml: no hint for the rule \"b\""
export function checkRulesAndHints({
  operation,
  common,
  structures,
  rules,
  hints,
}: {
  readonly operation: string;
  readonly common: Common | undefined;
  // undefined: structures.yaml is missing or does not parse, and names nothing
  readonly structures: readonly Structure[] | undefined;
  readonly rules: string | undefined;
  readonly hints: string | undefined;
}): { readonly rules?: Rules; readonly findings: readonly string[] } {
  const readRules =
    rules === undefined
      ? { findings: ["rules.yaml: missing"] }
      : readYaml("rules.yaml", rules, rulesSchema);
  const readHints =
    hints === undefined
      ? { findings: ["hints.yaml: missing"] }
      : readYaml("hints.yaml", hints, hintsSchema);
  const read = [...findingsOf(readRules), ...findingsOf(readHints)];
  if (!("value" in readRules)) return { findings: read };
  const parsed = readRules.value;
  const declared = [...parsed.requires, ...parsed.effects].map(({ rule }) => rule);
  const shared = new Set(common?.rules.map(({ rule }) => rule));
  const known = new Set([...declared, ...parsed.common, "answers"]);
  const fieldsOf = (name: string) =>
    structures?.find(({ structure }) => structure === name)?.fields;
  const answered = parsed.answers.structure;
  const hinted = "value" in readHints ? readHints.value.map(({ rule }) => rule) : [];
  const findings = [
    ...read,
    ...(parsed.operation === operation
      ? []
      : [
          `rules.yaml: operation is "${parsed.operation}", the operation is "${operation}"`,
        ]),
    ...twice(declared).map((rule) => `rules.yaml: the rule "${rule}" is declared twice`),
    ...parsed.common
      .filter((rule) => !shared.has(rule))
      .map(
        (rule) =>
          `rules.yaml: common names "${rule}", which is not a rule of common.yaml`,
      ),
    ...Object.entries(parsed.takes ?? {}).flatMap(([input, { field }]) =>
      field === undefined || Object.hasOwn(fieldsOf(field[0]) ?? {}, field[1])
        ? []
        : [
            `rules.yaml: takes.${input} names the field ${field.join(".")}, which structures.yaml does not declare`,
          ],
    ),
    ...parsed.requires
      .filter(({ on }) => on !== undefined && !Object.hasOwn(parsed.takes ?? {}, on))
      .map(
        ({ rule, on }) =>
          `rules.yaml: the rule "${rule}" is on "${on}", which takes does not declare`,
      ),
    ...(answered === null || fieldsOf(answered) !== undefined
      ? []
      : [
          `rules.yaml: answers names the structure ${answered}, which structures.yaml does not declare`,
        ]),
    ...parsed.unsure
      .filter(({ rule }) => !known.has(rule))
      .map(
        ({ rule }) =>
          `rules.yaml: unsure names "${rule}", which is not a rule of the file`,
      ),
    ...("value" in readHints
      ? [
          ...declared
            .filter((rule) => !hinted.includes(rule))
            .map((rule) => `hints.yaml: no hint for the rule "${rule}"`),
          ...twice(hinted).map((rule) => `hints.yaml: two hints for the rule "${rule}"`),
          ...hinted
            .filter((rule) => !known.has(rule))
            .map((rule) => `hints.yaml: a hint for "${rule}", which is not a rule`),
        ]
      : []),
  ];
  return findings.length === 0 ? { rules: parsed, findings } : { findings };
}
