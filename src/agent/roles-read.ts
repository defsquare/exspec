import { checkCommon, checkStructuresFile } from "../derive/check-reader.ts";
import { folderOf, readerFilesOf, textAt } from "../derive/roles-files.ts";
import { interfaceLeft, leftOf } from "../derive/roles-left.ts";
import type { Event } from "../shapes/event.ts";
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
  const own = "roles/common.yaml";
  return roleJob("common-reader", undefined, () =>
    roleRounds({
      rolesRun,
      role: "common-reader",
      name: undefined,
      rounds,
      session: {
        prompt:
          "Read what holds for every operation of the system checked out in your working directory, and write exspec/roles/common.yaml.",
        tools,
        mayRead: readsOf(dir, {
          checkout: true,
          allowed: (path) =>
            ["target.yaml", "interfaces.yaml", own].includes(path) ||
            under("target")(path),
        }),
        mayWrite: writesOf(dir, (path) => path === own),
        confinement:
          "Of exspec/ this session reads only target.yaml, interfaces.yaml, target/ and roles/common.yaml, and a search is given a folder of the checkout other than exspec/ as its path (src, for instance), never the root; it writes only exspec/roles/common.yaml.",
      },
      gate: async () => {
        return checkCommon(textAt(await readFiles(dir), own)).findings;
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
  const left = interfaceLeft(await readFiles(dir), bound);
  if (only === undefined && left.reading === "done") {
    return yield* roleSkipped("reader", name, "its rules and hints pass their check");
  }
  const folder = folderOf(name);
  const own = [`${folder}/rules.yaml`, `${folder}/hints.yaml`];
  return yield* roleJob("reader", name, () =>
    roleRounds({
      rolesRun,
      role: "reader",
      name,
      rounds,
      session: {
        prompt: [
          `The operation: ${name}, ${method.toUpperCase()} ${pattern}.`,
          `Your folder: exspec/${folder}/ — write rules.yaml and hints.yaml there; in rules.yaml, \`operation\` is ${name}.`,
        ].join("\n"),
        tools,
        mayRead: readsOf(dir, {
          checkout: true,
          allowed: (path) =>
            ["roles/common.yaml", "structures.yaml", ...own].includes(path),
        }),
        mayWrite: writesOf(dir, (path) => own.includes(path)),
        confinement: `Of exspec/ this session reads only roles/common.yaml, structures.yaml and the two files of its folder, and a search is given a folder of the checkout other than exspec/ as its path (src, for instance), never the root; it writes only exspec/${folder}/rules.yaml and hints.yaml.`,
      },
      gate: async () => {
        return readerFilesOf(await readFiles(dir), name).findings;
      },
    }),
  );
}

// The structures first, then the common reading, each when it is missing or does not pass
// its check; then one reader per interface, `jobs` at a time. The target is not started.
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
  return done.every(Boolean);
}

export function rolesRead(rolesRun: RolesRun): AsyncGenerator<Event> {
  return rolesCommand("roles-read", rolesRun, (setting) => runReaders(rolesRun, setting));
}
