import { join } from "node:path";

// a reading of one operation, delete-pet, as readers wrote it on a real target
const extraction = join(import.meta.dir, "fixtures/roles/exspec");

export const structuresText = await Bun.file(join(extraction, "structures.yaml")).text();
export const commonText = await Bun.file(join(extraction, "common.yaml")).text();
export const commonTriggerText = await Bun.file(
  join(extraction, "common-trigger.yaml"),
).text();
export const rulesText = await Bun.file(
  join(extraction, "operations/delete-pet/rules.yaml"),
).text();
export const hintsText = await Bun.file(
  join(extraction, "operations/delete-pet/hints.yaml"),
).text();
export const triggerText = await Bun.file(
  join(extraction, "operations/delete-pet/trigger.yaml"),
).text();
