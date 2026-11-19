import { expect, test } from "bun:test";
import type { Drive } from "../../src/agent/drive.ts";
import { rolesRead, structuresReads } from "../../src/agent/roles-read.ts";
import type { Role } from "../../src/shapes/event.ts";
import { reading } from "../roles-left-fixture.ts";
import { fakeIo } from "../run/fake.ts";

type By = { readonly role: Role; readonly interface: string };

test("the reader of the structures reads the code and its own file, not the interfaces", () => {
  expect(
    [
      "exspec/interfaces.yaml",
      "exspec/structures.yaml",
      "exspec/roles/common.yaml",
      "src/a.ts",
    ].filter((path) => structuresReads("/d")(path)),
  ).toEqual(["exspec/structures.yaml", "src/a.ts"]);
});

test("a reader whose session ends in error, or whose drive raises, tells what failed it", async () => {
  const files = {
    ...reading,
    "interfaces.yaml": `
interfaces:
  - {interface: a, method: get, pattern: "/a", responses: {200: {body: any}}}
  - {interface: b, method: get, pattern: "/b", responses: {200: {body: any}}}
`,
  };
  const drive: Drive = async function* ({ prompt }) {
    yield* [];
    if (prompt.startsWith("The operation: a,"))
      return { session: "s", ok: false, how: "x" };
    throw new Error("e");
  };
  const { io } = fakeIo({});
  const events = await Array.fromAsync(
    rolesRead({
      dir: "/d",
      jobs: 1,
      model: "m",
      drive,
      io,
      readFiles: async () =>
        Object.entries(files).map(([path, text]) => ({ path, text })),
      writeFile: async () => {},
      removeFile: async () => {},
    }),
  );
  const a: By = { role: "reader", interface: "a" };
  const b: By = { role: "reader", interface: "b" };
  expect(events).toEqual([
    { type: "command-started", command: "roles-read", dir: "/d" },
    {
      type: "role-skipped",
      role: "structures-reader",
      why: "structures.yaml passes its check",
    },
    { type: "role-skipped", role: "common-reader", why: "common.yaml passes its check" },
    { type: "roles-queued", role: "reader", count: 2 },
    { type: "role-started", ...a },
    { type: "role-failed", ...a, message: "the agent's session ended in error (x)" },
    { type: "role-finished", ...a, ok: false },
    { type: "role-started", ...b },
    { type: "role-failed", ...b, message: "e" },
    { type: "role-finished", ...b, ok: false },
    { type: "command-finished", command: "roles-read", ok: false },
  ]);
});
