// For an extraction made before ADR-0023: each rule's refusal split into its name and a trigger.yaml.
//   bun scripts/migrations/0023-refusals-to-triggers.ts <dir> --wire <common rule> …  (rewrites <dir> in place)
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";

const oldRefusalSchema = z.strictObject({
  refusal: z.string(),
  status: z.int(),
  body: z.string(),
});

type OldRefusal = z.infer<typeof oldRefusalSchema>;

const oldRuleSchema = z.looseObject({ rule: z.string(), otherwise: oldRefusalSchema });

const oldRulesSchema = z.looseObject({
  operation: z.string(),
  common: z.array(z.string()).default([]),
  requires: z.array(oldRuleSchema).default([]),
});

const oldCommonSchema = z.looseObject({
  target: z.string(),
  "runs-with": z.array(z.unknown()).default([]),
  rules: z.array(oldRuleSchema.extend({ "applies-to": z.string() })).default([]),
  errors: z.array(z.unknown()).default([]),
  contract: z.array(z.unknown()).default([]),
  unsure: z.array(z.unknown()).default([]),
});

// the keys of a value in the order a reader writes them, the others after:
//   {otherwise: r, rule: a, x: 1} -> {rule: a, otherwise: r, x: 1}
const order = [
  ...["operation", "takes", "common", "requires", "effects", "answers", "unsure"],
  ...["rule", "on", "when", "service", "applies-to", "fact", "otherwise", "source"],
];
const rank = (key: string) => (order.includes(key) ? order.indexOf(key) : order.length);
const ordered = (value: Readonly<Record<string, unknown>>) =>
  Object.fromEntries(Object.entries(value).sort(([a], [b]) => rank(a) - rank(b)));

type Wire = { readonly status: number; readonly body: string };

// Each rule's refusal name, two rules refusing by one name in two ways renamed apart:
//   a: {refusal: r, status: 404, body: x}, b: {refusal: r, status: 404, body: y}
//   -> names {a: "r-of-a", b: "r-of-b"}, refuses {r-of-a: {404, x}, r-of-b: {404, y}}
function nameRefusals(
  rules: readonly { readonly rule: string; readonly otherwise: OldRefusal }[],
): {
  readonly names: Readonly<Record<string, string>>;
  readonly refuses: Readonly<Record<string, Wire>>;
  readonly renamed: readonly string[];
} {
  const differ = (refusal: string) =>
    new Set(
      rules
        .filter(({ otherwise }) => otherwise.refusal === refusal)
        .map(({ otherwise: { status, body } }) => JSON.stringify([status, body])),
    ).size > 1;
  const named = rules.map(({ rule, otherwise: { refusal, status, body } }) => ({
    rule,
    refusal,
    name: differ(refusal) ? `${refusal}-of-${rule}` : refusal,
    wire: { status, body },
  }));
  return {
    names: Object.fromEntries(named.map(({ rule, name }) => [rule, name])),
    refuses: Object.fromEntries(named.map(({ name, wire }) => [name, wire])),
    renamed: named
      .filter(({ refusal, name }) => refusal !== name)
      .map(
        ({ rule, refusal, name }) =>
          `the refusal "${refusal}" of "${rule}" renamed "${name}": two rules refuse by that name in two ways`,
      ),
  };
}

// One interface's rules.yaml, parsed: what it becomes and the trigger beside it; undefined
// when it holds no refusal of the old form
export function splitRules(
  name: string,
  rules: unknown,
  wire: readonly string[],
):
  | {
      readonly rules: Readonly<Record<string, unknown>>;
      readonly trigger: Readonly<Record<string, unknown>>;
      readonly renamed: readonly string[];
    }
  | undefined {
  const read = oldRulesSchema.safeParse(rules);
  if (!read.success) return undefined;
  const { names, refuses, renamed } = nameRefusals(read.data.requires);
  const protocol = read.data.common.filter((rule) => wire.includes(rule));
  return {
    rules: ordered({
      ...read.data,
      common: read.data.common.filter((rule) => !wire.includes(rule)),
      requires: read.data.requires.map((requirement) =>
        ordered({ ...requirement, otherwise: names[requirement.rule] }),
      ),
    }),
    trigger: {
      trigger: name,
      interface: name,
      operation: read.data.operation,
      answers: { status: [] },
      refuses,
      ...(protocol.length === 0 ? {} : { protocol }),
    },
    renamed,
  };
}

// common.yaml, parsed: what it keeps, and protocol.yaml; undefined when it holds no refusal
// of the old form. A rule of the wire whose refusal is "none" refuses nothing: it keeps no
// otherwise.
export function splitCommon(
  common: unknown,
  wire: readonly string[],
):
  | {
      readonly common: Readonly<Record<string, unknown>>;
      readonly protocol: Readonly<Record<string, unknown>>;
      readonly renamed: readonly string[];
    }
  | undefined {
  const read = oldCommonSchema.safeParse(common);
  if (!read.success) return undefined;
  const { target, rules, unsure } = read.data;
  const kept = rules.filter(({ rule }) => !wire.includes(rule));
  const { names, refuses, renamed } = nameRefusals(kept);
  return {
    common: {
      target,
      rules: kept.map((rule) => ordered({ ...rule, otherwise: names[rule.rule] })),
      unsure,
    },
    protocol: {
      target,
      "runs-with": read.data["runs-with"],
      rules: rules
        .filter(({ rule }) => wire.includes(rule))
        .map(({ otherwise, ...rule }) =>
          ordered(otherwise.refusal === "none" ? rule : { ...rule, otherwise }),
        ),
      refuses,
      errors: read.data.errors,
      contract: read.data.contract,
    },
    renamed,
  };
}

const yaml = (value: unknown) => `${Bun.YAML.stringify(value, null, 2)}\n`;

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { wire: { type: "string", multiple: true, default: [] } },
  });
  const [dir] = positionals;
  if (dir === undefined) {
    console.error(
      "usage: bun scripts/migrations/0023-refusals-to-triggers.ts <dir> --wire <common rule> …",
    );
    process.exit(2);
  }
  const roles = join(dir, "exspec", "roles");
  const wire = values.wire;
  const read = async (path: string) => Bun.YAML.parse(await Bun.file(path).text());
  const common = (await Bun.file(join(roles, "protocol.yaml")).exists())
    ? undefined
    : splitCommon(await read(join(roles, "common.yaml")), wire);
  if (common === undefined) console.log("common.yaml: already rewritten, left as it is");
  else {
    await Bun.write(join(roles, "common.yaml"), yaml(common.common));
    await Bun.write(join(roles, "protocol.yaml"), yaml(common.protocol));
    for (const line of common.renamed) console.log(`common.yaml: ${line}`);
    console.log("common.yaml, protocol.yaml: written");
  }
  const folders = (await readdir(roles, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map(({ name }) => name)
    .sort();
  for (const name of folders) {
    const file = join(roles, name, "rules.yaml");
    if (!(await Bun.file(file).exists())) continue;
    const already = await Bun.file(join(roles, name, "trigger.yaml")).exists();
    const split = already ? undefined : splitRules(name, await read(file), wire);
    if (split === undefined) {
      console.log(`${name}/rules.yaml: already rewritten, left as it is`);
      continue;
    }
    await Bun.write(file, yaml(split.rules));
    await Bun.write(join(roles, name, "trigger.yaml"), yaml(split.trigger));
    for (const line of split.renamed) console.log(`${name}/rules.yaml: ${line}`);
    console.log(`${name}/trigger.yaml: written — accepted statuses to be read`);
  }
}

if (import.meta.main) await main();
