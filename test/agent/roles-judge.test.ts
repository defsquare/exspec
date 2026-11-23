import { expect, test } from "bun:test";
import type { Drive } from "../../src/agent/drive.ts";
import { rolesJudge } from "../../src/agent/roles-judge.ts";
import { filesOf, hash, points, stateHashIn } from "../roles-left-fixture.ts";
import { at, fakeIo } from "../run/fake.ts";

const written = {
  ...points["a reference"],
  "states.yaml": "- {state: s, of: [S], seen: x, path: f/exists-a}",
};

const entry = (scenario: string, verdict: string) => ({
  scenario,
  situation: "yes",
  verdict,
  confidence: 1,
  evidence: "e",
});

async function judgedWith(answer: readonly unknown[]) {
  const files = new Map(filesOf(written).map(({ path, text }) => [path, text]));
  const drive: Drive = async function* () {
    yield { type: "agent-said", text: JSON.stringify(answer) };
    return { session: "s1", ok: true };
  };
  const events = await Array.fromAsync(
    rolesJudge({
      dir: "/d",
      jobs: 1,
      model: "m",
      drive,
      io: fakeIo({}).io,
      readFiles: async () => [...files].map(([path, text]) => ({ path, text })),
      writeFile: async (_dir, path, text) => {
        files.set(path, text);
      },
      removeFile: async (_dir, path) => {
        files.delete(path);
      },
    }),
  );
  const text = files.get("operations/f/judgements.yaml");
  return {
    judgements: text === undefined ? undefined : Bun.YAML.parse(text),
    gates: events.flatMap((event) =>
      event.type === "gate-checked" ? [event.findings] : [],
    ),
    written: events.filter(({ type }) => type === "judgement-written"),
  };
}

test("the judge's entry for a state is written as the state's judgement on its path", async () => {
  expect(
    await judgedWith([entry("exists-a", "contradicted"), entry("state:s", "holds")]),
  ).toEqual({
    judgements: {
      model: "m",
      at,
      judgements: [
        { ...entry("exists-a", "contradicted"), rule: "exists", of: hash },
        { ...entry("exists-a", "holds"), state: "s", of: stateHashIn(written) },
      ],
    },
    gates: [[]],
    written: [
      {
        type: "judgement-written",
        interface: "f",
        scenario: "exists-a",
        rule: "exists",
        verdict: "contradicted",
        confidence: 1,
      },
      {
        type: "judgement-written",
        interface: "f",
        scenario: "exists-a",
        state: "s",
        verdict: "holds",
        confidence: 1,
      },
    ],
  });
});

test("an answer with no entry for a state judged on a path fails the judge's gate", async () => {
  expect(await judgedWith([entry("exists-a", "holds")])).toEqual({
    judgements: undefined,
    gates: [['no entry for "state:s"'], ['no entry for "state:s"']],
    written: [],
  });
});
