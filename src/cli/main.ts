#!/usr/bin/env bun
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { agentMark } from "../agent/drive.ts";
import {
  checkoutVersion,
  directoryExists,
  readCredentials,
  readExtractionFiles,
  writeReference,
} from "../io/files.ts";
import { send } from "../io/http.ts";
import { runLines } from "../io/shell.ts";
import type { Io } from "../run/io.ts";
import { record } from "../run/record.ts";
import { replay } from "../run/replay.ts";
import { down, play, up } from "../run/target-commands.ts";
import { type Event, phaseSchema } from "../shapes/event.ts";
import { againstTarget } from "./against-target.ts";
import { check } from "./check.ts";
import { askedOf } from "./command-line.ts";
import { extractCommand } from "./extract.ts";
import { renderJson } from "./render-json.ts";
import { renderTerminal } from "./render-terminal.tsx";
import { rolesEvents } from "./roles.ts";
import { status } from "./status.ts";
import { verdicts } from "./verdicts.ts";
import { pageOf } from "./view.ts";

const usage = `usage: specimen <status|check|verdicts> <dir> [--format json]
       specimen view <dir> > page.html
       specimen target <up|down> <dir>
       specimen target play <dir> [<operation>/<slug>…]
       specimen replay <dir> [<operation>/<slug>…]
       specimen record <dir> [<operation>/<slug>…] [--force]
       specimen extract <dir> [--phase <phase>] [--model <model>] [--format json]
       specimen roles <read|build|judge> <dir> [--only <interface>] [--jobs n] [--model <model>] [--format json]
       specimen roles play <dir> <interface>/<slug>`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    format: { type: "string" },
    force: { type: "boolean", default: false },
    phase: { type: "string" },
    model: { type: "string", default: "sonnet" },
    only: { type: "string" },
    jobs: { type: "string", default: "4" },
  },
});
const asked = askedOf(positionals, process.env[agentMark] !== undefined);
if (asked.type === "refused-to-agent") {
  console.error(
    asked.command === "view"
      ? "specimen view is not run from an agent's session: the page is for a person; status and verdicts say the same."
      : asked.command.startsWith("roles-")
        ? `specimen ${asked.command.replace("-", " ")} is not run from an agent's session: the roles are kept apart, and the tool drives each of them.`
        : `specimen ${asked.command} is not run from an agent's session: the references are recorded and judged by the tool, after the agent.`,
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
    console.error(
      `no extraction: ${join(examination.dir, "specimen")} is not a directory`,
    );
    process.exit(1);
  }
  // Bun.write to a pipe stalls past 128 KB once Ink is loaded
  process.stdout.write(page, () => process.exit(0));
  await new Promise(() => {});
}

async function ioOf(): Promise<Io> {
  return {
    runLines,
    send,
    sleep: Bun.sleep,
    readCredentials,
    writeReference,
    now: () => new Date().toISOString(),
    version: await checkoutVersion(examination.dir),
  };
}

async function eventsOf(): Promise<AsyncIterable<Event> | undefined> {
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
      const io = await ioOf();
      return againstTarget(command, examination, (extraction) =>
        run({ ...asked, extraction }, io),
      );
    }
    case "record": {
      const io = await ioOf();
      return againstTarget(command, examination, (extraction) =>
        record({ ...asked, extraction, force: values.force }, io),
      );
    }
    case "extract": {
      const only = phaseSchema.optional().safeParse(values.phase);
      if (!only.success) return undefined;
      const { dir } = examination;
      return extractCommand({
        dir,
        only: only.data,
        model: values.model,
        io: await ioOf(),
      });
    }
    case "roles-read":
    case "roles-build":
    case "roles-judge":
    case "roles-play": {
      const jobs = Number(values.jobs);
      const [scenario] = paths;
      const misused =
        command === "roles-play"
          ? paths.length !== 1 || values.only !== undefined
          : paths.length > 0;
      if (misused || !Number.isInteger(jobs) || jobs < 1) return undefined;
      return rolesEvents({
        command,
        dir: examination.dir,
        scenario,
        only: values.only,
        jobs,
        model: values.model,
        io: await ioOf(),
      });
    }
    default:
      return undefined;
  }
}

const events = await eventsOf();
if (events === undefined) {
  console.error(usage);
  process.exit(2);
}
try {
  const last =
    values.format === "json"
      ? await renderJson(events, (line) => console.log(line))
      : await renderTerminal(events);
  process.exit(last?.type === "command-finished" && last.ok ? 0 : 1);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
