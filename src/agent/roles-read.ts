import { checkCommon, checkStructuresFile } from "../derive/check-reader.ts";
import type { Event } from "../shapes/event.ts";
import type { Interface } from "../shapes/target.ts";
import { readsOf, under, writesOf } from "./access.ts";
import { inParallel } from "./pool.ts";
import {
  folderOf,
  type RolesRun,
  readerFilesOf,
  roleJob,
  roleRounds,
  roleSkipped,
  rolesCommand,
  textAt,
} from "./roles.ts";

const tools = ["Read", "Glob", "Grep", "Write", "Edit"];

const rounds = 3;

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
          "Read the business concepts of the system checked out in your working directory, and write specimen/structures.yaml.",
        tools,
        mayRead: readsOf(dir, {
          checkout: true,
          allowed: (path) => ["interfaces.yaml", own].includes(path),
        }),
        mayWrite: writesOf(dir, (path) => path === own),
        confinement:
          "Of specimen/ this session reads only interfaces.yaml and structures.yaml, and a search runs in a folder that holds nothing else of specimen/; it writes only specimen/structures.yaml.",
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
          "Read what holds for every operation of the system checked out in your working directory, and write specimen/roles/common.yaml.",
        tools,
        mayRead: readsOf(dir, {
          checkout: true,
          allowed: (path) =>
            ["target.yaml", "interfaces.yaml", own].includes(path) ||
            under("target")(path),
        }),
        mayWrite: writesOf(dir, (path) => path === own),
        confinement:
          "Of specimen/ this session reads only target.yaml, interfaces.yaml, target/ and roles/common.yaml, and a search runs in a folder that holds nothing else of specimen/; it writes only specimen/roles/common.yaml.",
      },
      gate: async () => {
        return checkCommon(textAt(await readFiles(dir), own)).findings;
      },
    }),
  );
}

async function* reader(
  rolesRun: RolesRun,
  { interface: name, method, pattern }: Interface,
): AsyncGenerator<Event, boolean> {
  const { dir, only, readFiles } = rolesRun;
  if (
    only === undefined &&
    readerFilesOf(await readFiles(dir), name).findings.length === 0
  ) {
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
          `Your folder: specimen/${folder}/ — write rules.yaml and hints.yaml there; in rules.yaml, \`operation\` is ${name}.`,
        ].join("\n"),
        tools,
        mayRead: readsOf(dir, {
          checkout: true,
          allowed: (path) =>
            ["roles/common.yaml", "structures.yaml", ...own].includes(path),
        }),
        mayWrite: writesOf(dir, (path) => own.includes(path)),
        confinement: `Of specimen/ this session reads only roles/common.yaml, structures.yaml and the two files of its folder, and a search runs in a folder that holds nothing else of specimen/; it writes only specimen/${folder}/rules.yaml and hints.yaml.`,
      },
      gate: async () => {
        return readerFilesOf(await readFiles(dir), name).findings;
      },
    }),
  );
}

// The structures first, then the common reading, each when it is missing or does not pass
// its check; then one reader per interface, `jobs` at a time. The target is not started.
export function rolesRead(rolesRun: RolesRun): AsyncGenerator<Event> {
  const { dir, jobs, readFiles } = rolesRun;
  return rolesCommand("roles-read", rolesRun, async function* ({ interfaces }) {
    const structures = checkStructuresFile(
      textAt(await readFiles(dir), "structures.yaml"),
    );
    const read =
      structures.findings.length === 0
        ? yield* roleSkipped(
            "structures-reader",
            undefined,
            "structures.yaml passes its check",
          )
        : yield* structuresReader(rolesRun);
    if (!read) return false;
    const common = checkCommon(textAt(await readFiles(dir), "roles/common.yaml"));
    const ready =
      common.findings.length === 0
        ? yield* roleSkipped("common-reader", undefined, "common.yaml passes its check")
        : yield* commonReader(rolesRun);
    if (!ready) return false;
    const done = yield* inParallel(
      interfaces.map((bound) => () => reader(rolesRun, bound)),
      jobs,
    );
    return done.every(Boolean);
  });
}
