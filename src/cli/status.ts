import { join } from "node:path";
import type { Event } from "../shapes/event.ts";

export async function* status({
  dir,
  exists,
}: {
  readonly dir: string;
  readonly exists: (path: string) => Promise<boolean>;
}): AsyncIterable<Event> {
  yield { type: "command-started", command: "status", dir };
  const expected = join(dir, "specimen");
  const found = await exists(expected);
  if (!found) yield { type: "extraction-not-found", dir, expected };
  yield { type: "command-finished", command: "status", ok: found };
}
