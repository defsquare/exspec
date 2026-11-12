import type { Event } from "../shapes/event.ts";

// returns the last event written
export async function renderJson(
  events: AsyncIterable<Event>,
  write: (line: string) => void,
): Promise<Event | undefined> {
  let last: Event | undefined;
  for await (const event of events) {
    write(JSON.stringify(event));
    last = event;
  }
  return last;
}
