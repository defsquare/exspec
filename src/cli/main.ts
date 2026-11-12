#!/usr/bin/env bun
import { resolve } from "node:path";
import { parseArgs } from "node:util";
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
import type { Event } from "../shapes/event.ts";
import { againstTarget } from "./against-target.ts";
import { check } from "./check.ts";
import { renderJson } from "./render-json.ts";
import { renderTerminal } from "./render-terminal.tsx";
import { status } from "./status.ts";

const usage = `usage: specimen <status|check> <dir> [--format json]
       specimen <up|down> <dir>
       specimen <play|replay> <dir> [<operation>/<slug>…]
       specimen record <dir> [<operation>/<slug>…] [--force]`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { format: { type: "string" }, force: { type: "boolean", default: false } },
});
const [command, dir, ...paths] = positionals;

if (dir === undefined) {
  console.error(usage);
  process.exit(2);
}

const examination = {
  dir: resolve(dir),
  exists: directoryExists,
  readFiles: readExtractionFiles,
};

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
