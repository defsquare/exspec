import { z } from "zod";
import { bindingsFileSchema, projectionSchema, triggerSchema } from "./bindings.ts";
import { referenceSchema, scenarioSchema } from "./scenario.ts";
import { factSchema, operationSchema, structureSchema } from "./specification.ts";
import {
  interfaceSchema,
  interfacesFileSchema,
  namedShapeSchema,
  targetSchema,
} from "./target.ts";

// what is read: one entry per file found under <dir>/specimen, path relative to it
export const sourceFileSchema = z
  .object({ path: z.string(), text: z.string() })
  .readonly();

export type SourceFile = z.infer<typeof sourceFileSchema>;

// the extraction is wrong: { file: "bindings.yaml", at: "triggers.0.sends", message: "…" }
export const problemSchema = z
  .object({ file: z.string(), at: z.string(), message: z.string() })
  .readonly();

export type Problem = z.infer<typeof problemSchema>;

// the extraction is incomplete: { kind: "rule-without-scenario", name: "op/rule", message: "…" }
export const gapSchema = z
  .object({
    kind: z.enum([
      "rule-without-scenario",
      "structure-not-shown",
      "interface-not-bound",
      "operation-without-trigger",
      "fact-without-condition",
      "refusal-not-translated",
      "reference-stale",
      "reference-without-scenario",
      "scenario-without-reference",
    ]),
    name: z.string(),
    message: z.string(),
  })
  .readonly();

export type Gap = z.infer<typeof gapSchema>;

// path: "<operation>" for an operation, "<operation>/<slug>" for a scenario or a reference
export const extractionSchema = z
  .object({
    target: targetSchema.optional(),
    schemas: z.array(namedShapeSchema).readonly(),
    interfaces: z.array(interfaceSchema).readonly(),
    structures: z.array(structureSchema).readonly(),
    facts: z.array(factSchema).readonly(),
    operations: z
      .array(z.object({ path: z.string(), operation: operationSchema }).readonly())
      .readonly(),
    projections: z.array(projectionSchema).readonly(),
    triggers: z.array(triggerSchema).readonly(),
    scenarios: z
      .array(z.object({ path: z.string(), scenario: scenarioSchema }).readonly())
      .readonly(),
    references: z
      .array(z.object({ path: z.string(), reference: referenceSchema }).readonly())
      .readonly(),
  })
  .readonly();

export type Extraction = z.infer<typeof extractionSchema>;

type Part = Partial<Extraction>;

type Outcome = { readonly part: Part; readonly problems: readonly Problem[] };

const nothing: Outcome = { part: {}, problems: [] };

function parseFile<T>(
  { path, text }: SourceFile,
  schema: z.ZodType<T>,
  contribute: (value: T) => Part,
): Outcome {
  const yaml = parseYaml(text);
  if ("error" in yaml) {
    return { part: {}, problems: [{ file: path, at: "", message: yaml.error }] };
  }
  const parsed = schema.safeParse(yaml.value);
  if (parsed.success) return { part: contribute(parsed.data), problems: [] };
  return {
    part: {},
    problems: parsed.error.issues.map((issue) => ({
      file: path,
      at: issue.path.map(String).join("."),
      message: issue.message,
    })),
  };
}

function parseYaml(
  text: string,
): { readonly value: unknown } | { readonly error: string } {
  try {
    const value: unknown = Bun.YAML.parse(text);
    return { value };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function readSourceFile(file: SourceFile): Outcome {
  const { path } = file;
  // target/ is the target's own: a compose file, a seed, what the lifecycle commands run
  if (path.startsWith("target/")) return nothing;
  switch (path) {
    case "target.yaml":
      return parseFile(file, targetSchema, (target) => ({ target }));
    case "interfaces.yaml":
      return parseFile(file, interfacesFileSchema, (part) => part);
    case "structures.yaml":
      return parseFile(file, z.array(structureSchema), (structures) => ({ structures }));
    case "facts.yaml":
      return parseFile(file, z.array(factSchema), (facts) => ({ facts }));
    case "bindings.yaml":
      return parseFile(file, bindingsFileSchema, (part) => part);
  }
  const operation = /^operations\/([^/]+)\.yaml$/.exec(path)?.[1];
  if (operation !== undefined) {
    return parseFile(file, operationSchema, (parsed) => ({
      operations: [{ path: operation, operation: parsed }],
    }));
  }
  const scenario = /^scenarios\/([^/]+\/[^/]+)\.yaml$/.exec(path)?.[1];
  if (scenario !== undefined) {
    return parseFile(file, scenarioSchema, (parsed) => ({
      scenarios: [{ path: scenario, scenario: parsed }],
    }));
  }
  const reference = /^references\/([^/]+\/[^/]+)\.yaml$/.exec(path)?.[1];
  if (reference !== undefined) {
    return parseFile(file, referenceSchema, (parsed) => ({
      references: [{ path: reference, reference: parsed }],
    }));
  }
  if (!path.endsWith(".yaml")) return nothing;
  return {
    part: {},
    problems: [{ file: path, at: "", message: "not a file of an extraction" }],
  };
}

const emptyExtraction: Extraction = {
  schemas: [],
  interfaces: [],
  structures: [],
  facts: [],
  operations: [],
  projections: [],
  triggers: [],
  scenarios: [],
  references: [],
};

function merge(extraction: Extraction, part: Part): Extraction {
  return {
    ...((part.target ?? extraction.target)
      ? { target: part.target ?? extraction.target }
      : {}),
    schemas: [...extraction.schemas, ...(part.schemas ?? [])],
    interfaces: [...extraction.interfaces, ...(part.interfaces ?? [])],
    structures: [...extraction.structures, ...(part.structures ?? [])],
    facts: [...extraction.facts, ...(part.facts ?? [])],
    operations: [...extraction.operations, ...(part.operations ?? [])],
    projections: [...extraction.projections, ...(part.projections ?? [])],
    triggers: [...extraction.triggers, ...(part.triggers ?? [])],
    scenarios: [...extraction.scenarios, ...(part.scenarios ?? [])],
    references: [...extraction.references, ...(part.references ?? [])],
  };
}

// A missing file is an empty list; a file that does not parse contributes nothing.
export function parseExtraction(files: readonly SourceFile[]): {
  readonly extraction: Extraction;
  readonly problems: readonly Problem[];
} {
  const outcomes = files.map(readSourceFile);
  return {
    extraction: outcomes.reduce((e, { part }) => merge(e, part), emptyExtraction),
    problems: outcomes.flatMap(({ problems }) => problems),
  };
}
