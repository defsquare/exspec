#!/usr/bin/env bun
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { agentMark } from "../agent/drive.ts";
import {
  checkoutVersion,
  directoryExists,
  readCredentials,
  readExtractionFiles,
  writeReference,
} from "../io/files.ts";
import { send } from "../io/http.ts";
import { type StoodProviders, standProviders } from "../io/providers.ts";
import { runLines } from "../io/shell.ts";
import { tryTwin } from "../io/twins.ts";
import type { Io } from "../run/io.ts";
import { record } from "../run/record.ts";
import { replay } from "../run/replay.ts";
import { down, play, up } from "../run/target-commands.ts";
import { type Event, phaseSchema } from "../shapes/event.ts";
import { parseExtraction } from "../shapes/extraction.ts";
import { againstTarget } from "./against-target.ts";
import { check } from "./check.ts";
import { askedOf } from "./command-line.ts";
import { askClaudeVersion, extractCommand } from "./extract.ts";
import { phaseOfCommand } from "./flow.ts";
import { renderFlow } from "./render-flow.tsx";
import { renderJson } from "./render-json.ts";
import { renderTerminal } from "./render-terminal.tsx";
import { rolesEvents } from "./roles.ts";
import { status } from "./status.ts";
import { verdicts } from "./verdicts.ts";
import { pageOf } from "./view.ts";

const version = "0.1.0";

const usage = `usage: exspec <status|check|verdicts> <dir> [--format json]
       exspec view <dir> > page.html
       exspec target <up|down> <dir>
       exspec target play <dir> [<operation>/<slug>…]
       exspec replay <dir> [<operation>/<slug>…]
       exspec record <dir> [<operation>/<slug>…] [--force]
       exspec extract <dir> [--phase <phase>] [--model <model>] [--jobs n] [--effort <low|medium|high>] [--format json]
       exspec roles <read|build|judge> <dir> [--only <interface>] [--jobs n] [--model <model>] [--effort <low|medium|high>] [--format json]
       exspec roles play <dir> <interface>/<slug>
       exspec roles record <dir> [--only <interface>] [--force]
       exspec roles replay <dir> [--only <interface>]
       exspec providers <read|write-twin> <dir> [--only <provider>] [--jobs n] [--model <model>] [--effort <low|medium|high>] [--format json]
       exspec --help | --version`;

// an option that is not one of these: its name, the usage, 2
function commandLine() {
  try {
    return parseArgs({
      allowPositionals: true,
      options: {
        format: { type: "string" },
        force: { type: "boolean", default: false },
        phase: { type: "string" },
        model: { type: "string", default: "sonnet" },
        effort: { type: "string" },
        only: { type: "string" },
        jobs: { type: "string", default: "4" },
        help: { type: "boolean", short: "h", default: false },
        version: { type: "boolean", default: false },
      },
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(usage);
    process.exit(2);
  }
}

const { positionals, values } = commandLine();
if (values.help) {
  console.log(usage);
  process.exit(0);
}
if (values.version) {
  console.log(`exspec ${version}`);
  const claude = askClaudeVersion();
  if (claude !== undefined) console.log(claude);
  process.exit(0);
}
// an option's value that is not one of its own: the usage, 2
const effort = z.enum(["low", "medium", "high"]).optional().safeParse(values.effort);
if (!effort.success || (values.format !== undefined && values.format !== "json")) {
  console.error(usage);
  process.exit(2);
}
const asked = askedOf(positionals, process.env[agentMark] !== undefined);
if (asked.type === "refused-to-agent") {
  console.error(
    asked.command === "view"
      ? "exspec view is not run from an agent's session: the page is for a person; status and verdicts say the same."
      : asked.command.startsWith("roles-") || asked.command.startsWith("providers-")
        ? `exspec ${asked.command.replace("-", " ")} is not run from an agent's session: the roles are kept apart, and the tool drives each of them.`
        : `exspec ${asked.command} is not run from an agent's session: the references are recorded and judged by the tool, after the agent.`,
  );
  process.exit(2);
}
const command = asked.type === "command" ? asked.command : undefined;
const [dir, ...paths] = asked.type === "command" ? asked.rest : [];

if (dir === undefined) {
  console.error(usage);
  process.exit(2);
}

const examination = {
  dir: resolve(dir),
  exists: directoryExists,
  readFiles: readExtractionFiles,
};

// the command whose output is not the event stream: a page, for a browser
if (command === "view") {
  if (paths.length > 0 || values.format !== undefined) {
    console.error(usage);
    process.exit(2);
  }
  const page = await pageOf(examination);
  if (page === undefined) {
    console.error(`no extraction: ${join(examination.dir, "exspec")} is not a directory`);
    process.exit(1);
  }
  // Bun.write to a pipe stalls past 128 KB once Ink is loaded
  process.stdout.write(page, () => process.exit(0));
  await new Promise(() => {});
}

// the commands that play the roles' scenarios against the target
const plays = new Set<string | undefined>([
  "extract",
  "roles-build",
  "roles-play",
  "roles-record",
  "roles-replay",
]);

// A command that plays stands the target's providers here, before the target is started,
// when target.yaml declares a proxy. A target.yaml that does not parse yet stands none;
// the command reports it. A command that plays nothing stands none: it would only hold
// the port against a command that does.
async function standDeclaredProviders(): Promise<StoodProviders | undefined> {
  const { dir } = examination;
  if (!plays.has(command) || !(await directoryExists(join(dir, "exspec")))) {
    return undefined;
  }
  const declared = parseExtraction(
    (await readExtractionFiles(dir)).filter(({ path }) => path === "target.yaml"),
  ).extraction.target;
  return declared?.proxy === undefined
    ? undefined
    : standProviders({
        dir,
        proxy: declared.proxy,
        observables: declared.observables ?? [],
      });
}

async function ioOf(providers: StoodProviders | undefined): Promise<Io> {
  return {
    runLines,
    send,
    sleep: Bun.sleep,
    readCredentials,
    writeReference,
    ...(providers === undefined
      ? {}
      : {
          takeSideEffects: providers.takeSideEffects,
          resetProviders: providers.resetProviders,
          giveCondition: providers.giveCondition,
        }),
    tryTwin,
    now: () => new Date().toISOString(),
    version: await checkoutVersion(examination.dir),
  };
}

// --jobs: a whole number of sessions, one at least; undefined otherwise
const jobs =
  Number.isInteger(Number(values.jobs)) && Number(values.jobs) >= 1
    ? Number(values.jobs)
    : undefined;

async function eventsOf(
  providers: StoodProviders | undefined,
): Promise<AsyncIterable<Event> | undefined> {
  const asked = { dir: examination.dir, paths };
  switch (command) {
    case "status":
      return status(examination);
    case "check":
      return check(examination);
    case "verdicts":
      return verdicts(examination);
    case "up":
    case "down":
    case "play":
    case "replay": {
      const run = { up, down, play, replay }[command];
      const io = await ioOf(providers);
      return againstTarget(command, examination, (extraction) =>
        run({ ...asked, extraction }, io),
      );
    }
    case "record": {
      const io = await ioOf(providers);
      return againstTarget(command, examination, (extraction) =>
        record({ ...asked, extraction, force: values.force }, io),
      );
    }
    case "extract": {
      const only = phaseSchema.optional().safeParse(values.phase);
      if (!only.success || jobs === undefined) return undefined;
      const { dir } = examination;
      return extractCommand({
        dir,
        only: only.data,
        model: values.model,
        jobs,
        effort: effort.data,
        io: await ioOf(providers),
      });
    }
    case "roles-read":
    case "roles-build":
    case "roles-judge":
    case "roles-play":
    case "roles-record":
    case "roles-replay":
    case "providers-read":
    case "providers-write-twin": {
      const [scenario] = paths;
      const misused =
        command === "roles-play"
          ? paths.length !== 1 || values.only !== undefined
          : paths.length > 0;
      if (misused || jobs === undefined) return undefined;
      return rolesEvents({
        command,
        dir: examination.dir,
        scenario,
        only: values.only,
        force: values.force,
        jobs,
        model: values.model,
        effort: effort.data,
        io: await ioOf(providers),
      });
    }
    default:
      return undefined;
  }
}

// drawn as a flow on a terminal: extract, and a command of the roles that does a phase
const flowed = new Set<string | undefined>(["extract", ...Object.keys(phaseOfCommand)]);

// 0: the command finished ok; 1: it did not; 2: it was misused
let exit = 1;
let providers: StoodProviders | undefined;
// an interrupted command leaves no proxy and no twin behind it
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void (providers?.stopProviders() ?? Promise.resolve()).finally(() =>
      process.exit(130),
    );
  });
}
try {
  providers = await standDeclaredProviders();
  const events = await eventsOf(providers);
  if (events === undefined) {
    console.error(usage);
    exit = 2;
  } else {
    const last =
      values.format === "json"
        ? await renderJson(events, (line) => console.log(line))
        : flowed.has(command) && process.stdout.isTTY
          ? await renderFlow(events)
          : await renderTerminal(events);
    exit = last?.type === "command-finished" && last.ok ? 0 : 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
} finally {
  try {
    await providers?.stopProviders();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
  }
}
process.exit(exit);
