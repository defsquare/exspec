import { expect, test } from "bun:test";
import { statesRename } from "../../src/cli/states.ts";
import type { Event } from "../../src/shapes/event.ts";
import { filesOf, pathed, points } from "../roles-left-fixture.ts";

const states = "- {state: s, of: [S], seen: x, path: f/exists-a}\n";

async function renamedWith(from: string, to: string) {
  const written = new Map<string, string>();
  const events = await Array.fromAsync(
    statesRename({
      dir: "/abs/dir",
      exists: async () => true,
      readFiles: async () =>
        filesOf({ ...points["a reference"], ...pathed, "states.yaml": states }),
      writeFile: async (_dir, path, text) => {
        written.set(path, text);
      },
      from,
      to,
    }),
  );
  return { events, written: Object.fromEntries(written) };
}

test("states rename writes every file that names the state, and says which", async () => {
  expect(await renamedWith("s", "t")).toEqual({
    events: [
      { type: "command-started", command: "states-rename", dir: "/abs/dir" },
      {
        type: "state-renamed",
        from: "s",
        to: "t",
        files: ["states.yaml", "operations/f/scenarios/exists-b.yaml"],
      },
      { type: "command-finished", command: "states-rename", ok: true },
    ] satisfies Event[],
    written: {
      "states.yaml": "- {state: t, of: [S], seen: x, path: f/exists-a}\n",
      "operations/f/scenarios/exists-b.yaml": (
        pathed["operations/f/scenarios/exists-b.yaml"] ?? ""
      ).replace("state: s,", "state: t,"),
    },
  });
});

test("states rename refused writes nothing and says why", async () => {
  expect(await renamedWith("q", "t")).toEqual({
    events: [
      { type: "command-started", command: "states-rename", dir: "/abs/dir" },
      { type: "command-failed", message: '"q" is not a state of states.yaml' },
      { type: "command-finished", command: "states-rename", ok: false },
    ] satisfies Event[],
    written: {},
  });
});
