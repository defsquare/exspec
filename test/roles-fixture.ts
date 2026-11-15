import { join } from "node:path";

// a reading of one operation, delete-pet, as readers wrote it on a real target
const specimen = join(import.meta.dir, "fixtures/roles/specimen");
const roles = join(specimen, "roles");

export const structuresText = await Bun.file(join(specimen, "structures.yaml")).text();
export const commonText = await Bun.file(join(roles, "common.yaml")).text();
export const rulesText = await Bun.file(join(roles, "delete-pet/rules.yaml")).text();
export const hintsText = await Bun.file(join(roles, "delete-pet/hints.yaml")).text();
