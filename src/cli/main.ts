#!/usr/bin/env bun
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { directoryExists } from "../io/files.ts";
import type { Event } from "../shapes/event.ts";
import { renderJson } from "./render-json.ts";
import { renderTerminal } from "./render-terminal.tsx";
import { status } from "./status.ts";

const usage = "usage: specimen status <dir> [--format json]";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { format: { type: "string" } },
});
const [command, dir] = positionals;

if (command !== "status" || dir === undefined) {
  console.error(usage);
  process.exit(2);
}

let ok = false;
async function* observed(events: AsyncIterable<Event>): AsyncIterable<Event> {
  for await (const event of events) {
    if (event.type === "command-finished") ok = event.ok;
    yield event;
  }
}

const events = observed(status({ dir: resolve(dir), exists: directoryExists }));
try {
  if (values.format === "json") await renderJson(events, (line) => console.log(line));
  else await renderTerminal(events);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
process.exit(ok ? 0 : 1);
