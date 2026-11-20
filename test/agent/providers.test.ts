import { expect, test } from "bun:test";
import type { Drive, Session } from "../../src/agent/drive.ts";
import { providersRead, providersWriteTwin } from "../../src/agent/providers.ts";
import { type RolesRun, rolesRunOf } from "../../src/agent/roles.ts";
import type { ConditionOfTwin, TwinTrial } from "../../src/io/twins.ts";
import type { Role } from "../../src/shapes/event.ts";
import { fakeIo } from "../run/fake.ts";

type By = { readonly role: Role; readonly provider: string };

const files: Readonly<Record<string, string>> = {
  "target.yaml": `
target: t
start: [start]
alive: {method: get, path: /alive, status: 200}
seed: [seed]
reset: [reset]
stop: [stop]
api: {base-url: "http://h"}
proxy: {port: 9100}
observables:
  - {observable: s, kind: provider}
  - {observable: t, kind: provider}
`,
  "providers/s/interfaces.yaml": `
interfaces:
  - {interface: make, method: post, pattern: /items, responses: {"200": {body: any}}}
`,
  "providers/s/provider.yaml": `
provider: s
renders: items
state: {shape: {made: int}, says: made counts what was made}
expects:
  - {expect: make-gives-key, on: make, says: a made item is answered with its key, source: src/a/b.ts}
`,
  "services/items.yaml": `
service: items
says: makes items
conditions:
  - {condition: refuses, takes: {owner: {name: string}}, says: what an owner asks is refused}
`,
};

const drive: Drive = async function* () {
  yield* [];
  return { session: "x", ok: true };
};

function runOf(
  more: Partial<RolesRun>,
  trials: readonly TwinTrial[] = [],
): {
  readonly rolesRun: RolesRun;
  readonly written: string[];
  readonly tried: ConditionOfTwin[][];
} {
  const written: string[] = [];
  const tried: ConditionOfTwin[][] = [];
  const left = [...trials];
  const { io } = fakeIo({});
  return {
    written,
    tried,
    rolesRun: {
      dir: "/d",
      jobs: 1,
      model: "m",
      drive,
      io: {
        ...io,
        tryTwin: async (_dir, _name, conditions) => {
          tried.push([...conditions]);
          return left.shift() ?? { failed: "no trial left" };
        },
      },
      readFiles: async () =>
        Object.entries(files).map(([path, text]) => ({ path, text })),
      writeFile: async (_dir, path) => {
        written.push(path);
      },
      removeFile: async () => {},
      ...more,
    },
  };
}

test("a twin is written for each provider whose reading passes, until its state comes back as it was and each condition is taken", async () => {
  const refused = {
    condition: "refuses",
    status: 200,
    state: { made: 0, refused: ["a"] },
  };
  const { rolesRun, written, tried } = runOf({}, [
    {
      fresh: { made: 0 },
      again: { made: 1 },
      given: [{ condition: "refuses", status: 200, state: { made: 0 } }],
    },
    {
      fresh: { made: 0 },
      again: { made: 0 },
      given: [{ condition: "refuses", status: 404, state: "unknown condition refuses" }],
    },
    { fresh: { made: 0 }, again: { made: 0 }, given: [refused] },
  ]);
  const s: By = { role: "twin-writer", provider: "s" };
  const sent = '{"condition":"refuses","with":{"owner":{"name":"a"}}}';
  expect({
    events: await Array.fromAsync(providersWriteTwin(rolesRun)),
    written,
    tried,
  }).toEqual({
    events: [
      { type: "command-started", command: "providers-write-twin", dir: "/d" },
      { type: "roles-queued", role: "twin-writer", count: 2 },
      { type: "role-started", ...s },
      {
        type: "gate-checked",
        ...s,
        ok: false,
        findings: [
          'GET /__state answered {"made":0}; PUT back, GET /__state answered {"made":1}',
        ],
      },
      {
        type: "gate-checked",
        ...s,
        ok: false,
        findings: [`PUT /__given ${sent} answered 404: "unknown condition refuses"`],
      },
      { type: "gate-checked", ...s, ok: true, findings: [] },
      { type: "role-finished", ...s, ok: true },
      {
        type: "role-skipped",
        role: "twin-writer",
        provider: "t",
        why: "its interfaces and expectations do not pass their check",
      },
      { type: "command-finished", command: "providers-write-twin", ok: true },
    ],
    written: [],
    tried: [1, 2, 3].map(() => [
      { condition: "refuses", with: { owner: { name: "a" } } },
    ]),
  });
});

test("a provider reader's session runs at effort high, whatever the command's effort", async () => {
  const efforts: Session["effort"][] = [];
  const { rolesRun } = runOf({ only: "s" });
  await Array.fromAsync(
    providersRead(
      rolesRunOf({
        ...rolesRun,
        effort: "low",
        drive: async function* (session) {
          efforts.push(session.effort);
          yield* [];
          return { session: "x", ok: true };
        },
      }),
    ),
  );
  expect(efforts).toEqual(["high"]);
});

test("a provider reader is skipped when its reading passes, and a provider not declared fails the command", async () => {
  const reader = (only?: string) =>
    Array.fromAsync(
      providersRead(runOf(only === undefined ? {} : { only }).rolesRun),
    ).then((events) => events.slice(0, 4));
  const t: By = { role: "provider-reader", provider: "t" };
  expect([await reader(), await reader("u")]).toEqual([
    [
      { type: "command-started", command: "providers-read", dir: "/d" },
      { type: "roles-queued", role: "provider-reader", count: 2 },
      {
        type: "role-skipped",
        role: "provider-reader",
        provider: "s",
        why: "its interfaces and expectations pass their check",
      },
      { type: "role-started", ...t },
    ],
    [
      { type: "command-started", command: "providers-read", dir: "/d" },
      { type: "command-failed", message: 'no provider "u"' },
      { type: "command-finished", command: "providers-read", ok: false },
    ],
  ]);
});
