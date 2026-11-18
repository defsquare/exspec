import { join } from "node:path";
import { driveAgent, type Session } from "../agent/drive.ts";
import { extract } from "../agent/extract.ts";
import { instructionsFor } from "../agent/instructions.ts";
import {
  directoryExists,
  readExtractionFiles,
  removeSpecimenFile,
  writeSpecimenFile,
} from "../io/files.ts";
import type { Io } from "../run/io.ts";
import type { Event, Phase } from "../shapes/event.ts";

export class ClaudeNotFound extends Error {
  readonly type = "claude-not-found";
}

// a compiled specimen runs from Bun's embedded file system
const compiled = Bun.main.startsWith("/$bunfs/");

// "bun '/abs/src/cli/main.ts'" from the sources, "'/abs/specimen'" when compiled
function specimenCommandLine(): string {
  const quoted = (path: string) => `'${path.replaceAll("'", "'\\''")}'`;
  return compiled ? quoted(process.execPath) : `bun ${quoted(Bun.main)}`;
}

// From the sources the SDK starts the executable installed beside it. A compiled specimen
// carries none (it weighs five times the binary): it starts the `claude` of the PATH.
export function claudeExecutable(): string | undefined {
  if (!compiled) return undefined;
  const found = Bun.which("claude");
  if (found === null) {
    throw new ClaudeNotFound(
      "specimen extract and specimen roles need Claude Code: no `claude` on the PATH (https://claude.com/claude-code)",
    );
  }
  return found;
}

// no specimen/ yet: no file
async function readFiles(dir: string) {
  return (await directoryExists(join(dir, "specimen"))) ? readExtractionFiles(dir) : [];
}

export async function* extractCommand({
  dir,
  only,
  model,
  jobs,
  effort,
  io,
}: {
  readonly dir: string;
  readonly only: Phase | undefined;
  readonly model: string;
  readonly jobs: number;
  readonly effort: Session["effort"];
  readonly io: Io;
}): AsyncGenerator<Event> {
  // found before any phase starts a target
  const executable = claudeExecutable();
  yield* extract({
    dir,
    ...(only === undefined ? {} : { only }),
    model,
    jobs,
    effort,
    instructions: instructionsFor(specimenCommandLine()),
    drive: (session) =>
      driveAgent(executable === undefined ? session : { ...session, executable }),
    io,
    readFiles,
    writeFile: writeSpecimenFile,
    removeFile: removeSpecimenFile,
  });
}
