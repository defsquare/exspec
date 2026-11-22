import type { Evidence, Exchange, Json, PlayableScenario } from "../shapes/roles.ts";
import type { Difference, Place } from "../shapes/scenario.ts";
import type { Callable } from "./callables.ts";
import { comparePlaces } from "./compare.ts";
import { fillGiven } from "./holes.ts";
import { deepEqual } from "./json.ts";
import {
  type Answer,
  answerPlaces,
  type Marked,
  markPlaces,
  type Valued,
} from "./noise.ts";
import { readOfStep, sentOfStep } from "./step-sent.ts";

// An unplayable exchange answered nothing:
//   [{call, response: r0}, {call, unplayable: "…"}, …] -> [{at: [exchanges, 0, response], response: r0}]
export function evidenceAnswers({ exchanges }: Evidence): readonly Answer[] {
  return exchanges.flatMap((exchange, i): readonly Answer[] =>
    "response" in exchange
      ? [{ at: ["exchanges", i, "response"], response: exchange.response }]
      : [],
  );
}

const playedOf = ({ exchanges }: Evidence) =>
  exchanges.filter((exchange) => !("unplayable" in exchange)).length;

// Two copies are comparable when they have as many exchanges, all of them played;
// otherwise the one place that differs is their counts — of exchanges when those differ,
// of those played when an exchange could not be played:
//   3 exchanges and 2 -> {first: 3, second: 2};  2 and 2, one unplayable -> {first: 2, second: 1}
function counts(
  a: Evidence,
  b: Evidence,
): { readonly first: number; readonly second: number } | undefined {
  if (a.exchanges.length !== b.exchanges.length) {
    return { first: a.exchanges.length, second: b.exchanges.length };
  }
  const first = playedOf(a);
  const second = playedOf(b);
  return first === a.exchanges.length && second === first ? undefined : { first, second };
}

// side-effects absent counts null, present its length; the exchanges where they differ:
//   [{side-effects: [e, e]}, {}]  [{side-effects: [e]}, {side-effects: []}]
//   -> [exchanges, 0, side-effects] 2 1,  [exchanges, 1, side-effects] null 0
function sideEffectCounts(
  a: Evidence,
  b: Evidence,
): readonly {
  readonly at: Place;
  readonly first: number | null;
  readonly second: number | null;
}[] {
  const count = (exchange: Exchange | undefined) =>
    exchange !== undefined && "response" in exchange
      ? (exchange["side-effects"]?.length ?? null)
      : null;
  return a.exchanges.flatMap((exchange, i) => {
    const first = count(exchange);
    const second = count(b.exchanges[i]);
    return first === second
      ? []
      : [{ at: ["exchanges", i, "side-effects"], first, second }];
  });
}

// What a target says outward is compared, what a provider answered it is kept (ADR-0018):
//   [p, observable], [p, request, method]                  equal
//   [p, request, path], [p, request, query], [p, request, body]   walked
//   [p, response]                                          kept
// p = [exchanges, i, side-effects, j]; each exchange's side effects before its answer,
// in the order they came. What a service step gave is the scenario's, as a request is:
//   [exchanges, i, with]                                   kept
function evidencePlaces({ exchanges }: Evidence): readonly Valued[] {
  return exchanges.flatMap((exchange, i): readonly Valued[] => {
    if ("service" in exchange) {
      return "with" in exchange
        ? [{ at: ["exchanges", i, "with"], value: exchange.with, kind: "kept" }]
        : [];
    }
    if (!("response" in exchange)) return [];
    const effects = (exchange["side-effects"] ?? []).flatMap(
      ({ observable, request: { method, path, query, body }, response }, j) => {
        const at = ["exchanges", i, "side-effects", j];
        return [
          { at: [...at, "observable"], value: observable, kind: "equal" },
          { at: [...at, "request", "method"], value: method, kind: "equal" },
          { at: [...at, "request", "path"], value: path, kind: "walked" },
          { at: [...at, "request", "query"], value: query, kind: "walked" },
          { at: [...at, "request", "body"], value: body, kind: "walked" },
          { at: [...at, "response"], value: response, kind: "kept" },
        ] satisfies readonly Valued[];
      },
    );
    return [
      ...effects,
      ...answerPlaces([
        { at: ["exchanges", i, "response"], response: exchange.response },
      ]),
    ];
  });
}

// markNoise for two copies of an evidence, its places starting at the exchange:
//   2 exchanges and 1 -> {stable: false, differences: [{at: [exchanges], first: 2, second: 1}]}
export function noiseBetween(first: Evidence, second: Evidence): Marked {
  const unequal = counts(first, second);
  if (unequal !== undefined) {
    return { stable: false, differences: [{ at: ["exchanges"], ...unequal }] };
  }
  const differences = sideEffectCounts(first, second);
  return differences.length > 0
    ? { stable: false, differences }
    : markPlaces(evidencePlaces(first), evidencePlaces(second));
}

// an evidence played twice: its noise is known, even when there is none
export type EvidenceReference = Evidence & {
  readonly noise: NonNullable<Evidence["noise"]>;
};

// compareWithReference for an evidence that has its noise:
//   2 exchanges against 1 -> [{at: [exchanges], expected: 2, actual: 1}]
export function compareEvidence(
  reference: EvidenceReference,
  played: Evidence,
): readonly Difference[] {
  const unequal = counts(reference, played);
  if (unequal !== undefined) {
    return [{ at: ["exchanges"], expected: unequal.first, actual: unequal.second }];
  }
  const differences = sideEffectCounts(reference, played);
  return differences.length > 0
    ? differences.map(({ at, first, second }) => ({
        at,
        expected: first,
        actual: second,
      }))
    : comparePlaces({
        reference: evidencePlaces(reference),
        noise: reference.noise,
        played: evidencePlaces(played),
        root: played,
      });
}

// An evidence is of a scenario as written when it names its rule and, step by step, sent
// the step's request — a call's through its operation's trigger, holes filled from the
// evidence's own answers, as playSteps does:
//   step {name: m, path: "/a"}, {path: "/b/{{m.body.id}}"}; m answered {body: {id: 7}}
//   -> the second exchange must have sent "/b/7"
export function isAsWritten(
  scenario: PlayableScenario,
  evidence: Evidence,
  callables: readonly Callable[],
): boolean {
  if (evidence.rule !== scenario.rule) return false;
  if (evidence.exchanges.length !== scenario.steps.length) return false;
  const answers = new Map<string, Json>();
  return scenario.steps.every((step, i) => {
    const exchange = evidence.exchanges[i];
    if (exchange === undefined || exchange.when !== step.when) return false;
    if ("service" in step) {
      if (!("service" in exchange) || "unplayable" in exchange) return false;
      const filled = fillGiven(step.with ?? {}, answers);
      return (
        exchange.service === step.service &&
        exchange.is === step.is &&
        "given" in filled &&
        deepEqual(filled.given, exchange.with ?? {})
      );
    }
    const { as, name } = step;
    if (!("response" in exchange) || exchange.as !== as) return false;
    const filled = sentOfStep(step, answers, callables);
    if ("unplayable" in filled || !deepEqual(filled.sent, exchange.request)) return false;
    const read = readOfStep(step, exchange.response, callables);
    if (name !== undefined && read !== undefined) answers.set(name, read);
    return true;
  });
}
