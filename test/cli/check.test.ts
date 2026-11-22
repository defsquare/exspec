import { expect, test } from "bun:test";
import { check } from "../../src/cli/check.ts";
import type { Event } from "../../src/shapes/event.ts";
import { filesOf, hash, judgedAs, points } from "../roles-left-fixture.ts";

test("check of an extraction with gaps only", async () => {
  expect(
    await Array.fromAsync(
      check({
        dir: "/abs/dir",
        exists: async () => true,
        readFiles: async () => [
          { path: "facts.yaml", text: "- {fact: p, condition: []}" },
        ],
      }),
    ),
  ).toEqual<Event[]>([
    { type: "command-started", command: "check", dir: "/abs/dir" },
    {
      type: "gap",
      kind: "fact-without-condition",
      name: "p",
      message: "its condition is not written",
    },
    { type: "command-finished", command: "check", ok: true },
  ]);
});

test("check of an extraction with a problem", async () => {
  expect(
    await Array.fromAsync(
      check({
        dir: "/abs/dir",
        exists: async () => true,
        readFiles: async () => [{ path: "facts.yaml", text: "a: [" }],
      }),
    ),
  ).toEqual<Event[]>([
    { type: "command-started", command: "check", dir: "/abs/dir" },
    {
      type: "problem",
      file: "facts.yaml",
      at: "",
      message: "YAML Parse error: Unexpected token",
    },
    { type: "command-finished", command: "check", ok: false },
  ]);
});

test("check of a directory with no extraction", async () => {
  expect(
    await Array.fromAsync(
      check({ dir: "/abs/dir", exists: async () => false, readFiles: async () => [] }),
    ),
  ).toEqual<Event[]>([
    { type: "command-started", command: "check", dir: "/abs/dir" },
    { type: "extraction-not-found", dir: "/abs/dir", expected: "/abs/dir/exspec" },
    { type: "command-finished", command: "check", ok: false },
  ]);
});

test("check of a states.yaml that names a state twice", async () => {
  expect(
    await Array.fromAsync(
      check({
        dir: "/abs/dir",
        exists: async () => true,
        readFiles: async () => [
          {
            path: "states.yaml",
            text: "- {state: s, of: [], seen: x, path: f/a}\n- {state: s, of: [], seen: x, path: f/a}",
          },
        ],
      }),
    ),
  ).toEqual<Event[]>([
    { type: "command-started", command: "check", dir: "/abs/dir" },
    ...[
      '"s" is named twice',
      's: the path f/a names "f", not an interface',
      's: the path f/a names "f", not an interface',
    ].map((message) => ({
      type: "problem" as const,
      file: "states.yaml",
      at: "",
      message,
    })),
    ...[0, 1].map(() => ({
      type: "gap" as const,
      kind: "state-not-reached" as const,
      name: "s",
      message: "its path f/a is not judged yet",
    })),
    { type: "command-finished", command: "check", ok: false },
  ]);
});

test("check tells a state whose path is not judged yet a gap, one judged not-shown a problem", async () => {
  const checked = async (more: Record<string, string>) =>
    (
      await Array.fromAsync(
        check({
          dir: "/abs/dir",
          exists: async () => true,
          readFiles: async () =>
            filesOf({
              ...points["a reference"],
              "states.yaml": "- {state: s, of: [S], seen: x, path: f/exists-a}",
              ...more,
            }),
        }),
      )
    ).filter(({ type }) => type === "problem" || type === "gap");
  const ofExtraction: Event[] = [
    {
      type: "gap",
      kind: "interface-not-bound",
      name: "f",
      message: "no trigger and no projection cites it",
    },
    {
      type: "gap",
      kind: "structure-not-shown",
      name: "S",
      message: "no projection shows it",
    },
  ];
  expect({
    notJudged: await checked({}),
    notShown: await checked(judgedAs(hash, "not-shown")),
  }).toEqual({
    notJudged: [
      ...ofExtraction,
      {
        type: "gap",
        kind: "state-not-reached",
        name: "s",
        message: "its path f/exists-a is not judged yet",
      },
    ],
    notShown: [
      {
        type: "problem",
        file: "states.yaml",
        at: "",
        message: "s: its path f/exists-a is judged not-shown",
      },
      ...ofExtraction,
    ],
  });
});
