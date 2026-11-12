import { TargetUnreachable } from "../../src/io/http.ts";
import type { Io } from "../../src/run/io.ts";
import type { Event } from "../../src/shapes/event.ts";
import { type Extraction, parseExtraction } from "../../src/shapes/extraction.ts";
import type {
  HttpRequest,
  Reference,
  TargetResponse,
} from "../../src/shapes/scenario.ts";

export const at = "2026-11-13T10:00:00.000Z";

const files: Readonly<Record<string, string>> = {
  "target.yaml": `
target: t
start: [start]
alive: {method: get, path: /alive, status: 200}
seed: [seed]
reset: [reset]
stop: [stop]
api: {base-url: "http://h"}
`,
  "interfaces.yaml": `
interfaces:
  - {interface: i, method: get, pattern: "/f/{a}", request: {path: {a: string}}, responses: {200: {body: any}}}
`,
  "bindings.yaml": `
triggers:
  - {trigger: t, interface: i, operation: f, sends: {a: [path, a]}, answers: {status: 200}}
`,
};

export function extract(more: Readonly<Record<string, string>>): Extraction {
  return parseExtraction(
    Object.entries({ ...files, ...more }).map(([path, text]) => ({ path, text })),
  ).extraction;
}

export const scenarioFile = (a: string, caller = "u") => `
scenario: s
says: s
proves: [r]
act: {call: {operation: f, with: {a: ${a}}, caller: ${caller}}}
`;

// answers: url -> the responses of each execution, in order; the alive path always answers
export function fakeIo(
  answers: Readonly<Record<string, readonly TargetResponse[]>>,
  { failing = "", unreachable = 0 }: { failing?: string; unreachable?: number } = {},
) {
  const lines: string[] = [];
  const sleeps: number[] = [];
  const written: { path: string; reference: Reference }[] = [];
  const asked = new Map<string, number>();
  let refused = 0;
  const io: Io = {
    runLines: async (run) => {
      for (const line of run) {
        lines.push(line);
        if (line === failing) throw new Error(`${line} failed`);
      }
    },
    send: async ({ url }: HttpRequest) => {
      if (url === "http://h/alive") {
        if (refused++ < unreachable) throw new TargetUnreachable("refused");
        return { status: 200, body: null };
      }
      const n = asked.get(url) ?? 0;
      asked.set(url, n + 1);
      const response = answers[url]?.[n];
      if (response === undefined) throw new Error(`no answer ${n} for ${url}`);
      return response;
    },
    sleep: async (milliseconds) => {
      sleeps.push(milliseconds);
    },
    readCredentials: async () => ({ u: { Authorization: "k" } }),
    writeReference: async (_dir, path, reference) => {
      written.push({ path, reference });
    },
    now: () => at,
    version: "v",
  };
  return { io, lines, sleeps, written };
}

export const step = (name: Extract<Event, { type: "target-step" }>["step"]): Event[] => [
  { type: "target-step", step: name, state: "started" },
  { type: "target-step", step: name, state: "done" },
];
