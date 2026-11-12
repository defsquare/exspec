import type { Event } from "../shapes/event.ts";

export async function renderJson(
  events: AsyncIterable<Event>,
  write: (line: string) => void,
): Promise<void> {
  for await (const event of events) write(JSON.stringify(event));
}
