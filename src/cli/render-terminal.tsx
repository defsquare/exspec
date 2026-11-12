import { Box, render, Text, useApp } from "ink";
import { useEffect, useState } from "react";
import type { Event } from "../shapes/event.ts";

export function describeEvent(event: Event): string {
  switch (event.type) {
    case "command-started":
      return `${event.command} ${event.dir}`;
    case "extraction-not-found":
      return `no extraction in ${event.dir}: ${event.expected} is missing`;
    case "command-finished":
      return `${event.command} ${event.ok ? "ok" : "failed"}`;
    default: {
      const unreachable: never = event;
      return unreachable;
    }
  }
}

function Events({ events }: { readonly events: AsyncIterable<Event> }) {
  const { exit } = useApp();
  const [lines, setLines] = useState<
    readonly { readonly id: number; readonly text: string }[]
  >([]);
  const [end, setEnd] = useState<{ readonly error?: Error } | undefined>();
  useEffect(() => {
    (async () => {
      for await (const event of events) {
        setLines((l) => [...l, { id: l.length, text: describeEvent(event) }]);
      }
    })().then(
      () => setEnd({}),
      (error: unknown) =>
        setEnd({ error: error instanceof Error ? error : new Error(String(error)) }),
    );
  }, [events]);
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

export async function renderTerminal(events: AsyncIterable<Event>): Promise<void> {
  const app = render(<Events events={events} />);
  await app.waitUntilExit();
}
