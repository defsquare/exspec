import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { changesOf, drawingsOf, modelSchema } from "./metamodel/draw.ts";

// bun scripts/metamodel.ts                           docs/metamodel/*.svg, from docs/metamodel.yaml
// bun scripts/metamodel.ts --since <rev> --out <dir> the same drawings, what changed since
//                                                    <rev> coloured, and a line a change
const source = "docs/metamodel.yaml";
const { values } = parseArgs({
  options: { since: { type: "string" }, out: { type: "string" } },
});
const read = (text: string) => modelSchema.parse(Bun.YAML.parse(text));

const model = read(await Bun.file(source).text());
if (values.since !== undefined && values.out === undefined) {
  console.error("--since draws a comparison: say where with --out <dir>");
  process.exit(2);
}
const base =
  values.since === undefined
    ? undefined
    : read(await Bun.$`git show ${`${values.since}:${source}`}`.text());
const out = values.out ?? "docs/metamodel";
await mkdir(out, { recursive: true });
for (const { name, svg } of drawingsOf(model, base)) {
  await Bun.write(join(out, `${name}.svg`), svg);
}
if (base !== undefined) {
  const changes = changesOf(model, base);
  console.log(changes.length === 0 ? "nothing changed" : changes.join("\n"));
}
