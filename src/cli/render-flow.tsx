import { Box, render, Text, useApp, useWindowSize } from "ink";
import { Fragment, useEffect, useState } from "react";
import type { Event } from "../shapes/event.ts";
import {
  countsOf,
  duration,
  emptyFlow,
  type Flow,
  flowAfter,
  type PhaseState,
  panelOf,
} from "./flow.ts";

const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const narrow = 100;
const findingsShown = 2;

const borders = {
  "to-do": { borderStyle: "single", dim: true },
  skipped: { borderStyle: "single", dim: true },
  running: { borderStyle: "double", color: "yellow" },
  done: { borderStyle: "single", color: "green" },
  failed: { borderStyle: "single", color: "red" },
} as const;

// the tick's `now` may be older than the event's `at`: never a negative time
const since = (start: number | undefined, end: number) =>
  duration(Math.max(0, end - (start ?? end)));

// "gate" -> "gate    ": the panel's labels share one column
const column = (name: string) => name.padEnd(8);

const dollars = (cost: number | undefined) =>
  cost === undefined ? "" : ` $${cost.toFixed(2)}`;

// {state: running, round: 2} at 2m40 -> "⠹ 2m40 round 2"; {state: done} -> "✔ 3m12 $0.84"
function stateLine({ state, round, startedAt, endedAt, cost }: PhaseState, now: number) {
  const elapsed = since(startedAt, endedAt ?? now);
  switch (state) {
    case "to-do":
      return "·";
    case "skipped":
      return "✔ done already";
    case "running": {
      const spinner = frames[Math.floor(now / 250) % frames.length];
      return `${spinner} ${elapsed}${round > 1 ? ` round ${round}` : ""}`;
    }
    case "done":
      return `✔ ${elapsed}${dollars(cost)}`;
    case "failed":
      return `✘ ${elapsed}`;
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}

function PhaseBox({
  box,
  counts,
  now,
}: {
  box: PhaseState;
  counts: Flow["counts"];
  now: number;
}) {
  const { borderStyle, ...look } = borders[box.state];
  const dim = "dim" in look;
  return (
    <Box
      flexDirection="column"
      borderStyle={borderStyle}
      borderDimColor={dim}
      {...("color" in look ? { borderColor: look.color } : {})}
      paddingX={1}
      flexGrow={1}
      flexBasis={0}
    >
      <Text bold>{box.phase}</Text>
      <Text dimColor={dim}>{stateLine(box, now)}</Text>
      {countsOf(box.phase, counts).map((line) => (
        <Text key={line}>{line}</Text>
      ))}
    </Box>
  );
}

// a narrow window: one line per phase, "✔ 1m05 $0.31  a  2 interfaces"
function PhaseLine({
  box,
  counts,
  now,
}: {
  box: PhaseState;
  counts: Flow["counts"];
  now: number;
}) {
  const look = borders[box.state];
  return (
    <Text dimColor={"dim" in look} {...("color" in look ? { color: look.color } : {})}>
      {box.phase.padEnd(15)}
      {stateLine(box, now).padEnd(18)}
      {countsOf(box.phase, counts).join(", ")}
    </Text>
  );
}

function Panel({ flow }: { flow: Flow }) {
  const panel = panelOf(flow, findingsShown);
  if (panel === undefined) return null;
  const { phase, running, findings, more } = panel;
  const { gate, target, said, used } = flow;
  return (
    <Box flexDirection="column" borderStyle="single" paddingX={1}>
      <Text bold>
        {phase} · {running === undefined ? "failed" : `round ${running.round}`}
      </Text>
      {gate === undefined ? null : (
        <>
          <Text wrap="truncate-end">
            {column("gate")}✘ round {gate.round}: {gate.findings.length}
            {running === undefined ? " left" : " sent back"}
          </Text>
          {findings.map((finding, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: two findings may read the same
            <Text key={index} wrap={running === undefined ? "wrap" : "truncate-end"}>
              {column("")}
              {"  "}
              {finding}
            </Text>
          ))}
          {more > 0 ? <Text>{`${column("")}  …${more} more`}</Text> : null}
        </>
      )}
      {running === undefined || target === undefined ? null : (
        <Text wrap="truncate-end">
          {column("target")}
          {target.step} {target.state}
        </Text>
      )}
      {running === undefined || said === undefined ? null : (
        <Text wrap="truncate-end">
          {column("agent")}
          {said}
        </Text>
      )}
      {running === undefined || used === undefined ? null : (
        <Text wrap="truncate-end">
          {column(used.tool)}
          {used.about}
        </Text>
      )}
    </Box>
  );
}

function Drawing({ flow, now, ended }: { flow: Flow; now: number; ended: boolean }) {
  const { columns } = useWindowSize();
  const stacked = columns < narrow;
  const spent = flow.boxes.reduce<number | undefined>(
    (sum, { cost }) => (cost === undefined ? sum : (sum ?? 0) + cost),
    undefined,
  );
  const elapsed = since(flow.startedAt, flow.endedAt ?? now);
  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between">
        <Text bold>extract {flow.dir}</Text>
        <Text>
          {elapsed}
          {dollars(spent)}
        </Text>
      </Box>
      {stacked ? (
        <Box flexDirection="column" marginTop={1}>
          {flow.boxes.map((box) => (
            <PhaseLine key={box.phase} box={box} counts={flow.counts} now={now} />
          ))}
        </Box>
      ) : (
        <Box alignItems="stretch" marginTop={1}>
          {flow.boxes.map((box, index) => (
            <Fragment key={box.phase}>
              {index === 0 ? null : (
                <Box alignItems="center">
                  <Text>─▶</Text>
                </Box>
              )}
              <PhaseBox box={box} counts={flow.counts} now={now} />
            </Fragment>
          ))}
        </Box>
      )}
      <Panel flow={flow} />
      {flow.failed === undefined ? null : <Text color="red">{flow.failed}</Text>}
      {ended ? <Text>extract {flow.ok ? "ok" : "failed"}</Text> : null}
    </Box>
  );
}

function Flowing({
  events,
  onLast,
}: {
  readonly events: AsyncIterable<Event>;
  readonly onLast: (last: Event | undefined) => void;
}) {
  const { exit } = useApp();
  const [flow, setFlow] = useState<Flow>(emptyFlow);
  const [now, setNow] = useState(Date.now());
  const [end, setEnd] = useState<{ readonly error?: Error } | undefined>();
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 250);
    (async () => {
      let last: Event | undefined;
      for await (const event of events) {
        setFlow((folded) => flowAfter(folded, event, Date.now()));
        last = event;
      }
      return last;
    })()
      .then(
        (last) => {
          onLast(last);
          setEnd({});
        },
        (error: unknown) =>
          setEnd({ error: error instanceof Error ? error : new Error(String(error)) }),
      )
      .finally(() => clearInterval(tick));
    return () => clearInterval(tick);
  }, [events, onLast]);
  useEffect(() => {
    if (end) exit(end.error);
  }, [end, exit]);
  return <Drawing flow={flow} now={now} ended={end !== undefined} />;
}

// returns the last event shown
export async function renderFlow(
  events: AsyncIterable<Event>,
): Promise<Event | undefined> {
  const { promise, resolve } = Promise.withResolvers<Event | undefined>();
  const app = render(<Flowing events={events} onLast={resolve} />);
  await app.waitUntilExit();
  return promise;
}
