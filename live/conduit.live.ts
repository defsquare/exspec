import { afterAll, expect, test } from "bun:test";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { againstTarget } from "../src/cli/against-target.ts";
import { status } from "../src/cli/status.ts";
import {
  checkoutVersion,
  directoryExists,
  readCredentials,
  readExtractionFiles,
  writeReference,
} from "../src/io/files.ts";
import { send } from "../src/io/http.ts";
import { runLines } from "../src/io/shell.ts";
import type { Io } from "../src/run/io.ts";
import { record } from "../src/run/record.ts";
import { replay } from "../src/run/replay.ts";
import type { Event } from "../src/shapes/event.ts";

const scenarios = [
  "register/password-of-eight-characters",
  "register/password-of-seven-characters",
  "unfavorite-article/others-favorited-too",
  "unfavorite-article/unknown-article",
];

const dir = await mkdtemp(join(tmpdir(), "specimen-conduit-"));
await cp(join(import.meta.dir, "../test/fixtures/conduit"), dir, { recursive: true });

const io: Io = {
  runLines,
  send,
  sleep: Bun.sleep,
  readCredentials,
  writeReference,
  now: () => new Date().toISOString(),
  version: await checkoutVersion(dir),
};

const examination = { dir, exists: directoryExists, readFiles: readExtractionFiles };

async function timed(
  events: AsyncIterable<Event>,
): Promise<{ events: readonly Event[]; seconds: number }> {
  const started = performance.now();
  const all = await Array.fromAsync(events);
  return { events: all, seconds: Math.round((performance.now() - started) / 100) / 10 };
}

afterAll(async () => {
  await runLines(["docker compose -f specimen/target/compose.yaml down -v"], dir);
  await rm(dir, { recursive: true, force: true });
});

test(
  "Conduit's four scenarios are recorded, then replay green",
  async () => {
    const recorded = await timed(
      againstTarget("record", examination, (extraction) =>
        record({ dir, extraction, paths: [], force: false }, io),
      ),
    );
    const replayed = await timed(
      againstTarget("replay", examination, (extraction) =>
        replay({ dir, extraction, paths: [] }, io),
      ),
    );
    const counted = (await Array.fromAsync(status(examination))).flatMap((event) =>
      event.type === "extraction-counted" ? [event.counts.references] : [],
    );
    console.log(
      JSON.stringify({
        record: recorded.seconds,
        replay: replayed.seconds,
        noise: recorded.events.flatMap((event) =>
          event.type === "reference-written" ? [[event.path, event.noise]] : [],
        ),
      }),
    );
    expect({
      written: recorded.events.flatMap((event) =>
        event.type === "reference-written" ? [event.path] : [],
      ),
      recorded: recorded.events.at(-1),
      replayed: replayed.events.flatMap((event) =>
        event.type === "scenario-replayed" ? [[event.path, event.differences]] : [],
      ),
      finished: replayed.events.at(-1),
      references: counted,
    }).toEqual({
      written: scenarios,
      recorded: { type: "command-finished", command: "record", ok: true },
      replayed: scenarios.map((path) => [path, []]),
      finished: { type: "command-finished", command: "replay", ok: true },
      references: [4],
    });
  },
  { timeout: 900_000 },
);
