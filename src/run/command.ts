import type { Event } from "../shapes/event.ts";
import type { Extraction } from "../shapes/extraction.ts";
import type { Target } from "../shapes/target.ts";
import type { Io } from "./io.ts";
import { stopTarget } from "./lifecycle.ts";
import type { Selected } from "./play.ts";

export type Command = Extract<Event, { type: "command-started" }>["command"];

export type Asked = {
  readonly dir: string;
  readonly extraction: Extraction;
  // "<operation>/<slug>"; none means every scenario
  readonly paths: readonly string[];
};

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

// The frame of a command that runs against the target: the selection, the start and the
// end. An error raised in the body ends the command; when stopOnFailure, the target is
// stopped first, so a failed command leaves nothing running.
export async function* commandRun(
  command: Command,
  { dir, extraction, paths }: Asked,
  io: Io,
  stopOnFailure: boolean,
  body: (target: Target, scenarios: Selected) => AsyncGenerator<Event, boolean>,
): AsyncGenerator<Event> {
  yield { type: "command-started", command, dir };
  const { target, scenarios } = extraction;
  const unknown = paths.filter((path) => !scenarios.some((s) => s.path === path));
  if (target === undefined || unknown.length > 0) {
    const message =
      target === undefined
        ? "the extraction names no target"
        : `no scenario at ${unknown.join(", ")}`;
    yield { type: "command-failed", message };
    yield { type: "command-finished", command, ok: false };
    return;
  }
  const selected =
    paths.length === 0 ? scenarios : scenarios.filter(({ path }) => paths.includes(path));
  try {
    const ok = yield* body(target, selected);
    yield { type: "command-finished", command, ok };
  } catch (error) {
    yield { type: "command-failed", message: messageOf(error) };
    if (stopOnFailure) {
      try {
        yield* stopTarget({ dir, target, io });
      } catch (stopError) {
        yield { type: "command-failed", message: messageOf(stopError) };
      }
    }
    yield { type: "command-finished", command, ok: false };
  }
}
