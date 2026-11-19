import { basename, join } from "node:path";
import { checkBuilt } from "../derive/check-built.ts";
import { checkCommon, checkStructuresFile } from "../derive/check-reader.ts";
import { placeOperations } from "../derive/placing.ts";
import { countJudged, judgeExtraction } from "../derive/provenance.ts";
import {
  folderOf,
  judgementsIn,
  readerFilesOf,
  slugsIn,
  textAt,
} from "../derive/roles-files.ts";
import { type ReadInterface, viewOfRoles } from "../derive/roles-view.ts";
import { parseExtraction, type SourceFile } from "../shapes/extraction.ts";
import {
  evidenceSchema,
  readYaml,
  roleScenarioSchema,
  rulesSchema,
} from "../shapes/roles.ts";
import { checkedExtraction, type Examination } from "./examine.ts";
// .txt: an .html import is a bundle to Bun and a document to lint for Biome
import page from "./view.html.txt" with { type: "text" };

const parsedValue = <T>(read: { readonly value: T } | { readonly findings: unknown }) =>
  "value" in read ? read.value : undefined;

// Every folder of the roles parsed, with what their checks say. The builder's check is run
// with the actors its scenarios name: the credentials are not read for a page.
function readingsOf(files: readonly SourceFile[]) {
  const { extraction } = parseExtraction(
    files.filter(({ path }) =>
      ["target.yaml", "interfaces.yaml", "structures.yaml"].includes(path),
    ),
  );
  const common = checkCommon(textAt(files, "roles/common.yaml"));
  const structures = checkStructuresFile(textAt(files, "structures.yaml"));
  const interfaces = extraction.interfaces.map((bound): ReadInterface => {
    const name = bound.interface;
    const folder = folderOf(name);
    const text = textAt(files, `${folder}/rules.yaml`);
    const rules =
      text === undefined
        ? undefined
        : parsedValue(readYaml("rules.yaml", text, rulesSchema));
    const written = slugsIn(files, `${folder}/scenarios`);
    const built =
      rules === undefined || written.length === 0
        ? { scenarios: [], findings: [] }
        : checkBuilt({
            bound,
            rules,
            actors: written.flatMap(
              ({ slug, text }) =>
                parsedValue(readYaml(slug, text, roleScenarioSchema))?.steps.flatMap(
                  ({ as }) => as ?? [],
                ) ?? [],
            ),
            files: written,
          });
    return {
      bound,
      rules,
      findings:
        text === undefined
          ? []
          : [...readerFilesOf(files, name).findings, ...built.findings],
      scenarios: built.scenarios,
      evidence: slugsIn(files, `${folder}/evidence`).flatMap(({ slug, text }) => {
        const evidence = parsedValue(readYaml(slug, text, evidenceSchema));
        return evidence === undefined ? [] : [{ slug, evidence }];
      }),
      judgements: judgementsIn(files, name),
    };
  });
  return {
    target: extraction.target,
    structures: extraction.structures,
    common: common.common,
    findings: [...structures.findings, ...common.findings.map((f) => `roles/${f}`)],
    interfaces,
  };
}

// What the page draws: the roles' reading when exspec/roles/ holds one that parses, the
// extraction and everything derived from it otherwise — the files, the problems and the
// gaps, every rule and trigger judged, and each operation filed under a structure.
export function dataOf(dir: string, files: readonly SourceFile[]) {
  const roles = readingsOf(files);
  if (roles.interfaces.some(({ rules }) => rules !== undefined)) {
    return { dir, name: basename(dir), ...viewOfRoles(roles) };
  }
  const { extraction, problems, gaps } = checkedExtraction(files);
  const judged = judgeExtraction(extraction);
  return {
    dir,
    name: basename(dir),
    extraction,
    problems,
    gaps,
    ...judged,
    counts: countJudged(judged),
    placed: placeOperations(extraction),
  };
}

// The data as one page. undefined: no exspec/ in dir. Nothing is written: the page is the
// command's output.
export async function pageOf({
  dir,
  exists,
  readFiles,
}: Examination): Promise<string | undefined> {
  if (!(await exists(join(dir, "exspec")))) return undefined;
  // "<" escaped: a body holding "</script>" does not end the page's data
  const json = JSON.stringify(dataOf(dir, await readFiles(dir))).replaceAll(
    "<",
    "\\u003c",
  );
  return page.replace("{{data}}", () => json);
}
