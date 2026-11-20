// For an extraction made before ADR-0024: every request step a call says exactly, written as that call.
//   bun scripts/migrations/0024-requests-to-calls.ts <dir>  (rewrites the scenarios of <dir> in place; run again, it changes nothing)
import type { Callable } from "../../src/derive/callables.ts";
import { flowYaml } from "../../src/derive/flow-yaml.ts";
import { deepEqual } from "../../src/derive/json.ts";
import { callablesOf } from "../../src/derive/roles-files.ts";
import { stepsConverted } from "../../src/derive/steps-as-calls.ts";
import { readExtractionFiles, writeExtractionFile } from "../../src/io/files.ts";
import {
  readYaml,
  roleScenarioSchema,
  type Step,
  stepSchema,
} from "../../src/shapes/roles.ts";

// The text with each changed step's line written anew, when every step is one line
// `  - {…}` under `steps:`; the whole scenario written again otherwise.
function rewritten(
  text: string,
  before: readonly Step[],
  after: readonly Step[],
  whole: () => string,
): string {
  const lines = text.split("\n");
  const at = lines.indexOf("steps:");
  const stepLines = lines.slice(at + 1, at + 1 + before.length);
  const oneLineEach =
    at !== -1 &&
    stepLines.length === before.length &&
    stepLines.every((line, i) => {
      if (!/^ {2}- \{.*\}\s*$/.test(line)) return false;
      const parsed = readYaml("step", line.trim().slice(2), stepSchema);
      return "value" in parsed && deepEqual(parsed.value, before[i]);
    });
  if (!oneLineEach) return whole();
  return lines
    .map((line, n) => {
      const i = n - at - 1;
      const step = after[i];
      return i < 0 || step === undefined || deepEqual(step, before[i])
        ? line
        : `  - ${flowYaml(step)}`;
    })
    .join("\n");
}

// one scenario file converted: its new text, nothing when no step changed, or why it is left
export function scenarioConverted(
  file: string,
  text: string,
  callables: readonly Callable[],
):
  | { readonly text: string }
  | { readonly unchanged: true }
  | { readonly left: readonly string[] } {
  const read = readYaml(file, text, roleScenarioSchema);
  if (!("value" in read)) return { left: read.findings };
  const scenario = read.value;
  const { steps, converted, conflicts } = stepsConverted(scenario.steps, callables);
  if (converted === 0) return { unchanged: true };
  if (conflicts.length > 0) return { left: conflicts.map((c) => `${file}: ${c}`) };
  const next = rewritten(text, scenario.steps, steps, () =>
    Bun.YAML.stringify({ ...scenario, steps }, null, 2),
  );
  const back = readYaml(file, next, roleScenarioSchema);
  return "value" in back && deepEqual(back.value, { ...scenario, steps })
    ? { text: next }
    : { left: [`${file}: written again, it does not read back as its steps converted`] };
}

if (import.meta.main) {
  const [dir] = process.argv.slice(2);
  if (dir === undefined) {
    console.error("usage: bun scripts/migrations/0024-requests-to-calls.ts <dir>");
    process.exit(2);
  }
  const files = await readExtractionFiles(dir);
  const callables = callablesOf(files);
  const scenarios = files.filter(({ path }) =>
    /^roles\/[^/]+\/scenarios\/[^/]+\.yaml$/.test(path),
  );
  const rewrittenFiles: string[] = [];
  const left: string[] = [];
  for (const { path, text } of scenarios) {
    const done = scenarioConverted(path, text, callables);
    if ("text" in done) {
      await writeExtractionFile(dir, path, done.text);
      rewrittenFiles.push(path);
    } else if ("left" in done) {
      left.push(...done.left);
    }
  }
  console.error(`\nrewritten: ${rewrittenFiles.length} of ${scenarios.length} scenarios`);
  for (const path of rewrittenFiles) console.error(`  ${path}`);
  console.error(`left: ${left.length}`);
  for (const why of left) console.error(`  ${why}`);
}
