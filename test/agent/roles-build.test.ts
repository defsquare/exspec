import { expect, test } from "bun:test";
import { builderPrompt } from "../../src/agent/roles-build.ts";

test("the builder is told each service that passes its check by its file, and nothing of the providers", () => {
  expect(
    builderPrompt({
      bound: {
        interface: "a",
        method: "post",
        pattern: "/a",
        request: {},
        responses: { "200": { body: "any" } },
      },
      actors: ["u", "v"],
      files: [
        {
          path: "services/s.yaml",
          text: "{service: s, says: keeps documents, conditions: []}",
        },
        { path: "services/t.yaml", text: "service: [" },
        { path: "providers/p/provider.yaml", text: "" },
      ],
    }),
  ).toEqual(
    [
      "The operation: a, POST /a.",
      "Your folder: exspec/roles/a/ — rules.yaml and hints.yaml are there; write each scenario as scenarios/<slug>.yaml there.",
      "The actors: u, v; null for a call by nobody.",
      "A service: s — keeps documents. Its conditions: exspec/services/s.yaml.",
    ].join("\n"),
  );
});
