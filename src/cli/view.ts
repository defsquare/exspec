import { basename, join } from "node:path";
import { checkBuilt } from "../derive/check-built.ts";
import { checkProvider, providerFolderOf } from "../derive/check-provider.ts";
import {
  checkCommon,
  checkProtocol,
  checkStructuresFile,
} from "../derive/check-reader.ts";
import { checkService, servicesIn } from "../derive/check-service.ts";
import { placeOperations } from "../derive/placing.ts";
import { countJudged, judgeExtraction } from "../derive/provenance.ts";
import {
  actorsNamed,
  callablesOf,
  folderOf,
  judgementsIn,
  readerFilesOf,
  slugsIn,
  statesOf,
  textAt,
} from "../derive/roles-files.ts";
import { actorsOf, type ReadInterface, viewOfRoles } from "../derive/roles-view.ts";
import { type ReadProvider, viewOfServices } from "../derive/services-view.ts";
import { pathsOf, statesWithPathIn } from "../derive/states-files.ts";
import { triggerSchema } from "../shapes/bindings.ts";
import { parseExtraction, type SourceFile } from "../shapes/extraction.ts";
import { providerSchema } from "../shapes/provider.ts";
import { evidenceSchema, readYaml, rulesSchema } from "../shapes/roles.ts";
import { interfacesFileSchema } from "../shapes/target.ts";
import { checkedExtraction, type Examination } from "./examine.ts";
// .txt: an .html import is a bundle to Bun and a document to lint for Biome
import page from "./view.html.txt" with { type: "text" };

const parsedValue = <T>(read: { readonly value: T } | { readonly findings: unknown }) =>
  "value" in read ? read.value : undefined;

// The providers of exspec/providers/, those whose provider.yaml parses, and what the checks
// of the services and the providers say, each "file: message" relative to exspec/. A
// provider's finding on the service it renders is the service's own, told once.
function readAndCheckProviders(files: readonly SourceFile[]) {
  const names = [
    ...new Set(
      files.flatMap(({ path }) => /^providers\/([^/]+)\//.exec(path)?.[1] ?? []),
    ),
  ];
  const ofServices = files.flatMap(({ path }) => {
    const name = /^services\/([^/]+)\.yaml$/.exec(path)?.[1];
    return name === undefined ? [] : checkService(files, name).findings;
  });
  const ofProviders = names.flatMap((name) =>
    checkProvider(files, name)
      .findings.filter((finding) => !ofServices.includes(finding))
      .map((finding) =>
        finding.startsWith("services/")
          ? finding
          : `${providerFolderOf(name)}/${finding}`,
      ),
  );
  const providers = names.flatMap((name): readonly ReadProvider[] => {
    const text = textAt(files, `${providerFolderOf(name)}/provider.yaml`);
    const provider =
      text === undefined ? undefined : parsedValue(readYaml(name, text, providerSchema));
    if (provider === undefined) return [];
    const interfaces = textAt(files, `${providerFolderOf(name)}/interfaces.yaml`);
    const read =
      interfaces === undefined
        ? undefined
        : parsedValue(readYaml(name, interfaces, interfacesFileSchema));
    return [{ provider, interfaces: read?.interfaces ?? [] }];
  });
  return { providers, findings: [...ofServices, ...ofProviders] };
}

// Every folder of the roles parsed, with what their checks say. The builder's check is run
// with the actors its scenarios name: the credentials are not read for a page.
function readingsOf(files: readonly SourceFile[]) {
  const { extraction } = parseExtraction(
    files.filter(({ path }) =>
      ["target.yaml", "interfaces.yaml", "structures.yaml"].includes(path),
    ),
  );
  const common = checkCommon(textAt(files, "roles/common.yaml"));
  const protocol = checkProtocol(textAt(files, "roles/protocol.yaml"));
  const structures = checkStructuresFile(textAt(files, "structures.yaml"));
  const { providers, findings } = readAndCheckProviders(files);
  const callables = callablesOf(files);
  const states = statesOf(files);
  const {
    paths,
    unreached,
    findings: ofPaths,
    gaps: unreachedGaps,
  } = pathsOf(files, states.states);
  const interfaces = extraction.interfaces.map((bound): ReadInterface => {
    const name = bound.interface;
    const folder = folderOf(name);
    const text = textAt(files, `${folder}/rules.yaml`);
    const rules =
      text === undefined
        ? undefined
        : parsedValue(readYaml("rules.yaml", text, rulesSchema));
    const triggerText = textAt(files, `${folder}/trigger.yaml`);
    const trigger =
      triggerText === undefined
        ? undefined
        : parsedValue(readYaml("trigger.yaml", triggerText, triggerSchema));
    const written = slugsIn(files, `${folder}/scenarios`);
    const built =
      rules === undefined || written.length === 0
        ? { scenarios: [], findings: [] }
        : checkBuilt({
            bound,
            rules,
            protocol: trigger?.protocol ?? [],
            actors: actorsNamed(written),
            services: servicesIn(files),
            callables,
            paths,
            unreached,
            states: statesWithPathIn(states.states, name),
            files: written,
          });
    return {
      bound,
      rules,
      trigger,
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
    protocol: protocol.protocol,
    findings: [
      ...structures.findings,
      ...states.findings,
      ...ofPaths,
      ...[...common.findings, ...protocol.findings].map((f) => `roles/${f}`),
      ...findings,
    ],
    gaps: unreachedGaps,
    interfaces,
    services: servicesIn(files),
    providers,
  };
}

// What the page draws: the roles' reading when exspec/roles/ holds one that parses, the
// extraction and everything derived from it otherwise — the files, the problems and the
// gaps, every rule and trigger judged, and each operation filed under a structure.
export function dataOf(dir: string, files: readonly SourceFile[]) {
  const { services, providers, ...roles } = readingsOf(files);
  if (roles.interfaces.some(({ rules }) => rules !== undefined)) {
    const view = viewOfRoles(roles);
    return {
      dir,
      name: basename(dir),
      ...view,
      services: viewOfServices({
        services,
        providers,
        operations: view.extraction.operations.map(({ operation }) => operation),
        scenarios: view.extraction.scenarios,
      }),
      actors: actorsOf(view.extraction.scenarios),
    };
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
