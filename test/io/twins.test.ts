import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import serve from "../../src/io/serve.ts.txt" with { type: "text" };
import { type ServedTwins, serveTwins, tryTwin } from "../../src/io/twins.ts";

test("serving the twins writes serve.ts from the text exspec carries, over a stored copy", async () => {
  const dir = await mkdtemp(join(tmpdir(), "twins-"));
  try {
    const file = join(dir, "exspec/providers/serve.ts");
    await Bun.write(file, "// an older copy");
    const twins = await serveTwins(dir, []);
    if ("failed" in twins) throw new Error(twins.failed);
    await twins.stopTwins();
    expect(await Bun.file(file).text()).toEqual(serve);
  } finally {
    await rm(dir, { recursive: true });
  }
});

const twin = `
export const fresh = () => ({ kept: ["a"], refused: [] });
export const given = {
  "forgets-everything": (state) => ({ ...state, kept: [] }),
  refuses: (state, { address }) => {
    if (typeof address !== "string") throw new Error("address is no string");
    return { ...state, refused: [...state.refused, address] };
  },
  "changes-nothing": (state) => state,
};
export const answer = async () => new Response(null, { status: 404 });
`;

let dir = "";
let twins: ServedTwins | undefined;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "twins-"));
  await Bun.write(join(dir, "exspec/providers/p/twin.ts"), twin);
  const served = await serveTwins(dir, ["p"]);
  if ("failed" in served) throw new Error(served.failed);
  twins = served;
});

afterAll(async () => {
  await twins?.stopTwins();
  await rm(dir, { recursive: true });
});

async function put(path: string, body: unknown) {
  const answer = await fetch(`${twins?.at}/p${path}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  const text = await answer.text();
  return { status: answer.status, body: answer.ok ? JSON.parse(text) : text };
}

test("a condition gives the state it makes, and two compose in the order given", async () => {
  expect([
    await put("/__state", {}),
    await put("/__given", { condition: "refuses", with: { address: "u@x" } }),
    await put("/__given", { condition: "forgets-everything" }),
  ]).toEqual([
    { status: 200, body: { kept: ["a"], refused: [] } },
    { status: 200, body: { kept: ["a"], refused: ["u@x"] } },
    { status: 200, body: { kept: [], refused: ["u@x"] } },
  ]);
});

test("an unknown condition answers 404, one that raises 400 with its message", async () => {
  expect([
    await put("/__given", { condition: "lost" }),
    await put("/__given", { condition: "refuses", with: { address: 1 } }),
  ]).toEqual([
    { status: 404, body: "unknown condition lost" },
    { status: 400, body: "address is no string" },
  ]);
});

test("PUT /__state gives fresh() back, whatever its body", async () => {
  await put("/__given", { condition: "forgets-everything" });
  expect(await put("/__state", { kept: ["b"], other: 1 })).toEqual({
    status: 200,
    body: { kept: ["a"], refused: [] },
  });
});

test("a twin tried gives back each condition's answer on its fresh state", async () => {
  expect(
    await tryTwin(dir, "p", [
      { condition: "refuses", with: { address: "a" } },
      { condition: "changes-nothing", with: {} },
      { condition: "lost", with: {} },
    ]),
  ).toEqual({
    fresh: { kept: ["a"], refused: [] },
    again: { kept: ["a"], refused: [] },
    given: [
      { condition: "refuses", status: 200, state: { kept: ["a"], refused: ["a"] } },
      { condition: "changes-nothing", status: 200, state: { kept: ["a"], refused: [] } },
      { condition: "lost", status: 404, state: "unknown condition lost" },
    ],
  });
});
