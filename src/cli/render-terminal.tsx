import { Box, render, Text, useApp } from "ink";
import { useEffect, useState } from "react";
import type { Event } from "../shapes/event.ts";

export function describeEvent(event: Event): string {
  switch (event.type) {
    case "command-started":
      return `${event.command} ${event.dir}`;
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
    <Box flexDirection="column">
      {lines.map(({ id, text }) => (
        <Text key={id}>{text}</Text>
      ))}
    </Box>
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
