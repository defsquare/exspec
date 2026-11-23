import { render, Static, Text, useApp } from "ink";
import { useEffect, useState } from "react";
import type {
  BindingJudged,
  BindingVerdict,
  Event,
  RuleJudged,
} from "../shapes/event.ts";
import { onTarget } from "./command-line.ts";

// {verdict: refuted, expected: "y declared 404", observed: 401} -> "y declared 404, answered 401"
function bindingLine({ verdict, expected, observed }: BindingVerdict): string {
  if (observed === undefined) return verdict;
  return expected === undefined
    ? `answered ${observed}`
    : `${expected}, answered ${observed}`;
}

// the scenarios that make the provenance, or all of them when none does
function ruleBy({ provenance, by }: RuleJudged): string {
  const making = by.filter(({ verdict }) => verdict === provenance);
  return (making.length > 0 ? making : by)
    .map(({ scenario, verdict, reason }) => {
      const said =
        verdict === provenance ? reason : `${verdict}${reason ? `: ${reason}` : ""}`;
      return said === undefined ? scenario : `${scenario} (${said})`;
    })
    .join(", ");
}

function bindingBy({ provenance, by }: BindingJudged): string {
  const making = by.filter(({ verdict }) => verdict === provenance);
  return (making.length > 0 ? making : by)
    .map(({ scenario, ...verdict }) =>
      verdict.verdict === provenance && verdict.observed === undefined
        ? scenario
        : `${scenario}: ${bindingLine(verdict)}`,
    )
    .join(", ");
}

// "up" -> "target up"; "roles-read" -> "roles read"; "providers-write-twin" ->
// "providers write-twin"; "check" -> "check"
function typedAs(command: string): string {
  if (onTarget.includes(command)) return `target ${command}`;
  return command.startsWith("roles-") ||
    command.startsWith("providers-") ||
    command.startsWith("states-")
    ? command.replace("-", " ")
    : command;
}

// the session an event comes from, when several run at once: "[i] " for a role on i;
// "" for a phase, or a roles' step
function from(event: Event): string {
  return "role" in event && event.type !== "roles-queued"
    ? `[${event.interface ?? event.provider ?? event.role}] `
    : "";
}

const verdictLine = (verdicts: Readonly<Record<string, number>>) =>
  Object.entries(verdicts)
    .map(([verdict, count]) => `${count} ${verdict}`)
    .join(", ");

export function describeEvent(event: Event): string {
  switch (event.type) {
    case "command-started":
      return `${typedAs(event.command)} ${event.dir}`;
    case "extraction-not-found":
      return `no extraction in ${event.dir}: ${event.expected} is missing`;
    case "problem":
      return `problem  ${event.file}${event.at ? ` ${event.at}` : ""}: ${event.message}`;
    case "gap":
      return `gap      ${event.kind} ${event.name}`;
    case "extraction-counted":
      return Object.entries(event.counts)
        .map(([name, count]) => `${count} ${name}`)
        .join(", ");
    case "extraction-phases":
      return `phases   ${Object.entries(event.phases)
        .map(([phase, progress]) => `${phase} ${progress}`)
        .join(", ")}`;
    case "target-step":
      return `target   ${event.step} ${event.state}`;
    case "scenario-played":
      return `played   ${event.path}  ${event.played.act.response.status}`;
    case "scenario-unplayable":
      return `unplayable ${event.path}: ${event.message}`;
    case "reference-written":
      return `written  ${event.path}  ${event.noise} noisy`;
    case "reference-kept":
      return `kept     ${event.path}  a reference exists, --force to replace it`;
    case "scenario-unstable":
      return [
        `unstable ${event.path}`,
        ...event.differences.map(
          ({ at, first, second }) =>
            `  ${at.join(".")}: ${JSON.stringify(first)}, then ${JSON.stringify(second)}`,
        ),
      ].join("\n");
    case "scenario-replayed":
      return event.differences.length === 0
        ? `replayed ${event.path}  green`
        : `replayed ${event.path}  red  ${event.differences
            .map(
              ({ at, expected, actual }) =>
                `${at.join(".")}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
            )
            .join("\n  ")}`;
    case "scenario-judged":
      return `judged   ${event.path}  ${[
        ...event.rules.map(
          ({ rule, verdict, reason }) =>
            `${rule} ${verdict}${reason === undefined ? "" : ` (${reason})`}`,
        ),
        `binding ${bindingLine(event.binding)}`,
      ].join(", ")}`;
    case "rule-judged":
      return `rule     ${event.operation}/${event.rule}  ${event.provenance}  ${
        event.by.length === 0 ? (event.reason ?? "") : `by ${ruleBy(event)}`
      }`;
    case "binding-judged":
      return `binding  ${event.trigger}  ${event.provenance}${
        event.by.length === 0 ? "" : `  by ${bindingBy(event)}`
      }`;
    case "extraction-judged":
      return `judged   rules ${Object.entries(event.rules)
        .map(([provenance, count]) => `${count} ${provenance}`)
        .join(", ")}; bindings ${Object.entries(event.bindings)
        .map(([provenance, count]) => `${count} ${provenance}`)
        .join(", ")}`;
    case "fact-blocks":
      return `blocks   ${event.fact} (${event.why}): ${event.rules.length} rules`;
    case "not-observed":
      return "side effects are not observed: a refused call that still wrote something is not seen";
    case "phase-started":
      return `phase    ${event.phase}`;
    case "phase-skipped":
      return `phase    ${event.phase} done already`;
    case "gate-checked":
      return [
        `${from(event)}gate     ${"step" in event ? event.step : event.role} ${event.ok ? "passed" : "failed"}`,
        ...event.findings.map((finding) => `  ${finding}`),
      ].join("\n");
    case "phase-finished":
      return `phase    ${event.phase} ${event.ok ? "done" : "failed"}`;
    case "agent-said":
      return `${from(event)}agent    ${event.text.replace(/\n[\s\S]*/, "").slice(0, 160)}`;
    case "agent-used":
      return `${from(event)}  ${event.tool}  ${event.about}`;
    case "agent-ended":
      return `${from(event)}agent    ended: ${event.turns} turns, ${event.seconds} s${
        event.cost === undefined ? "" : `, $${event.cost.toFixed(2)}`
      }`;
    case "role-started":
      return `${from(event)}role     ${event.role}`;
    case "role-skipped":
      return `${from(event)}role     ${event.role} skipped: ${event.why}`;
    case "role-failed":
      return `${from(event)}role     ${event.role} failed: ${event.message}`;
    case "role-finished":
      return `${from(event)}role     ${event.role} ${event.ok ? "done" : "failed"}`;
    case "roles-queued":
      return `roles    ${event.count} ${event.role}s queued`;
    case "steps-played":
      return `[${event.interface}] played   ${event.scenario}  ${event.evidence.exchanges
        .map((exchange) =>
          "unplayable" in exchange
            ? `unplayable: ${exchange.unplayable}`
            : "service" in exchange
              ? `${exchange.when} ${exchange.service} is ${exchange.is}`
              : `${exchange.when} ${exchange.response.status}`,
        )
        .join(", ")}`;
    case "judgement-written":
      return `[${event.interface}] judged   ${event.scenario}  ${"rule" in event ? event.rule : `state ${event.state}`} ${event.verdict} (${event.confidence})`;
    case "roles-counted":
      return `judged   ${verdictLine(event.verdicts)}`;
    case "state-renamed":
      return `renamed  ${event.from} -> ${event.to} in ${event.files.join(", ")}`;
    case "command-failed":
      return `failed   ${event.message}`;
    case "command-finished":
      return `${event.command} ${event.ok ? "ok" : "failed"}`;
    default: {
      const unreachable: never = event;
      return unreachable;
    }
  }
}

function Events({
  events,
  onLast,
}: {
  readonly events: AsyncIterable<Event>;
  readonly onLast: (last: Event | undefined) => void;
}) {
  const { exit } = useApp();
  const [lines, setLines] = useState<
    readonly { readonly id: number; readonly text: string }[]
  >([]);
  const [end, setEnd] = useState<{ readonly error?: Error } | undefined>();
  useEffect(() => {
    (async () => {
      let last: Event | undefined;
      for await (const event of events) {
        setLines((l) => [...l, { id: l.length, text: describeEvent(event) }]);
        last = event;
      }
      return last;
    })().then(
      (last) => {
        onLast(last);
        setEnd({});
      },
      (error: unknown) =>
        setEnd({ error: error instanceof Error ? error : new Error(String(error)) }),
    );
  }, [events, onLast]);
  useEffect(() => {
    if (end) exit(end.error);
  }, [end, exit]);
  return (
    <Static items={[...lines]}>{({ id, text }) => <Text key={id}>{text}</Text>}</Static>
  );
}

// returns the last event shown
export async function renderTerminal(
  events: AsyncIterable<Event>,
): Promise<Event | undefined> {
  const { promise, resolve } = Promise.withResolvers<Event | undefined>();
  const app = render(<Events events={events} onLast={resolve} />);
  await app.waitUntilExit();
  return promise;
}
