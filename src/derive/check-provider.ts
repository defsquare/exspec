import type { SourceFile } from "../shapes/extraction.ts";
import { providerSchema } from "../shapes/provider.ts";
import { readYaml } from "../shapes/roles.ts";
import { interfacesFileSchema } from "../shapes/target.ts";
import { checkInterfaces } from "./check-interfaces.ts";
import { twice } from "./check-reader.ts";
import { checkService } from "./check-service.ts";
import { textAt } from "./roles-files.ts";

// "p" -> "providers/p"
export const providerFolderOf = (name: string) => `providers/${name}`;

// the other providers whose provider.yaml says they render that service
function alsoRendering(files: readonly SourceFile[], name: string, service: string) {
  return files.flatMap(({ path, text }) => {
    const [, other] = /^providers\/([^/]+)\/provider\.yaml$/.exec(path) ?? [];
    if (other === undefined || other === name) return [];
    const read = readYaml("provider.yaml", text, providerSchema);
    return "value" in read && read.value.renders === service ? [other] : [];
  });
}

// What the provider reader wrote for one provider, checked before a twin is written from
// it; the service it renders must pass its own check. A finding is a line the reader can
// fix:
//   "provider.yaml: the expectation \"a\" is on \"b\", which interfaces.yaml does not declare"
// renders: the service rendered, when provider.yaml parses
export function checkProvider(
  files: readonly SourceFile[],
  name: string,
): { readonly renders?: string; readonly findings: readonly string[] } {
  const folder = providerFolderOf(name);
  const interfacesText = textAt(files, `${folder}/interfaces.yaml`);
  const providerText = textAt(files, `${folder}/provider.yaml`);
  const interfaces =
    interfacesText === undefined
      ? { findings: ["interfaces.yaml: missing"] }
      : readYaml("interfaces.yaml", interfacesText, interfacesFileSchema);
  const provider =
    providerText === undefined
      ? { findings: ["provider.yaml: missing"] }
      : readYaml("provider.yaml", providerText, providerSchema);
  const declared =
    "value" in interfaces
      ? new Set(interfaces.value.interfaces.map(({ interface: one }) => one))
      : undefined;
  return {
    ...("value" in provider ? { renders: provider.value.renders } : {}),
    findings: [
      ...("value" in interfaces
        ? [
            ...checkInterfaces(interfaces.value).map(
              ({ file, at, message }) => `${file}: ${at}: ${message}`,
            ),
            ...(interfaces.value.interfaces.length === 0
              ? ["interfaces.yaml: no interface is declared"]
              : []),
          ]
        : interfaces.findings),
      ...("value" in provider
        ? [
            ...(provider.value.provider === name
              ? []
              : [
                  `provider.yaml: provider is "${provider.value.provider}", the provider is "${name}"`,
                ]),
            ...checkService(files, provider.value.renders).findings,
            ...alsoRendering(files, name, provider.value.renders).map(
              (other) =>
                `provider.yaml: "${provider.value.renders}" is rendered by "${other}" too: a service has one provider`,
            ),
            ...twice(provider.value.expects.map((one) => one.expect)).map(
              (name) => `provider.yaml: the expectation "${name}" is declared twice`,
            ),
            ...(declared === undefined
              ? []
              : provider.value.expects
                  .filter(({ on }) => !declared.has(on))
                  .map(
                    ({ expect, on }) =>
                      `provider.yaml: the expectation "${expect}" is on "${on}", which interfaces.yaml does not declare`,
                  )),
          ]
        : provider.findings),
    ],
  };
}
