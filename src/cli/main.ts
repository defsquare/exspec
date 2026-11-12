#!/usr/bin/env bun
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { directoryExists, readExtractionFiles } from "../io/files.ts";
import { check } from "./check.ts";
import { renderJson } from "./render-json.ts";
import { renderTerminal } from "./render-terminal.tsx";
import { status } from "./status.ts";

const usage = "usage: specimen <status|check> <dir> [--format json]";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { format: { type: "string" } },
});
const [command, dir] = positionals;

if ((command !== "status" && command !== "check") || dir === undefined) {
  console.error(usage);
  process.exit(2);
}

const examination = {
  dir: resolve(dir),
  exists: directoryExists,
  readFiles: readExtractionFiles,
};
const events = command === "status" ? status(examination) : check(examination);
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
