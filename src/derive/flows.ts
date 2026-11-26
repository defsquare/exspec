import type { Rules } from "../shapes/roles.ts";

type Case = { readonly when: string; readonly effects: readonly string[] };

export type Flows = {
  // where a call is refused: on an input alone, or on the situation
  readonly exits: {
    readonly onInput: readonly Exit[];
    readonly onSituation: readonly Exit[];
  };
  // what every accepted call does
  readonly line: readonly string[];
  // what an accepted call does by what it was given, one entry per input
  readonly variants: readonly { readonly on: string; readonly cases: readonly Case[] }[];
  // what an accepted call does by the situation it finds: where the flow turns
  readonly turns: readonly Case[];
};

type Exit = { readonly rule: string; readonly on?: string; readonly otherwise: string };

// [{when: w, rule: a}, {when: v, rule: b}, {when: w, rule: c}]
//   -> [{when: w, effects: [a, c]}, {when: v, effects: [b]}]
// ponytail: two `when`s are one case when their text is the same; two sentences that say
// one situation are two cases, until a rule names the situation.
function casesOf(
  effects: readonly { readonly rule: string; readonly when: string }[],
): readonly Case[] {
  return [...new Set(effects.map(({ when }) => when))].map((when) => ({
    when,
    effects: effects.filter((effect) => effect.when === when).map(({ rule }) => rule),
  }));
}

// The flows of an operation, from its rules alone: nothing of it is stored.
//   requires [{rule: r, on: x, otherwise: o}, {rule: s, otherwise: p}]
//   effects  [{rule: a}, {rule: b, when: w, on: x}, {rule: c, when: v}]
//   -> {exits: {onInput: [{rule: r, on: x, otherwise: o}], onSituation: [{rule: s, otherwise: p}]},
//       line: [a], variants: [{on: x, cases: [{when: w, effects: [b]}]}],
//       turns: [{when: v, effects: [c]}]}
export function flowsOf({ requires, effects }: Rules): Flows {
  const exits = requires.map(
    ({ rule, on, otherwise }): Exit =>
      on === undefined ? { rule, otherwise } : { rule, on, otherwise },
  );
  const conditional = effects.flatMap(({ rule, when, on }) =>
    when === undefined ? [] : [{ rule, when, on }],
  );
  const inputs = [...new Set(conditional.flatMap(({ on }) => on ?? []))];
  return {
    exits: {
      onInput: exits.filter(({ on }) => on !== undefined),
      onSituation: exits.filter(({ on }) => on === undefined),
    },
    line: effects.filter(({ when }) => when === undefined).map(({ rule }) => rule),
    variants: inputs.map((input) => ({
      on: input,
      cases: casesOf(conditional.filter(({ on }) => on === input)),
    })),
    turns: casesOf(conditional.filter(({ on }) => on === undefined)),
  };
}
