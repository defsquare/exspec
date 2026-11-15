import { z } from "zod";
import { type Judged, judgedSchema } from "../shapes/roles.ts";

const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n?```$/;

// The judge's last message -> one entry per recording, in the order of slugs; or what is
// wrong with it, a line the judge can fix:
//   '```json\n[{"scenario": "a", …}]\n```', [a] -> {judged: [{scenario: "a", …}]}
//   '[]', [a]                                  -> {findings: ['no entry for "a"']}
export function parseJudgeAnswer(
  said: string | undefined,
  slugs: readonly string[],
): { readonly judged: readonly Judged[] } | { readonly findings: readonly string[] } {
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
  const parsed = z.array(judgedSchema).safeParse(json);
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
    ...slugs
      .filter((slug) => !named.includes(slug))
      .map((slug) => `no entry for "${slug}"`),
    ...[...new Set(named.filter((name, i) => named.indexOf(name) !== i))].map(
      (name) => `two entries for "${name}"`,
    ),
    ...named
      .filter((name) => !slugs.includes(name))
      .map((name) => `an entry for "${name}", which is not a recording`),
  ];
  if (findings.length > 0) return { findings };
  return {
    judged: slugs.flatMap((slug) =>
      parsed.data.filter(({ scenario }) => scenario === slug),
    ),
  };
}
