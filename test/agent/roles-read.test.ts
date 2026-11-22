import { expect, test } from "bun:test";
import type { Drive } from "../../src/agent/drive.ts";
import { rolesRead, structuresReads } from "../../src/agent/roles-read.ts";
import type { Event, Role } from "../../src/shapes/event.ts";
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

function readingOf(initial: Readonly<Record<string, string>>, writes: readonly string[]) {
  const files = new Map(Object.entries(initial));
  const received: { prompt: string; resume?: string }[] = [];
  const drive: Drive = async function* ({ prompt, resume }) {
    yield* [];
    const text = writes[received.length];
    received.push({ prompt, ...(resume === undefined ? {} : { resume }) });
    if (text !== undefined) files.set("states.yaml", text);
    return { session: "s", ok: true };
  };
  const { io } = fakeIo({});
  return {
    received,
    run: (only?: string) =>
      Array.fromAsync(
        rolesRead({
          dir: "/d",
          jobs: 1,
          model: "m",
          drive,
          io,
          readFiles: async () => [...files].map(([path, text]) => ({ path, text })),
          writeFile: async () => {},
          removeFile: async () => {},
          ...(only === undefined ? {} : { only }),
        }),
      ),
  };
}

const noStates = Object.fromEntries(
  Object.entries(reading).filter(([path]) => path !== "states.yaml"),
);

const readersSkipped: Event[] = [
  { type: "command-started", command: "roles-read", dir: "/d" },
  {
    type: "role-skipped",
    role: "structures-reader",
    why: "structures.yaml passes its check",
  },
  { type: "role-skipped", role: "common-reader", why: "common.yaml passes its check" },
  { type: "roles-queued", role: "reader", count: 1 },
  {
    type: "role-skipped",
    role: "reader",
    interface: "f",
    why: "its rules and hints pass their check",
  },
];

const gathering =
  "Read exspec/structures.yaml, exspec/interfaces.yaml and the rules.yaml and hints.yaml of every folder of exspec/roles/, and write exspec/states.yaml.";

test("the states' reader runs after the readers when states.yaml is missing and every operation is read, its gate's findings sent back", async () => {
  const { received, run } = readingOf(noStates, [
    "- {state: s, of: [S], seen: x, path: f/x, serves: [f/exists]}",
    "[]",
  ]);
  const findings = [
    "s: its path is f/x: the path of a state is <operation>/answers",
    "s: it serves rules of one operation: a state serves two at least",
  ];
  expect({ events: await run(), received }).toEqual({
    events: [
      ...readersSkipped,
      { type: "role-started", role: "states-reader" },
      { type: "gate-checked", role: "states-reader", ok: false, findings },
      { type: "gate-checked", role: "states-reader", ok: true, findings: [] },
      { type: "role-finished", role: "states-reader", ok: true },
      { type: "command-finished", command: "roles-read", ok: true },
    ],
    received: [
      { prompt: gathering },
      {
        prompt: [
          "The tool's check of what you wrote failed. Fix what follows, then end with the same short message.",
          "",
          ...findings,
        ].join("\n"),
        resume: "s",
      },
    ],
  });
});

test("the states' reader is skipped once states.yaml is written, and while an operation is not read, whatever the selection", async () => {
  const written = readingOf(reading, []);
  const unread = readingOf(
    {
      ...noStates,
      "interfaces.yaml": `
interfaces:
  - {interface: f, method: get, pattern: "/f/{a}", responses: {200: {body: any}}}
  - {interface: g, method: get, pattern: "/g", responses: {200: {body: any}}}
`,
    },
    [],
  );
  expect({
    written: (await written.run()).at(-2),
    unread: (await unread.run("f")).at(-2),
    sessions: unread.received.map(({ prompt }) => prompt.split("\n")[0]),
  }).toEqual({
    written: {
      type: "role-skipped",
      role: "states-reader",
      why: "states.yaml is written",
    },
    unread: {
      type: "role-skipped",
      role: "states-reader",
      why: "1 operations are not read yet",
    },
    sessions: ["The operation: f, GET /f/{a}."],
  });
});
