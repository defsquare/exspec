import { basename, join } from "node:path";
import { driveAgent } from "../agent/drive.ts";
import { extract } from "../agent/extract.ts";
import { instructionsFor } from "../agent/instructions.ts";
import { directoryExists, readExtractionFiles } from "../io/files.ts";
import type { Io } from "../run/io.ts";
import type { Event, Phase } from "../shapes/event.ts";

// "bun '/abs/src/cli/main.ts'" from the sources, "'/abs/specimen'" when compiled
function specimenCommandLine(): string {
  const quoted = (path: string) => `'${path.replaceAll("'", "'\\''")}'`;
  return basename(process.execPath) === "bun"
    ? `bun ${quoted(Bun.main)}`
    : quoted(process.execPath);
}

// no specimen/ yet: no file
async function readFiles(dir: string) {
  return (await directoryExists(join(dir, "specimen"))) ? readExtractionFiles(dir) : [];
}

export function extractCommand({
  dir,
  only,
  model,
  io,
}: {
  readonly dir: string;
  readonly only: Phase | undefined;
  readonly model: string;
  readonly io: Io;
}): AsyncIterable<Event> {
  return extract({
    dir,
    ...(only === undefined ? {} : { only }),
    model,
    instructions: instructionsFor(specimenCommandLine()),
    drive: driveAgent,
    io,
    readFiles,
  });
}
