import { ownersOf } from "../derive/check-built.ts";
import { checkGathered } from "../derive/check-gathered.ts";
import {
  checkCommon,
  checkProtocol,
  checkStructuresFile,
} from "../derive/check-reader.ts";
import { serviceFileOf, servicesIn } from "../derive/check-service.ts";
import { folderOf, interfacesOf, readerFilesOf, textAt } from "../derive/roles-files.ts";
import { interfaceLeft, leftOf } from "../derive/roles-left.ts";
import { statesOf } from "../derive/states-files.ts";
import type { Event } from "../shapes/event.ts";
import type { SourceFile } from "../shapes/extraction.ts";
import type { Interface } from "../shapes/target.ts";
import { readsOf, under, writesOf } from "./access.ts";
import { inParallel } from "./pool.ts";
import {
  type RolesRun,
  type RolesSetting,
  roleJob,
  roleRounds,
  roleSkipped,
  rolesCommand,
} from "./roles.ts";

const tools = ["Read", "Glob", "Grep", "Write", "Edit"];

const rounds = 3;

// The reader of the structures reads the code and, of exspec/, its own file alone: the
// interfaces' description would let it write the structures without the code.
export const structuresReads = (dir: string) =>
  readsOf(dir, { checkout: true, allowed: (path) => path === "structures.yaml" });

function structuresReader(rolesRun: RolesRun): AsyncGenerator<Event, boolean> {
  const { dir, readFiles } = rolesRun;
  const own = "structures.yaml";
  return roleJob("structures-reader", undefined, () =>
    roleRounds({
      rolesRun,
      role: "structures-reader",
      name: undefined,
      rounds,
      session: {
        prompt:
          "Read the business concepts of the system checked out in your working directory, and write exspec/structures.yaml.",
        tools,
        mayRead: structuresReads(dir),
        mayWrite: writesOf(dir, (path) => path === own),
        confinement:
          "Of exspec/ this session reads only structures.yaml, and a search is given a folder of the checkout other than exspec/ as its path (src, for instance), never the root; it writes only exspec/structures.yaml.",
      },
      gate: async () => {
        return checkStructuresFile(textAt(await readFiles(dir), own)).findings;
      },
    }),
  );
}

function commonReader(rolesRun: RolesRun): AsyncGenerator<Event, boolean> {
  const { dir, readFiles } = rolesRun;
  const own = ["roles/common.yaml", "roles/protocol.yaml"];
  return roleJob("common-reader", undefined, () =>
    roleRounds({
      rolesRun,
      role: "common-reader",
      name: undefined,
      rounds,
      session: {
        prompt:
          "Read what holds for every operation of the system checked out in your working directory, and write exspec/roles/common.yaml and exspec/roles/protocol.yaml.",
        tools,
        mayRead: readsOf(dir, {
          checkout: true,
          allowed: (path) =>
            ["target.yaml", "interfaces.yaml", ...own].includes(path) ||
            under("target")(path),
        }),
        mayWrite: writesOf(dir, (path) => own.includes(path)),
        confinement:
          "Of exspec/ this session reads only target.yaml, interfaces.yaml, target/, roles/common.yaml and roles/protocol.yaml, and a search is given a folder of the checkout other than exspec/ as its path (src, for instance), never the root; it writes only exspec/roles/common.yaml and exspec/roles/protocol.yaml.",
      },
      gate: async () => {
        const files = await readFiles(dir);
        return [
          ...checkCommon(textAt(files, "roles/common.yaml")).findings,
          ...checkProtocol(textAt(files, "roles/protocol.yaml")).findings,
        ];
      },
    }),
  );
}

async function* reader(
  rolesRun: RolesRun,
  bound: Interface,
): AsyncGenerator<Event, boolean> {
  const { dir, only, readFiles } = rolesRun;
  const { interface: name, method, pattern } = bound;
  const files = await readFiles(dir);
  const left = interfaceLeft(files, bound);
  if (only === undefined && left.reading === "done") {
    return yield* roleSkipped("reader", name, "its rules and hints pass their check");
  }
  const folder = folderOf(name);
  const own = [`${folder}/rules.yaml`, `${folder}/hints.yaml`, `${folder}/trigger.yaml`];
  const services = servicesIn(files).map(({ service }) => serviceFileOf(service));
  return yield* roleJob("reader", name, () =>
    roleRounds({
      rolesRun,
      role: "reader",
      name,
      rounds,
      session: {
        prompt: [
          `The operation: ${name}, ${method.toUpperCase()} ${pattern}.`,
          `Your folder: exspec/${folder}/ — write rules.yaml, hints.yaml and trigger.yaml there; in rules.yaml, \`operation\` is ${name}; in trigger.yaml, \`trigger\`, \`interface\` and \`operation\` are ${name}.`,
          ...(services.length === 0
            ? []
            : [
                `The services this system rests on: ${services.map((file) => `exspec/${file}`).join(", ")}.`,
              ]),
        ].join("\n"),
        tools,
        mayRead: readsOf(dir, {
          checkout: true,
          allowed: (path) =>
            [
              "roles/common.yaml",
              "roles/protocol.yaml",
              "structures.yaml",
              ...own,
              ...services,
            ].includes(path),
        }),
        mayWrite: writesOf(dir, (path) => own.includes(path)),
        confinement: `Of exspec/ this session reads only roles/common.yaml, roles/protocol.yaml, structures.yaml, the three files of its folder and the services named, and a search is given a folder of the checkout other than exspec/ as its path (src, for instance), never the root; it writes only exspec/${folder}/rules.yaml, hints.yaml and trigger.yaml.`,
      },
      gate: async () => {
        return readerFilesOf(await readFiles(dir), name).findings;
      },
    }),
  );
}

// what the states' reader wrote, checked: the file's own findings, then what is asked of a
// gathered state against the rules of every operation read
function gatheredFindings(files: readonly SourceFile[]): readonly string[] {
  if (textAt(files, "states.yaml") === undefined) return ["states.yaml is not written"];
  const { states, findings } = statesOf(files);
  const rules = (interfacesOf(files) ?? []).flatMap(({ interface: name }) => {
    const { rules, trigger } = readerFilesOf(files, name);
    return rules === undefined || trigger === undefined
      ? []
      : ownersOf(rules, trigger.protocol ?? []).map((rule) => `${name}/${rule}`);
  });
  return [...findings, ...checkGathered({ states, rules })];
}

// roles/<operation>/rules.yaml and hints.yaml
const ruleOrHints = (path: string) => /^roles\/[^/]+\/(rules|hints)\.yaml$/.test(path);

// The states' reader reads exspec/ alone, never the code, and writes states.yaml once:
// when it is missing and every interface of interfaces.yaml is read, the selection or not.
async function* statesReader(rolesRun: RolesRun): AsyncGenerator<Event, boolean> {
  const { dir, readFiles } = rolesRun;
  const files = await readFiles(dir);
  const left = leftOf({ files, interfaces: interfacesOf(files) ?? [] });
  const unread = left.interfaces.filter(({ reading }) => reading !== "done").length;
  if (!left.states) {
    return yield* roleSkipped("states-reader", undefined, "states.yaml is written");
  }
  if (unread > 0) {
    return yield* roleSkipped(
      "states-reader",
      undefined,
      `${unread} operations are not read yet`,
    );
  }
  const own = "states.yaml";
  return yield* roleJob("states-reader", undefined, () =>
    roleRounds({
      rolesRun,
      role: "states-reader",
      name: undefined,
      rounds,
      session: {
        prompt:
          "Read exspec/structures.yaml, exspec/interfaces.yaml and the rules.yaml and hints.yaml of every folder of exspec/roles/, and write exspec/states.yaml.",
        tools,
        mayRead: readsOf(dir, {
          checkout: false,
          allowed: (path) =>
            ["structures.yaml", "interfaces.yaml", own, "roles/common.yaml"].includes(
              path,
            ) || ruleOrHints(path),
        }),
        mayWrite: writesOf(dir, (path) => path === own),
        confinement:
          "This session reads nothing of the code; of exspec/ it reads only structures.yaml, interfaces.yaml, states.yaml, roles/common.yaml and the rules.yaml and hints.yaml of each folder of roles/; it writes only exspec/states.yaml.",
      },
      gate: async () => gatheredFindings(await readFiles(dir)),
    }),
  );
}

// The structures first, then the common reading, each when it is missing or does not pass
// its check; then one reader per interface, `jobs` at a time; then the states' reader. The
// target is not started.
export async function* runReaders(
  rolesRun: RolesRun,
  { interfaces }: RolesSetting,
): AsyncGenerator<Event, boolean> {
  const { dir, jobs, readFiles } = rolesRun;
  const read = !leftOf({ files: await readFiles(dir), interfaces: [] }).structures
    ? yield* roleSkipped(
        "structures-reader",
        undefined,
        "structures.yaml passes its check",
      )
    : yield* structuresReader(rolesRun);
  if (!read) return false;
  const ready = !leftOf({ files: await readFiles(dir), interfaces: [] }).common
    ? yield* roleSkipped("common-reader", undefined, "common.yaml passes its check")
    : yield* commonReader(rolesRun);
  if (!ready) return false;
  yield { type: "roles-queued", role: "reader", count: interfaces.length };
  const done = yield* inParallel(
    interfaces.map((bound) => () => reader(rolesRun, bound)),
    jobs,
  );
  if (!done.every(Boolean)) return false;
  return yield* statesReader(rolesRun);
}

export function rolesRead(rolesRun: RolesRun): AsyncGenerator<Event> {
  return rolesCommand("roles-read", rolesRun, (setting) => runReaders(rolesRun, setting));
}
