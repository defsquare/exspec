import { expect, test } from "bun:test";
import { dirname, join } from "node:path";

const root = join(import.meta.dir, "..");

const allowed: Record<string, readonly string[]> = {
  shapes: [],
  derive: ["shapes"],
  io: ["shapes"],
  run: ["shapes", "derive", "io"],
  agent: ["shapes", "derive", "io", "run"],
  cli: ["shapes", "derive", "io", "run", "agent"],
};

const importPattern = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;

async function sources() {
  const files: { file: string; layer: string; specifiers: string[] }[] = [];
  for await (const file of new Bun.Glob("src/**/*.{ts,tsx}").scan(root)) {
    const text = await Bun.file(join(root, file)).text();
    const specifiers = [...text.matchAll(importPattern)].flatMap((m) =>
      m[1] ? [m[1]] : [],
    );
    files.push({ file, layer: file.split("/")[1] ?? "", specifiers });
  }
  return files;
}

test("the sources are found", async () => {
  expect((await sources()).length).toBeGreaterThan(0);
});

test("a module imports only its layer or those below", async () => {
  const violations = (await sources()).flatMap(({ file, layer, specifiers }) => {
    const imports = specifiers
      .filter((s) => s.startsWith("."))
      .filter((s) => {
        const target = join(dirname(file), s).split("/")[1] ?? "";
        return target !== layer && !(allowed[layer] ?? []).includes(target);
      });
    return imports.length > 0 ? [{ file, imports }] : [];
  });
  expect(violations).toEqual([]);
});

test("shapes and derive import no node or bun module", async () => {
  const violations = (await sources())
    .filter(({ layer }) => layer === "shapes" || layer === "derive")
    .flatMap(({ file, specifiers }) => {
      const imports = specifiers.filter(
        (s) => s.startsWith("node:") || s.startsWith("bun"),
      );
      return imports.length > 0 ? [{ file, imports }] : [];
    });
  expect(violations).toEqual([]);
});
