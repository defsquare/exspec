import type { Event } from "../shapes/event.ts";
import { type Examination, examine } from "./examine.ts";

export function verdicts(examination: Examination): AsyncIterable<Event> {
  return examine("verdicts", examination);
}
