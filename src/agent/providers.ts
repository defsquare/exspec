import { checkProvider, providerFolderOf } from "../derive/check-provider.ts";
import { checkService, serviceFileOf } from "../derive/check-service.ts";
import { textAt } from "../derive/roles-files.ts";
import { valueOfShape } from "../derive/shape-value.ts";
import type { Event } from "../shapes/event.ts";
import type { SourceFile } from "../shapes/extraction.ts";
import type { Observable } from "../shapes/target.ts";
import { readsOf, under, writesOf } from "./access.ts";
import { inParallel } from "./pool.ts";
import {
  providersCommand,
  type RolesRun,
  roleJob,
  roleRounds,
  roleSkipped,
} from "./roles.ts";

const tools = ["Read", "Glob", "Grep", "Write", "Edit"];

const rounds = 3;

const serveFile = "providers/serve.ts";

// services/<name>.yaml, of any service
const serviceFile = (path: string) => /^services\/[^/]+\.yaml$/.test(path);

async function* providerReader(
  rolesRun: RolesRun,
  { observable: name }: Observable,
): AsyncGenerator<Event, boolean> {
  const { dir, only, readFiles } = rolesRun;
  if (
    only === undefined &&
    checkProvider(await readFiles(dir), name).findings.length === 0
  ) {
    return yield* roleSkipped(
      "provider-reader",
      name,
      "its interfaces and expectations pass their check",
    );
  }
  const folder = providerFolderOf(name);
  const own = [`${folder}/interfaces.yaml`, `${folder}/provider.yaml`];
  return yield* roleJob("provider-reader", name, () =>
    roleRounds({
      rolesRun,
      role: "provider-reader",
      name,
      rounds,
      session: {
        prompt: [
          `The system it calls: ${name}.`,
          "The system checked out in your working directory is pointed at it by its configuration: exspec/target.yaml and exspec/target/.",
          `Your folder: exspec/${folder}/ — write interfaces.yaml and provider.yaml there; in provider.yaml, \`provider\` is ${name}.`,
          "The service it renders: exspec/services/<service>.yaml, extended when it is there.",
        ].join("\n"),
        tools,
        // whatever --effort says: below, a reader stops at the client module
        effort: "high",
        mayRead: readsOf(dir, {
          checkout: true,
          allowed: (path) =>
            path === "target.yaml" ||
            under("target")(path) ||
            own.includes(path) ||
            serviceFile(path),
        }),
        mayWrite: writesOf(dir, (path) => own.includes(path) || serviceFile(path)),
        confinement: `Of exspec/ this session reads only target.yaml, target/, the two files of its folder and services/; a search is given a folder of the checkout other than exspec/ as its path (src, for instance), never the root; it writes only exspec/${folder}/interfaces.yaml and provider.yaml, and exspec/services/<service>.yaml.`,
      },
      gate: async () => checkProvider(await readFiles(dir), name).findings,
    }),
  );
}

// The twin served: its state read, put back and read again, the same state; then each
// condition of the service it renders given on a fresh state, with a value for each
// parameter it takes, answered 200. A finding for each that is not so. A condition may
// leave a fresh state as it is: nothing is kept yet when what is kept is forgotten.
async function twinGate({ dir, io, readFiles }: RolesRun, name: string) {
  if (io.tryTwin === undefined) return ["no twin can be served here"];
  const files = await readFiles(dir);
  const { renders } = checkProvider(files, name);
  const service =
    renders === undefined ? undefined : checkService(files, renders).service;
  const conditions = (service?.conditions ?? []).map(({ condition, takes = {} }) => ({
    condition,
    with: Object.fromEntries(
      Object.entries(takes).map(([key, shape]) => [key, valueOfShape(shape)]),
    ),
  }));
  const trial = await io.tryTwin(dir, name, conditions);
  if ("failed" in trial) {
    return [`exspec/${serveFile} did not serve the twin: ${trial.failed}`];
  }
  const { fresh, again, given } = trial;
  return [
    ...(Bun.deepEquals(fresh, again)
      ? []
      : [
          `GET /__state answered ${JSON.stringify(fresh)}; PUT back, GET /__state answered ${JSON.stringify(again)}`,
        ]),
    ...given.flatMap(({ status, state }, i) =>
      status === 200
        ? []
        : [
            `PUT /__given ${JSON.stringify(conditions[i])} answered ${status}: ${JSON.stringify(state)}`,
          ],
    ),
  ];
}

// why a twin writer has nothing to do, undefined when it has
function twinWriterSkip(
  { only }: RolesRun,
  files: readonly SourceFile[],
  name: string,
): string | undefined {
  if (checkProvider(files, name).findings.length > 0) {
    return "its interfaces and expectations do not pass their check";
  }
  return only === undefined &&
    textAt(files, `${providerFolderOf(name)}/twin.ts`) !== undefined
    ? "its twin is written"
    : undefined;
}

async function* twinWriter(
  rolesRun: RolesRun,
  { observable: name }: Observable,
): AsyncGenerator<Event, boolean> {
  const { dir, readFiles } = rolesRun;
  const files = await readFiles(dir);
  const skip = twinWriterSkip(rolesRun, files, name);
  if (skip !== undefined) return yield* roleSkipped("twin-writer", name, skip);
  const folder = providerFolderOf(name);
  // the check passed: the provider renders a service
  const service = serviceFileOf(checkProvider(files, name).renders ?? "");
  const reads = [
    ...["interfaces.yaml", "provider.yaml", "twin.ts"].map((file) => `${folder}/${file}`),
    service,
  ];
  const own = `${folder}/twin.ts`;
  return yield* roleJob("twin-writer", name, () =>
    roleRounds({
      rolesRun,
      role: "twin-writer",
      name,
      rounds,
      session: {
        prompt: [
          `The system: ${name}.`,
          `Your folder: exspec/${folder}/ — interfaces.yaml and provider.yaml are there; write twin.ts there.`,
          `The service it renders: exspec/${service}.`,
        ].join("\n"),
        tools,
        mayRead: readsOf(dir, {
          checkout: false,
          allowed: (path) => reads.includes(path),
        }),
        mayWrite: writesOf(dir, (path) => path === own),
        confinement: `This session reads only interfaces.yaml, provider.yaml and twin.ts in exspec/${folder}/, and exspec/${service}; it writes only twin.ts there.`,
      },
      gate: () => twinGate(rolesRun, name),
    }),
  );
}

// One reader per provider, `jobs` at a time. The target is not started.
export async function* runProviderReaders(
  rolesRun: RolesRun,
  providers: readonly Observable[],
): AsyncGenerator<Event, boolean> {
  yield { type: "roles-queued", role: "provider-reader", count: providers.length };
  const done = yield* inParallel(
    providers.map((provider) => () => providerReader(rolesRun, provider)),
    rolesRun.jobs,
  );
  return done.every(Boolean);
}

// One twin writer per provider whose reading passes, `jobs` at a time. The target is not
// started.
export async function* runTwinWriters(
  rolesRun: RolesRun,
  providers: readonly Observable[],
): AsyncGenerator<Event, boolean> {
  yield { type: "roles-queued", role: "twin-writer", count: providers.length };
  const done = yield* inParallel(
    providers.map((provider) => () => twinWriter(rolesRun, provider)),
    rolesRun.jobs,
  );
  return done.every(Boolean);
}

export function providersRead(rolesRun: RolesRun): AsyncGenerator<Event> {
  return providersCommand("providers-read", rolesRun, (providers) =>
    runProviderReaders(rolesRun, providers),
  );
}

export function providersWriteTwin(rolesRun: RolesRun): AsyncGenerator<Event> {
  return providersCommand("providers-write-twin", rolesRun, (providers) =>
    runTwinWriters(rolesRun, providers),
  );
}
