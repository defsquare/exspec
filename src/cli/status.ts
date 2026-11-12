import type { Event } from "../shapes/event.ts";
import { type Examination, examine } from "./examine.ts";

export function status(examination: Examination): AsyncIterable<Event> {
  return examine("status", examination);
}
