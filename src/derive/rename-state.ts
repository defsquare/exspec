import type { z } from "zod";
import type { SourceFile } from "../shapes/extraction.ts";
import {
  judgementsSchema,
  readYaml,
  roleScenarioSchema,
  ruleName,
} from "../shapes/roles.ts";
import { statesFileSchema } from "../shapes/state.ts";
import { deepEqual } from "./json.ts";

// `state: s` as a key and its value, quoted or not: "state: s", "{state: \"s\", …}"; s is
// a state's name, lower-case words joined by dashes
const stateKey = (name: string) =>
  new RegExp(`(\\bstate:[ \\t]*)(["']?)${name}\\2(?=[\\s,}\\]#]|$)`, "g");

type Rewritten =
  | { readonly path: string; readonly text: string }
  | { readonly path: string; readonly refused: string };

// One file's text with `state: from` rewritten `state: to`, when the file as parsed cites
// the state; the text parsed back must be what `renamed` says the file becomes, or it is
// refused. A file that does not parse is refused when its text names the state.
function rewrite<T>({
  path,
  text,
  schema,
  cites,
  renamed,
  from,
  to,
}: {
  readonly path: string;
  readonly text: string;
  readonly schema: z.ZodType<T>;
  readonly cites: (value: T) => boolean;
  readonly renamed: (value: T) => T;
  readonly from: string;
  readonly to: string;
}): readonly Rewritten[] {
  const read = readYaml(path, text, schema);
  if (!("value" in read)) {
    return stateKey(from).test(text)
      ? [{ path, refused: `${path} does not parse: ${read.findings.join("; ")}` }]
      : [];
  }
  if (!cites(read.value)) return [];
  const after = text.replace(stateKey(from), `$1$2${to}$2`);
  const reread = readYaml(path, after, schema);
  return "value" in reread && deepEqual(reread.value, renamed(read.value))
    ? [{ path, text: after }]
    : [{ path, refused: `${path}: "${from}" is written there other than as a state` }];
}

// What each file a state's name is written in becomes, the name changed; only an entry
// told by the key `state` changes:
//   states.yaml              [{state: s, …}]                                  -> state: t
//   operations/f/scenarios/a.yaml {steps: [{when: arrange, state: s, name: p}, …]} -> state: t
//   operations/f/judgements.yaml  {judgements: [{scenario: a, state: s, …}]} -> state: t
function rewriteFile(
  { path, text }: SourceFile,
  from: string,
  to: string,
): readonly Rewritten[] {
  const named = { path, text, from, to };
  if (path === "states.yaml") {
    return rewrite({
      ...named,
      schema: statesFileSchema,
      cites: (states) => states.some(({ state }) => state === from),
      renamed: (states) =>
        states.map((one) => (one.state === from ? { ...one, state: to } : one)),
    });
  }
  if (/^operations\/[^/]+\/scenarios\/[^/]+\.yaml$/.test(path)) {
    return rewrite({
      ...named,
      schema: roleScenarioSchema,
      cites: ({ steps }) => steps.some((step) => "state" in step && step.state === from),
      renamed: (scenario) => ({
        ...scenario,
        steps: scenario.steps.map((step) =>
          "state" in step && step.state === from ? { ...step, state: to } : step,
        ),
      }),
    });
  }
  if (/^operations\/[^/]+\/judgements\.yaml$/.test(path)) {
    return rewrite({
      ...named,
      schema: judgementsSchema,
      cites: ({ judgements }) => judgements.some((j) => "state" in j && j.state === from),
      renamed: (file) => ({
        ...file,
        judgements: file.judgements.map((j) =>
          "state" in j && j.state === from ? { ...j, state: to } : j,
        ),
      }),
    });
  }
  return [];
}

// The files that change when a state is renamed, their text rewritten where the name is
// the value of `state` and kept everywhere else; or why it is refused, nothing changed. A
// request's body holding a field `state: s` in a scenario that starts from s would be
// rewritten with it: the rewrite parsed back differs, and the rename is refused.
//   s -> t  ->  {files: [{path: "states.yaml", text: "- state: t …"}, {path: "operations/f/judgements.yaml", …}]}
export function renameState({
  files,
  from,
  to,
}: {
  readonly files: readonly SourceFile[];
  readonly from: string;
  readonly to: string;
}): { readonly files: readonly SourceFile[] } | { readonly refused: string } {
  const text = files.find(({ path }) => path === "states.yaml")?.text;
  if (text === undefined) return { refused: "there is no states.yaml" };
  const states = readYaml("states.yaml", text, statesFileSchema);
  if (!("value" in states)) {
    return { refused: `states.yaml does not parse: ${states.findings.join("; ")}` };
  }
  const named = states.value.map(({ state }) => state);
  if (!named.includes(from))
    return { refused: `"${from}" is not a state of states.yaml` };
  if (named.includes(to)) return { refused: `"${to}" is a state of states.yaml already` };
  if (!ruleName.safeParse(to).success) {
    return { refused: `"${to}" is not a name: lower-case words joined by dashes` };
  }
  const rewritten = files.flatMap((file) => rewriteFile(file, from, to));
  const refused = rewritten.flatMap((one) => ("refused" in one ? [one.refused] : []));
  if (refused.length > 0) return { refused: refused.join("; ") };
  return { files: rewritten.flatMap((one) => ("text" in one ? [one] : [])) };
}
