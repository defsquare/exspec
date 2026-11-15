import {
  type Common,
  commonSchema,
  hintsSchema,
  type Rules,
  readYaml,
  rulesSchema,
} from "../shapes/roles.ts";

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

const twice = (names: readonly string[]) => [
  ...new Set(names.filter((name, i) => names.indexOf(name) !== i)),
];

// What a reader wrote for one operation, checked before a builder is handed it. A finding
// is a line the reader can fix:
//   "rules.yaml: the rule \"a\" is declared twice", "hints.yaml: no hint for the rule \"b\""
export function checkReading({
  operation,
  common,
  rules,
  hints,
}: {
  readonly operation: string;
  readonly common: Common | undefined;
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
