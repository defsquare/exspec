import { readingsToTake, requestsOfReading } from "../derive/reading.ts";
import { requestOf, UnplayableCall } from "../derive/request.ts";
import type { Event } from "../shapes/event.ts";
import type { Extraction } from "../shapes/extraction.ts";
import type { PlayedScenario, Reading, Run, Scenario } from "../shapes/scenario.ts";
import type { Credentials, Target } from "../shapes/target.ts";
import type { Io } from "./io.ts";
import { resetTarget, startTarget, stopTarget } from "./lifecycle.ts";

// each arrange call; every reading; the act call; every reading again. The run says when
// and on what.
export async function playScenario({
  scenario: { scenario, says, proves, assert, arrange, act },
  extraction,
  credentials,
  send,
  run,
}: {
  readonly scenario: Scenario;
  readonly extraction: Extraction;
  readonly credentials: Credentials;
  readonly send: Io["send"];
  readonly run: Run;
}): Promise<PlayedScenario> {
  const answer = async ({ call }: Scenario["act"]) => ({
    call,
    response: await send(requestOf({ call, extraction, credentials })),
  });
  const takes = readingsToTake({ scenario: { act, assert }, extraction });
  const requests = takes.map((take) =>
    requestsOfReading({ ...take, call: act.call, extraction, credentials }),
  );
  const read = async () => {
    const entries: Reading["before"][] = [];
    for (const each of requests) {
      const answered: Reading["before"][number][] = [];
      for (const request of each) {
        answered.push("unreadable" in request ? request : await send(request));
      }
      entries.push(answered);
    }
    return entries;
  };
  const played: PlayedScenario["arrange"][number][] = [];
  for (const call of arrange) played.push(await answer(call));
  const before = await read();
  const judged = await answer(act);
  const after = await read();
  return {
    scenario,
    says,
    proves,
    assert,
    run,
    arrange: played,
    act: judged,
    readings: takes.map(({ of, as }, i) => ({
      of,
      as,
      before: before[i] ?? [],
      after: after[i] ?? [],
    })),
  };
}

export type Selected = readonly { readonly path: string; readonly scenario: Scenario }[];

export type Playing = {
  readonly dir: string;
  readonly target: Target;
  readonly extraction: Extraction;
  readonly io: Io;
};

// path -> its played copy; a scenario that cannot be played is an event, not a copy
export async function* playEach(
  { dir, target, extraction, io }: Playing,
  scenarios: Selected,
  credentials: Credentials,
): AsyncGenerator<Event, ReadonlyMap<string, PlayedScenario>> {
  const played = new Map<string, PlayedScenario>();
  for (const { path, scenario } of scenarios) {
    yield* resetTarget({ dir, target, io });
    const run = { target: target.target, version: io.version, at: io.now(), clock: null };
    try {
      const copy = await playScenario({
        scenario,
        extraction,
        credentials,
        send: io.send,
        run,
      });
      played.set(path, copy);
      yield { type: "scenario-played", path, played: copy };
    } catch (error) {
      if (!(error instanceof UnplayableCall)) throw error;
      yield { type: "scenario-unplayable", path, message: error.message };
    }
  }
  return played;
}

// start, seed, play, stop: one execution on a fresh stack
export async function* playOnFreshStack(
  playing: Playing,
  scenarios: Selected,
): AsyncGenerator<Event, ReadonlyMap<string, PlayedScenario>> {
  const { dir, target, io } = playing;
  yield* startTarget({ dir, target, io });
  const credentials = await io.readCredentials(dir, target);
  const played = yield* playEach(playing, scenarios, credentials);
  yield* stopTarget({ dir, target, io });
  return played;
}
