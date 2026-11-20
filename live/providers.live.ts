import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { standProviders, TwinsNotServed } from "../src/io/providers.ts";
import type { Observable } from "../src/shapes/target.ts";

const twin = `
export const fresh = () => ({ made: 0, refused: [] });
export const given = {
  refuses: (state, { address }) => ({ ...state, refused: [...state.refused, address] }),
};
export const answer = async (state, request, path) => {
  state.made += 1;
  return Response.json({ made: state.made, path, refused: state.refused });
};
`;

const dir = await mkdtemp(join(tmpdir(), "exspec-providers-"));
await Bun.write(join(dir, "exspec/providers/p/twin.ts"), twin);
await Bun.write(
  join(dir, "exspec/providers/p/provider.yaml"),
  "{provider: p, renders: s, state: {shape: {made: int}, says: a}, expects: []}",
);

afterAll(() => rm(dir, { recursive: true }));

const port = 9188;

const observable = (name: string): Observable => ({ observable: name, kind: "provider" });

test("a twin stood by exspec answers through the proxy, is recorded, takes a condition, and is reset to its fresh state", async () => {
  const providers = await standProviders({
    dir,
    proxy: { port, quiet: 50 },
    observables: [observable("p")],
  });
  try {
    const call = () =>
      fetch(`http://127.0.0.1:${port}/p/b`, { method: "POST" }).then((answer) =>
        answer.json(),
      );
    const first = await call();
    const taken = await providers.takeSideEffects();
    const given = await providers.giveCondition({
      service: "s",
      condition: "refuses",
      with: { address: "u@x" },
    });
    const refused = await call();
    const unknown = await providers.giveCondition({
      service: "s",
      condition: "lost",
      with: {},
    });
    const unrendered = await providers.giveCondition({
      service: "t",
      condition: "refuses",
      with: {},
    });
    await providers.resetProviders();
    const afterReset = await call();
    expect({ first, taken, given, refused, unknown, unrendered, afterReset }).toEqual({
      first: { made: 1, path: "/b", refused: [] },
      taken: [
        {
          observable: "p",
          request: { method: "post", path: "/b" },
          response: { status: 200, body: { made: 1, path: "/b", refused: [] } },
        },
      ],
      given: { taken: true },
      refused: { made: 2, path: "/b", refused: ["u@x"] },
      unknown: { refused: "p answered 404: unknown condition lost" },
      unrendered: { refused: "no provider renders t" },
      afterReset: { made: 1, path: "/b", refused: [] },
    });
  } finally {
    await providers.stopProviders();
  }
});

test("a provider with no twin written is not stood", async () => {
  const stood = standProviders({
    dir,
    proxy: { port, quiet: 50 },
    observables: [observable("p"), observable("q")],
  });
  await expect(stood).rejects.toEqual(
    new TwinsNotServed(
      "exspec/providers/serve.ts did not serve the twins of p, q: GET /q/__state answered 404: no such twin",
    ),
  );
});
