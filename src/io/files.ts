import { rm, stat } from "node:fs/promises";
import { join } from "node:path";
import type { SourceFile } from "../shapes/extraction.ts";
import type { Reference } from "../shapes/scenario.ts";
import { type Credentials, credentialsSchema, type Target } from "../shapes/target.ts";

export class ExtractionUnderRoles extends Error {
  readonly type = "extraction-under-roles";
  constructor() {
    super(
      "exspec/roles/ is the layout before operations/: run `bun scripts/migrations/0027-roles-to-operations.ts <dir>`",
    );
  }
}

// the YAML files, and the twins a twin writer wrote; an extraction still under roles/ is
// refused, it would look empty
export async function readExtractionFiles(dir: string): Promise<readonly SourceFile[]> {
  const root = join(dir, "exspec");
  if (await directoryExists(join(root, "roles"))) throw new ExtractionUnderRoles();
  const paths = [
    ...(await Array.fromAsync(new Bun.Glob("**/*.yaml").scan(root))),
    ...(await Array.fromAsync(new Bun.Glob("providers/*/twin.ts").scan(root))),
  ];
  return Promise.all(
    paths
      .sort()
      .map(async (path) => ({ path, text: await Bun.file(join(root, path)).text() })),
  );
}

export async function directoryExists(path: string): Promise<boolean> {
  return stat(path).then(
    (s) => s.isDirectory(),
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return false;
      throw error;
    },
  );
}

export async function readCredentials(dir: string, target: Target): Promise<Credentials> {
  if (target.credentials === undefined) return {};
  return credentialsSchema.parse(await Bun.file(join(dir, target.credentials)).json());
}

// path: "<operation>/<slug>"
export async function writeReference(
  dir: string,
  path: string,
  reference: Reference,
): Promise<void> {
  await Bun.write(
    join(dir, "exspec", "references", `${path}.yaml`),
    Bun.YAML.stringify(reference, null, 2),
  );
}

// "abc1234", or "unversioned" when dir is not a git checkout
export async function checkoutVersion(dir: string): Promise<string> {
  const { exitCode, stdout } = await Bun.$`git rev-parse --short HEAD`
    .cwd(dir)
    .quiet()
    .nothrow();
  return exitCode === 0 ? stdout.toString().trim() : "unversioned";
}

// path: relative to <dir>/exspec
export async function writeExtractionFile(
  dir: string,
  path: string,
  text: string,
): Promise<void> {
  await Bun.write(join(dir, "exspec", path), text);
}

export async function removeExtractionFile(dir: string, path: string): Promise<void> {
  await rm(join(dir, "exspec", path), { force: true });
}
