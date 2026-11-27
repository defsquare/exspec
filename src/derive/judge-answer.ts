import { z } from "zod";
import { type Judged, judgedSchema, type Met, metSchema } from "../shapes/roles.ts";

const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n?```$/;

const sameNames = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((name) => b.includes(name));

// The judge's last message -> one entry per part of its task — a recording, a state judged
// on one, or the conditions met on one: "a", "state:s", "when:a" — in the order of the
// parts; or what is wrong with it, a line the judge can fix. A `when:` part's entry names
// every rule of `conditionalRules`, and no other:
//   '```json\n[{"scenario": "a", …}]\n```', [a] -> {judged: [{scenario: "a", …}]}
//   '[]', [a]                                  -> {findings: ['no entry for "a"']}
export function parseJudgeAnswer(
  said: string | undefined,
  parts: readonly string[],
  conditionalRules: readonly string[],
):
  | { readonly judged: readonly (Judged | Met)[] }
  | { readonly findings: readonly string[] } {
  if (said === undefined) return { findings: ["no answer: one JSON array is expected"] };
  const trimmed = said.trim();
  const text = fenced.exec(trimmed)?.[1] ?? trimmed;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      findings: [`the answer is not one JSON array and nothing else: ${message}`],
    };
  }
  // an entry with `met` is read as conditions met, any other as a verdict: a union would
  // say "Invalid input" where the judge needs the key that is wrong
  const parsed = z
    .array(
      z.unknown().transform((entry, ctx): Judged | Met => {
        const read =
          typeof entry === "object" && entry !== null && "met" in entry
            ? metSchema.safeParse(entry)
            : judgedSchema.safeParse(entry);
        if (read.success) return read.data;
        for (const { path, message } of read.error.issues)
          ctx.addIssue({ code: "custom", path, message });
        return z.NEVER;
      }),
    )
    .safeParse(json);
  if (!parsed.success) {
    return {
      findings: parsed.error.issues.map(
        ({ path, message }) =>
          `${path.map(String).join(".") || "the answer"}: ${message}`,
      ),
    };
  }
  const named = parsed.data.map(({ scenario }) => scenario);
  const findings = [
    ...parts
      .filter((part) => !named.includes(part))
      .map((part) => `no entry for "${part}"`),
    ...[...new Set(named.filter((name, i) => named.indexOf(name) !== i))].map(
      (name) => `two entries for "${name}"`,
    ),
    ...named
      .filter((name) => !parts.includes(name))
      .map((name) => `an entry for "${name}", which is not a part`),
    ...parsed.data.flatMap((entry) => {
      const isWhen = entry.scenario.startsWith("when:");
      if ("met" in entry) {
        if (!isWhen) return [`"${entry.scenario}" expects a verdict, not conditions met`];
        return sameNames(Object.keys(entry.met), conditionalRules)
          ? []
          : [
              `"${entry.scenario}" must name the conditions ${conditionalRules.join(", ")}, and no other`,
            ];
      }
      return isWhen
        ? [`"${entry.scenario}" expects the conditions met, not a verdict`]
        : [];
    }),
  ];
  if (findings.length > 0) return { findings };
  return {
    judged: parts.flatMap((part) =>
      parsed.data.filter(({ scenario }) => scenario === part),
    ),
  };
}
