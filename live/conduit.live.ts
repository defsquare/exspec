import { afterAll, expect, test } from "bun:test";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { againstTarget } from "../src/cli/against-target.ts";
import { status } from "../src/cli/status.ts";
import { verdicts } from "../src/cli/verdicts.ts";
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

const dir = await mkdtemp(join(tmpdir(), "exspec-conduit-"));
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
  await runLines(["docker compose -f exspec/target/compose.yaml down -v"], dir);
  await rm(dir, { recursive: true, force: true });
});

test(
  "Conduit's four scenarios are recorded, replay green, and are judged",
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
    const judged = await Array.fromAsync(verdicts(examination));
    const rules = judged.flatMap((event) =>
      event.type === "rule-judged" && event.by.length > 0
        ? [[`${event.operation}/${event.rule}`, event.provenance, event.by]]
        : [],
    );
    const bindings = judged.flatMap((event) =>
      event.type === "binding-judged" && event.by.length > 0
        ? [[event.trigger, event.provenance, event.by]]
        : [],
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
      rules,
      bindings,
    }).toEqual({
      written: scenarios,
      recorded: { type: "command-finished", command: "record", ok: true },
      replayed: scenarios.map((path) => [path, []]),
      finished: { type: "command-finished", command: "replay", ok: true },
      references: [4],
      rules: [
        [
          "register/creates-user",
          "declared-only",
          [
            {
              scenario: "register/password-of-eight-characters",
              verdict: "unjudged",
              reason: "declared in a sentence",
            },
          ],
        ],
        [
          "register/password-length",
          "declared-only",
          [
            {
              scenario: "register/password-of-seven-characters",
              verdict: "ambiguous",
              reason: "email-free: the fact is unknown",
            },
          ],
        ],
        [
          "unfavorite-article/exists",
          "declared-only",
          [
            {
              scenario: "unfavorite-article/unknown-article",
              verdict: "unjudged",
              reason: "the reading answered 401",
            },
          ],
        ],
        [
          "unfavorite-article/leaves-favorites",
          "verified",
          [{ scenario: "unfavorite-article/others-favorited-too", verdict: "verified" }],
        ],
      ],
      bindings: [
        [
          "create-user",
          "verified",
          [
            { scenario: "register/password-of-eight-characters", verdict: "verified" },
            { scenario: "register/password-of-seven-characters", verdict: "verified" },
          ],
        ],
        [
          "delete-article-favorite",
          "verified",
          [
            { scenario: "unfavorite-article/others-favorited-too", verdict: "verified" },
            { scenario: "unfavorite-article/unknown-article", verdict: "not-exercised" },
          ],
        ],
      ],
    });
  },
  { timeout: 900_000 },
);
