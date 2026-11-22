import { expect, test } from "bun:test";
import { builderPrompt } from "../../src/agent/roles-build.ts";
import { bound, filesOf, hash, judgedAs, points } from "../roles-left-fixture.ts";

const files = filesOf({
  ...points["a reference"],
  ...judgedAs(hash),
  "states.yaml": `
- {state: s, of: [S], seen: reading the a shows it, path: f/exists-a}
- {state: t, of: [S], seen: reading the a shows it gone, path: f/answers}
`,
});

const toldWith = (reached: string) => [
  "The actors: u; null for a call by nobody.",
  "The operations a step may call, by their inputs, and what each answers:",
  "- f: takes nothing. Answers no structure a hole can read: the operation answers no structure.",
  reached,
];

const told = toldWith("The states reached now, a scenario may start from them: s.");

const ofG = [
  "The operation: g, GET /g.",
  "Your folder: exspec/roles/g/ — rules.yaml, hints.yaml and trigger.yaml are there; write each scenario as scenarios/<slug>.yaml there.",
];

test("a builder of an operation no path names is told the states reached now", () => {
  expect(
    builderPrompt({
      bound: { ...bound, interface: "g", pattern: "/g" },
      actors: ["u"],
      files,
    }),
  ).toEqual([...told, ...ofG].join("\n"));
});

test("a builder of an operation a path names is told each scenario of its that is a path, and what its after step shows", () => {
  expect(builderPrompt({ bound, actors: ["u"], files })).toEqual(
    [
      ...told,
      "The operation: f, GET /f/{a}.",
      "Your folder: exspec/roles/f/ — rules.yaml, hints.yaml and trigger.yaml are there; write each scenario as scenarios/<slug>.yaml there.",
      'Your scenario `exists-a` is the path of the state "s": others will start from it. It starts from no state and ends with an `after` step that shows: reading the a shows it.',
      'Your scenario `answers` is the path of the state "t": others will start from it. It starts from no state and ends with an `after` step that shows: reading the a shows it gone.',
    ].join("\n"),
  );
});

test("a builder is told no state is reached when none is", () => {
  expect(
    builderPrompt({
      bound: { ...bound, interface: "g", pattern: "/g" },
      actors: ["u"],
      files: filesOf({
        ...points["a reference"],
        "states.yaml": "- {state: s, of: [S], seen: x, path: f/exists-a}",
      }),
    }),
  ).toEqual(
    [...toldWith("No state is reached yet: a scenario starts from none."), ...ofG].join(
      "\n",
    ),
  );
});
