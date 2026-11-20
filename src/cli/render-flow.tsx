import { Box, render, Text, useApp, useWindowSize } from "ink";
import { Fragment, useEffect, useState } from "react";
import type { Event } from "../shapes/event.ts";
import { verdictSchema } from "../shapes/roles.ts";
import {
  emptyFlow,
  type Flow,
  flowAfter,
  type PhaseState,
  phaseOfCommand,
  type RoleSession,
  type Trouble,
} from "./flow.ts";
import { countsOf, duration, panelOf } from "./flow-panel.ts";

const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const narrow = 100;
const shown = 3;

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

function PhaseBox({ box, flow, now }: { box: PhaseState; flow: Flow; now: number }) {
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
      {countsOf(box.phase, flow).map((line) => (
        <Text key={line}>{line}</Text>
      ))}
    </Box>
  );
}

// a narrow window: one line per phase, "✔ 1m05 $0.31  2 kept"
function PhaseLine({ box, flow, now }: { box: PhaseState; flow: Flow; now: number }) {
  const look = borders[box.state];
  return (
    <Text dimColor={"dim" in look} {...("color" in look ? { color: look.color } : {})}>
      {box.phase.padEnd(15)}
      {stateLine(box, now).padEnd(18)}
      {countsOf(box.phase, flow).join(", ")}
    </Text>
  );
}

// {role: reader, interface: f, startedAt: 0, round: 2, used: {tool: Grep, about: a}} at 40s
// -> "reader   f   0m40 round 2  Grep  a"
function SessionLine({
  session,
  now,
  wide,
}: {
  session: RoleSession;
  now: number;
  // the longest interface of the sessions drawn
  wide: number;
}) {
  const { role, interface: of, provider, startedAt, round, used } = session;
  return (
    <Text wrap="truncate-end">
      {column(role)}
      {(of ?? provider ?? "").padEnd(wide + 2)}
      {since(startedAt, now).padEnd(6)}
      {(round > 1 ? `round ${round}` : "").padEnd(9)}
      {used === undefined ? "" : `${used.tool.padEnd(6)}${used.about}`}
    </Text>
  );
}

function Verdicts({ verdicts }: { verdicts: NonNullable<Flow["verdicts"]> }) {
  return (
    <Text>
      {"verdicts  "}
      {verdictSchema.options
        .map((verdict) => `${verdicts[verdict]} ${verdict}`)
        .join(" · ")}
    </Text>
  );
}

// {by: f, lines: [a, b, c]} -> "✘ f  a  …2 more"
function TroubleLine({ trouble: { by, lines } }: { trouble: Trouble }) {
  return (
    <Text color="red" wrap="truncate-end">
      ✘ {by}
      {"  "}
      {lines[0] ?? ""}
      {lines.length > 1 ? `  …${lines.length - 1} more` : ""}
    </Text>
  );
}

// {by: f, lines: [a, b]} -> "✘ f", then a and b, each on its line
function TroubleWhole({ trouble: { by, lines } }: { trouble: Trouble }) {
  return (
    <Box flexDirection="column">
      <Text color="red">✘ {by}</Text>
      {lines.map((line, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: two lines may read the same
        <Text key={index} wrap="wrap">
          {"  "}
          {line}
        </Text>
      ))}
    </Box>
  );
}

// [{why: w, count: 3}] -> "skipped 3   w"; the reasons past `shown` are counted
function Skips({ skips }: { skips: Flow["skips"] }) {
  return (
    <>
      {skips.slice(0, shown).map(({ why, count }) => (
        <Text key={why} dimColor wrap="truncate-end">
          {column("skipped")}
          {String(count).padEnd(4)}
          {why}
        </Text>
      ))}
      {skips.length > shown ? (
        <Text dimColor>
          {column("")}…{skips.length - shown} more
        </Text>
      ) : null}
    </>
  );
}

function Panel({ flow, now }: { flow: Flow; now: number }) {
  const panel = panelOf(flow, shown);
  if (panel === undefined) return null;
  const { target, said, used } = flow;
  if (panel.kind === "roles") {
    const { phase, running, played, sessions, troubles, more } = panel;
    const wide = Math.max(
      0,
      ...sessions.map((one) => (one.interface ?? one.provider)?.length ?? 0),
    );
    // "" while the references are recorded: the phase runs and no session does
    const state = !running
      ? " · failed"
      : sessions.length > 0
        ? ` · ${sessions.length} running`
        : "";
    return (
      <Box flexDirection="column" borderStyle="single" paddingX={1}>
        <Text bold>
          {phase}
          {state}
        </Text>
        {sessions.map((session) => (
          <SessionLine
            key={`${session.role}/${session.interface ?? session.provider ?? ""}`}
            session={session}
            now={now}
            wide={wide}
          />
        ))}
        {troubles.map((trouble) =>
          running ? (
            <TroubleLine key={trouble.by} trouble={trouble} />
          ) : (
            <TroubleWhole key={trouble.by} trouble={trouble} />
          ),
        )}
        {more > 0 ? <Text>…{more} more</Text> : null}
        {played === undefined ? null : (
          <Text wrap="truncate-end">
            {column("played")}
            {played}
          </Text>
        )}
        {running && target !== undefined ? (
          <Text wrap="truncate-end">
            {column("target")}
            {target.step} {target.state}
          </Text>
        ) : null}
      </Box>
    );
  }
  const { phase, running, findings, more } = panel;
  const { gate } = flow;
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
  // nothing is drawn before the command says which it is
  if (flow.command === undefined) return null;
  // "roles-read" -> "roles read"
  const typed = flow.command.replace("-", " ");
  const only = phaseOfCommand[flow.command];
  const boxes = flow.boxes.filter(({ phase }) => only === undefined || phase === only);
  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between">
        <Text bold>
          {typed} {flow.dir}
        </Text>
        <Text>
          {elapsed}
          {dollars(spent)}
        </Text>
      </Box>
      {stacked ? (
        <Box flexDirection="column" marginTop={1}>
          {boxes.map((box) => (
            <PhaseLine key={box.phase} box={box} flow={flow} now={now} />
          ))}
        </Box>
      ) : (
        <Box alignItems="stretch" marginTop={1}>
          {boxes.map((box, index) => (
            <Fragment key={box.phase}>
              {index === 0 ? null : (
                <Box alignItems="center">
                  <Text>─▶</Text>
                </Box>
              )}
              <PhaseBox box={box} flow={flow} now={now} />
            </Fragment>
          ))}
        </Box>
      )}
      <Panel flow={flow} now={now} />
      {flow.verdicts === undefined ? null : <Verdicts verdicts={flow.verdicts} />}
      <Skips skips={flow.skips} />
      {flow.failures.map((failure, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: two failures may read the same
        <Text key={index} color="red">
          {failure}
        </Text>
      ))}
      {ended ? (
        <Text>
          {typed} {flow.ok ? "ok" : "failed"}
        </Text>
      ) : null}
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
