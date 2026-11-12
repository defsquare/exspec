import type { Event } from "../shapes/event.ts";
import { type Examination, examine } from "./examine.ts";

export function check(examination: Examination): AsyncIterable<Event> {
  return examine("check", examination);
}
