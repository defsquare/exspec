import type { SourceFile } from "../shapes/extraction.ts";
import {
  type Evidence,
  evidenceSchema,
  type Judgement,
  judgementsSchema,
  readYaml,
} from "../shapes/roles.ts";
import type { Interface } from "../shapes/target.ts";
import { checkBuilt } from "./check-built.ts";
import { checkCommon, checkRulesAndHints, checkStructuresFile } from "./check-reader.ts";
import { judgeTask } from "./judge-task.ts";

// "delete-item" -> "roles/delete-item"
export const folderOf = (name: string) => `roles/${name}`;

export const textAt = (files: readonly SourceFile[], path: string) =>
  files.find((file) => file.path === path)?.text;

// the YAML files directly in a folder, by slug: "roles/i/scenarios" -> [{slug: "a", text}]
export function slugsIn(
  files: readonly SourceFile[],
  folder: string,
): readonly { readonly slug: string; readonly text: string }[] {
  return files.flatMap(({ path, text }) => {
    const slug = path.startsWith(`${folder}/`)
      ? /^([^/]+)\.yaml$/.exec(path.slice(folder.length + 1))?.[1]
      : undefined;
    return slug === undefined ? [] : [{ slug, text }];
  });
}

// the evidence of a scenario, when it is there and parses
export function evidenceAt(
  files: readonly SourceFile[],
  name: string,
  slug: string,
): Evidence | undefined {
  const file = `${folderOf(name)}/evidence/${slug}.yaml`;
  const text = textAt(files, file);
  const read = text === undefined ? undefined : readYaml(file, text, evidenceSchema);
  return read !== undefined && "value" in read ? read.value : undefined;
}

// what a reader wrote for one interface, checked against what the common reader and the
// reader of the structures wrote
export function readerFilesOf(files: readonly SourceFile[], name: string) {
  const { common } = checkCommon(textAt(files, "roles/common.yaml"));
  const { structures } = checkStructuresFile(textAt(files, "structures.yaml"));
  const folder = folderOf(name);
  return {
    common,
    ...checkRulesAndHints({
      operation: name,
      common,
      structures,
      rules: textAt(files, `${folder}/rules.yaml`),
      hints: textAt(files, `${folder}/hints.yaml`),
    }),
  };
}

// what the builder wrote for one interface, checked; undefined when its reading does not pass
export function builtOf(
  files: readonly SourceFile[],
  bound: Interface,
  actors: readonly string[],
) {
  const { rules } = readerFilesOf(files, bound.interface);
  if (rules === undefined) return undefined;
  const folder = folderOf(bound.interface);
  return checkBuilt({
    bound,
    rules,
    actors,
    files: slugsIn(files, `${folder}/scenarios`),
  });
}

// the judgements of a folder as they are written, none when there is no file or it does
// not parse
export function judgementsIn(
  files: readonly SourceFile[],
  name: string,
): readonly Judgement[] {
  const file = `${folderOf(name)}/judgements.yaml`;
  const text = textAt(files, file);
  const read = text === undefined ? undefined : readYaml(file, text, judgementsSchema);
  return read !== undefined && "value" in read ? read.value.judgements : [];
}

// every evidence file of a folder, read: [{slug: "a", evidence}, {slug: "b", findings}]
export function recordingsRead(
  files: readonly SourceFile[],
  name: string,
): readonly (
  | { readonly slug: string; readonly evidence: Evidence }
  | { readonly slug: string; readonly findings: readonly string[] }
)[] {
  return slugsIn(files, `${folderOf(name)}/evidence`).map(({ slug, text }) => {
    const read = readYaml(`evidence/${slug}.yaml`, text, evidenceSchema);
    return "value" in read ? { slug, evidence: read.value } : { slug, ...read };
  });
}

// the task of one interface's judge on these recordings, when its reading passes and there
// is one at least
export function judgeTaskOf(
  files: readonly SourceFile[],
  bound: Interface,
  recordings: readonly { readonly slug: string; readonly evidence: Evidence }[],
) {
  const { common, rules } = readerFilesOf(files, bound.interface);
  if (rules === undefined || recordings.length === 0) return undefined;
  const task = judgeTask({ bound, common, rules, recordings });
  return { ...task, recordings };
}
