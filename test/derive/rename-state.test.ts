import { expect, test } from "bun:test";
import { renameState } from "../../src/derive/rename-state.ts";
import { leftOf } from "../../src/derive/roles-left.ts";
import { pathsOf } from "../../src/derive/states-files.ts";
import type { SourceFile } from "../../src/shapes/extraction.ts";
import {
  bound,
  type Files,
  filesOf,
  hash,
  judgedAs,
  pathed,
  points,
  stateHashIn,
} from "../roles-left-fixture.ts";

const states = `- state: s
  of: [S]
  seen: reading the f shows it
  path: f/exists-a
- {state: other, of: [S], seen: "x", path: f/exists-a}
`;

const written: Files = { ...points["a reference"], ...pathed, "states.yaml": states };

const judged: Files = judgedAs(hash, "holds", {
  of: stateHashIn(written),
  verdict: "holds",
});

const withBody = `
rule: exists
situation: an id no item has
reached: yes
steps:
  - {when: call, as: u, request: {method: post, path: /f, body: {state: s}}}
`;

const at = (more: Files = {}) => filesOf({ ...written, ...judged, ...more });

const textOf = (files: readonly SourceFile[], path: string) =>
  files.find((file) => file.path === path)?.text ?? "";

const applied = (files: readonly SourceFile[], rewritten: readonly SourceFile[]) =>
  files.map((file) => rewritten.find(({ path }) => path === file.path) ?? file);

test("a state renamed is renamed in states.yaml, in the scenarios that start from it and in its judgement, nothing else", () => {
  const files = at({ "operations/f/scenarios/exists-c.yaml": withBody });
  expect(renameState({ files, from: "s", to: "t" })).toEqual({
    files: [
      {
        path: "states.yaml",
        text: states.replace("- state: s\n", "- state: t\n"),
      },
      {
        path: "operations/f/scenarios/exists-b.yaml",
        text: textOf(files, "operations/f/scenarios/exists-b.yaml").replace(
          "{when: arrange, state: s, name: p}",
          "{when: arrange, state: t, name: p}",
        ),
      },
      {
        path: "operations/f/judgements.yaml",
        text: textOf(files, "operations/f/judgements.yaml").replace(
          "state: s}",
          "state: t}",
        ),
      },
    ],
  });
});

test("a rename is refused, nothing rewritten, when it cannot be done whole", () => {
  const refused = (more: Files, from = "s", to = "t") =>
    renameState({ files: at(more), from, to });
  expect({
    notAState: refused({}, "q"),
    taken: refused({}, "s", "other"),
    notAName: refused({}, "s", "T t"),
    statesUnparsed: refused({ "states.yaml": "- state: [" }),
    citingUnparsed: refused({
      "operations/f/scenarios/exists-d.yaml": "steps: [{state: s",
    }),
    bodyAndStep: refused({
      "operations/f/scenarios/exists-b.yaml": `
rule: exists
situation: an id no item has
reached: yes
steps:
  - {when: arrange, state: s, name: p}
  - {when: call, as: u, request: {method: post, path: /f, body: {state: s}}}
`,
    }),
  }).toEqual({
    notAState: { refused: '"q" is not a state of states.yaml' },
    taken: { refused: '"other" is a state of states.yaml already' },
    notAName: { refused: '"T t" is not a name: lower-case words joined by dashes' },
    statesUnparsed: {
      refused:
        "states.yaml does not parse: states.yaml: not YAML: YAML Parse error: Unexpected token",
    },
    citingUnparsed: {
      refused:
        "operations/f/scenarios/exists-d.yaml does not parse: operations/f/scenarios/exists-d.yaml: not YAML: YAML Parse error: Unexpected token",
    },
    bodyAndStep: {
      refused:
        'operations/f/scenarios/exists-b.yaml: "s" is written there other than as a state',
    },
  });
});

test("a rename leaves nothing to record or judge that was not, and every state reached as it was", () => {
  const before = at();
  const renamed = renameState({ files: before, from: "s", to: "t" });
  const after = "files" in renamed ? applied(before, renamed.files) : before;
  const left = (files: readonly SourceFile[]) => leftOf({ files, interfaces: [bound] });
  const named = (files: readonly SourceFile[]) =>
    JSON.parse(JSON.stringify(pathsOf(files)).replaceAll('"state":"t"', '"state":"s"'));
  expect({ left: left(after), paths: named(after) }).toEqual({
    left: left(before),
    paths: pathsOf(before),
  });
});
