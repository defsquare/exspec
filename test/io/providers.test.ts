import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { noRenderer, renderersOf } from "../../src/io/providers.ts";

let dir = "";

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "providers-"));
  await Bun.write(
    join(dir, "exspec/providers/p/provider.yaml"),
    `provider: p
renders: s
state: {shape: {kept: [string]}, says: "what was kept"}
expects: []
unsure: []
`,
  );
  await Bun.write(join(dir, "exspec/providers/q/provider.yaml"), "renders: [");
});

afterAll(async () => {
  await rm(dir, { recursive: true });
});

test("a provider whose file is absent or does not read renders nothing, and says why", async () => {
  const { rendered, unread } = await renderersOf(dir, ["p", "q", "r"]);
  expect({ rendered: [...rendered], unread }).toEqual({
    rendered: [["s", "p"]],
    unread: [
      "providers/q/provider.yaml: not YAML: YAML Parse error: Unexpected token",
      "providers/r/provider.yaml: absent",
    ],
  });
});

test("a service no provider renders is refused with the cause", () => {
  expect(noRenderer("s", ["providers/q/provider.yaml: absent"])).toEqual(
    "no provider renders s — providers/q/provider.yaml: absent",
  );
  expect(noRenderer("s", [])).toEqual("no provider renders s");
});
