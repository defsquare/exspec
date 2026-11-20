import type { SourceFile } from "../shapes/extraction.ts";
import { readYaml } from "../shapes/roles.ts";
import { type Service, serviceSchema } from "../shapes/service.ts";
import { twice } from "./check-reader.ts";

// "s" -> "services/s.yaml"
export const serviceFileOf = (name: string) => `services/${name}.yaml`;

// What was written of one service, checked. A finding is a line its writer can fix:
//   "services/s.yaml: the condition \"a\" is declared twice"
export function checkService(
  files: readonly SourceFile[],
  name: string,
): { readonly service?: Service; readonly findings: readonly string[] } {
  const file = serviceFileOf(name);
  const text = files.find(({ path }) => path === file)?.text;
  if (text === undefined) return { findings: [`${file}: missing`] };
  const read = readYaml(file, text, serviceSchema);
  if (!("value" in read)) return read;
  const service = read.value;
  const findings = [
    ...(service.service === name
      ? []
      : [`${file}: service is "${service.service}", the service is "${name}"`]),
    ...twice(service.conditions.map(({ condition }) => condition)).map(
      (condition) => `${file}: the condition "${condition}" is declared twice`,
    ),
  ];
  return findings.length === 0 ? { service, findings } : { findings };
}

// every service of exspec/services/ that passes its check
export const servicesIn = (files: readonly SourceFile[]): readonly Service[] =>
  files.flatMap(({ path }) => {
    const name = /^services\/([^/]+)\.yaml$/.exec(path)?.[1];
    const service = name === undefined ? undefined : checkService(files, name).service;
    return service === undefined ? [] : [service];
  });
