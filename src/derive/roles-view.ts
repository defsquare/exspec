import type { Problem } from "../shapes/extraction.ts";
import type {
  Common,
  Evidence,
  Judgement,
  RoleScenario,
  Rules,
} from "../shapes/roles.ts";
import type { Structure } from "../shapes/specification.ts";
import type { Interface, Target } from "../shapes/target.ts";
import { judgeTask } from "./judge-task.ts";
import { type Placed, placedOfRoles } from "./placing.ts";

// What one interface's folder holds, parsed; findings: what its reader's and its builder's
// checks say, each "file: message" relative to the folder
export type ReadInterface = {
  readonly bound: Interface;
  readonly rules: Rules | undefined;
  readonly findings: readonly string[];
  readonly scenarios: readonly {
    readonly slug: string;
    readonly scenario: RoleScenario;
  }[];
  readonly evidence: readonly { readonly slug: string; readonly evidence: Evidence }[];
  readonly judgements: readonly Judgement[];
};

export type Word =
  | "holds"
  | "contradicted"
  | "refused-unexpectedly"
  | "not-shown"
  | "unjudged";

const words: readonly Word[] = [
  "holds",
  "contradicted",
  "refused-unexpectedly",
  "not-shown",
  "unjudged",
];

// one line of an operation's reading, in the order it applies: the shared requirements it
// names, its own, its effects, what it answers
export type Line = {
  readonly kind: "requires" | "effect" | "answers";
  readonly rule: string;
  readonly shared: boolean;
  readonly input?: string;
  readonly fact?: string;
  readonly otherwise?: string;
  readonly status?: number;
  readonly body?: string;
  readonly when?: string;
  readonly says?: string;
  readonly short: string;
  readonly source?: string;
  readonly doubts: readonly string[];
};

// one step as it was sent, with what it answered; as it was written when it was not played.
// A service step: {when: arrange, as: null, service: s, is: c, body: <what it gives>}
export type StepView = {
  readonly when: string;
  readonly as: string | null;
  readonly service?: string;
  readonly is?: string;
  readonly method?: string;
  readonly path?: string;
  readonly query?: unknown;
  readonly body?: unknown;
  readonly status?: number;
  readonly answer?: unknown;
  readonly unplayable?: string;
};

export type ScenarioView = {
  readonly path: string;
  readonly operation: string;
  readonly rule: string;
  readonly situation?: string;
  readonly reached?: string;
  readonly steps: readonly StepView[];
  readonly judgement: {
    readonly verdict: Word;
    readonly confidence: number;
    readonly says: string;
    readonly stale: boolean;
  } | null;
};

export type RuleView = {
  readonly operation: string;
  readonly rule: string;
  readonly provenance: Word;
  readonly reason?: string;
  readonly by: readonly {
    readonly scenario: string;
    readonly verdict: Word;
    readonly confidence?: number;
    readonly says?: string;
    readonly stale?: boolean;
  }[];
};

export type RolesGap = {
  readonly kind:
    | "interface-not-read"
    | "reading-without-scenario"
    | "evidence-not-judged"
    | "judgement-stale"
    | "evidence-played-once";
  readonly name: string;
  readonly message: string;
};

// contradicted if one is, else refused-unexpectedly, else holds, else not-shown; unjudged
// when no scenario of the rule is judged
function wordOf(verdicts: readonly Word[]): Word {
  for (const word of [
    "contradicted",
    "refused-unexpectedly",
    "holds",
    "not-shown",
  ] as const) {
    if (verdicts.includes(word)) return word;
  }
  return "unjudged";
}

// "rules.yaml: a" of roles/f -> {file: "roles/f/rules.yaml", at: "", message: "a"};
// "no scenario for b" -> {file: "roles/f", at: "", message: "no scenario for b"}
function problemOf(folder: string, finding: string): Problem {
  const [, file, message] = /^([\w./-]+\.yaml): (.*)$/s.exec(finding) ?? [];
  return file === undefined || message === undefined
    ? { file: folder, at: "", message: finding }
    : { file: folder === "" ? file : `${folder}/${file}`, at: "", message };
}

function linesOf(rules: Rules, common: Common | undefined): readonly Line[] {
  const doubts = (rule: string) =>
    rules.unsure.filter((u) => u.rule === rule).map(({ what }) => what);
  return [
    ...rules.common.map((rule): Line => {
      const shared = common?.rules.find((r) => r.rule === rule);
      return shared === undefined
        ? {
            kind: "requires",
            rule,
            shared: true,
            short: "not a rule of common.yaml",
            doubts: doubts(rule),
          }
        : {
            kind: "requires",
            rule,
            shared: true,
            fact: shared.fact,
            otherwise: shared.otherwise.refusal,
            status: shared.otherwise.status,
            body: shared.otherwise.body,
            short: shared.fact,
            source: shared.source,
            doubts: doubts(rule),
          };
    }),
    ...rules.requires.map(
      ({ rule, on, when, fact, otherwise, source }): Line => ({
        kind: "requires",
        rule,
        shared: false,
        ...(on === undefined ? {} : { input: on }),
        ...(when === undefined ? {} : { when }),
        fact,
        otherwise: otherwise.refusal,
        status: otherwise.status,
        body: otherwise.body,
        short: fact,
        source,
        doubts: doubts(rule),
      }),
    ),
    ...rules.effects.map(
      ({ rule, when, says, source }): Line => ({
        kind: "effect",
        rule,
        shared: false,
        ...(when === undefined ? {} : { when }),
        says,
        short: says,
        source,
        doubts: doubts(rule),
      }),
    ),
    {
      kind: "answers",
      rule: "answers",
      shared: false,
      says: rules.answers.says,
      short: rules.answers.says,
      doubts: doubts("answers"),
    },
  ];
}

function stepsOf(
  scenario: RoleScenario | undefined,
  evidence: Evidence | undefined,
): readonly StepView[] {
  if (evidence !== undefined) {
    return evidence.exchanges.map((exchange): StepView => {
      if ("service" in exchange) {
        const { when, service, is } = exchange;
        return "unplayable" in exchange
          ? { when, as: null, service, is, unplayable: exchange.unplayable }
          : { when, as: null, service, is, ...givenOf(exchange.with) };
      }
      if ("unplayable" in exchange) {
        const { when, as, unplayable } = exchange;
        return { when, as, unplayable };
      }
      const { when, as, request, response } = exchange;
      return {
        when,
        as,
        method: request.method,
        path: request.path,
        ...(request.query === undefined ? {} : { query: request.query }),
        ...(request.body === undefined ? {} : { body: request.body }),
        status: response.status,
        answer: response.body,
      };
    });
  }
  return (scenario?.steps ?? []).map((step): StepView => {
    if ("service" in step) {
      const { when, service, is } = step;
      return { when, as: null, service, is, ...givenOf(step.with) };
    }
    const { when, as, request } = step;
    return {
      when,
      as,
      method: request.method,
      path: request.path,
      ...(request.query === undefined ? {} : { query: request.query }),
      ...(request.body === undefined ? {} : { body: request.body }),
    };
  });
}

// what a service step gives, shown as what it sent
const givenOf = (given: unknown) => (given === undefined ? {} : { body: given });

// The roles' reading, projected onto what view draws: each operation of a reading that
// parses, its lines judged by the judge's word, its scenarios with their steps, the problems
// of the checks and what the roles have not done yet. A judgement is stale when the text
// its judge would be given today is not the one it was given.
export function viewOfRoles({
  target,
  structures,
  common,
  findings,
  interfaces,
}: {
  readonly target: Target | undefined;
  readonly structures: readonly Structure[];
  readonly common: Common | undefined;
  // of structures.yaml and roles/common.yaml, each "file: message" relative to exspec/
  readonly findings: readonly string[];
  readonly interfaces: readonly ReadInterface[];
}) {
  const read = interfaces.flatMap((i) =>
    i.rules === undefined ? [] : [{ ...i, rules: i.rules }],
  );
  const scenarios = read.flatMap(({ bound, rules, scenarios, evidence, judgements }) => {
    const name = bound.interface;
    const { of } =
      evidence.length === 0
        ? { of: new Map<string, string>() }
        : judgeTask({ bound, common, rules, recordings: evidence });
    const slugs = [
      ...new Set([
        ...scenarios.map(({ slug }) => slug),
        ...evidence.map(({ slug }) => slug),
      ]),
    ].sort();
    return slugs.flatMap((slug): readonly ScenarioView[] => {
      const scenario = scenarios.find((s) => s.slug === slug)?.scenario;
      const played = evidence.find((e) => e.slug === slug)?.evidence;
      const rule = scenario?.rule ?? played?.rule;
      if (rule === undefined) return [];
      const judged = judgements.find((j) => j.scenario === slug);
      return [
        {
          path: `${name}/${slug}`,
          operation: name,
          rule,
          ...(scenario === undefined
            ? {}
            : { situation: scenario.situation, reached: String(scenario.reached) }),
          steps: stepsOf(scenario, played),
          judgement:
            judged === undefined
              ? null
              : {
                  verdict: judged.verdict,
                  confidence: judged.confidence,
                  says: judged.evidence,
                  stale: judged.of !== of.get(slug),
                },
        },
      ];
    });
  });
  const operations = read.map(({ bound, rules }) => ({
    path: bound.interface,
    operation: {
      operation: bound.interface,
      interface: { method: bound.method, pattern: bound.pattern },
      takes: rules.takes ?? {},
      answers: rules.answers,
      lines: linesOf(rules, common),
    },
  }));
  const rules = operations.flatMap(({ operation: { operation, lines } }) =>
    lines.map(({ rule }): RuleView => {
      const of = scenarios.filter((s) => s.operation === operation && s.rule === rule);
      const provenance = wordOf(of.flatMap(({ judgement }) => judgement?.verdict ?? []));
      const reason =
        of.length === 0
          ? "no scenario exercises it"
          : of.every(({ steps }) => steps.every(({ status }) => status === undefined))
            ? "not played yet"
            : "not judged yet";
      return {
        operation,
        rule,
        provenance,
        ...(provenance === "unjudged" ? { reason } : {}),
        by: of.map(({ path, judgement }) =>
          judgement === null
            ? { scenario: path, verdict: "unjudged" }
            : {
                scenario: path,
                verdict: judgement.verdict,
                confidence: judgement.confidence,
                says: judgement.says,
                stale: judgement.stale,
              },
        ),
      };
    }),
  );
  const gaps: readonly RolesGap[] = [
    ...interfaces
      .filter(({ rules }) => rules === undefined)
      .map(({ bound }) => ({
        kind: "interface-not-read" as const,
        name: bound.interface,
        message: "no reading of it parses",
      })),
    ...read
      .filter(
        ({ scenarios, evidence }) => scenarios.length === 0 && evidence.length === 0,
      )
      .map(({ bound }) => ({
        kind: "reading-without-scenario" as const,
        name: bound.interface,
        message: "no scenario exercises its rules",
      })),
    ...read.flatMap(({ bound, evidence, judgements }) =>
      evidence
        .filter(({ slug }) => !judgements.some(({ scenario }) => scenario === slug))
        .map(({ slug }) => ({
          kind: "evidence-not-judged" as const,
          name: `${bound.interface}/${slug}`,
          message: "it has been played, not judged",
        })),
    ),
    ...read.flatMap(({ bound, evidence }) =>
      evidence
        .filter(({ evidence: { noise } }) => noise === undefined)
        .map(({ slug }) => ({
          kind: "evidence-played-once" as const,
          name: `${bound.interface}/${slug}`,
          message: "played once: not a reference yet",
        })),
    ),
    ...scenarios
      .filter(({ judgement }) => judgement?.stale === true)
      .map(({ path }) => ({
        kind: "judgement-stale" as const,
        name: path,
        message: "its rule or its evidence changed since it was judged",
      })),
  ];
  const placed: readonly Placed[] = placedOfRoles(
    structures,
    read.map(({ rules }) => rules),
  );
  return {
    mode: "roles" as const,
    extraction: {
      target,
      structures,
      interfaces: interfaces.map(({ bound }) => bound),
      operations,
      scenarios,
      facts: [],
      projections: [],
      triggers: [],
      references: [],
    },
    common: common ?? null,
    problems: [
      ...findings.map((finding) => problemOf("", finding)),
      ...interfaces.flatMap(({ bound, findings }) =>
        findings.map((finding) => problemOf(`roles/${bound.interface}`, finding)),
      ),
    ],
    gaps,
    rules,
    bindings: [],
    counts: {
      rules: Object.fromEntries(
        words.map((word) => [word, rules.filter((r) => r.provenance === word).length]),
      ),
    },
    placed,
  };
}
