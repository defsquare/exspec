import type { Io } from "../run/io.ts";
import type { Command, Event, Role } from "../shapes/event.ts";
import { parseExtraction, type SourceFile } from "../shapes/extraction.ts";
import type { Interface, Target } from "../shapes/target.ts";
import type { Drive, Session } from "./drive.ts";
import { roleInstructions } from "./instructions.ts";
import { type Rounds, sessionRounds } from "./rounds.ts";

export type RolesRun = {
  readonly dir: string;
  // the one interface to work on, done or not; none: every interface not done yet
  readonly only?: string;
  // the most sessions at once
  readonly jobs: number;
  readonly model: string;
  readonly drive: Drive;
  readonly io: Io;
  // the files under <dir>/specimen, path relative to it, read again before every gate
  readonly readFiles: (dir: string) => Promise<readonly SourceFile[]>;
  // path relative to <dir>/specimen: what the tool writes itself, never the agent
  readonly writeFile: (dir: string, path: string, text: string) => Promise<void>;
  readonly removeFile: (dir: string, path: string) => Promise<void>;
};

export type RolesCommand = Extract<Command, `roles-${string}`>;

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

// The frame of a roles command. It needs target.yaml and interfaces.yaml to parse, nothing
// else of the extraction; `only` names one of the interfaces.
export async function* rolesCommand(
  command: RolesCommand,
  { dir, only, readFiles }: RolesRun,
  body: (setting: {
    readonly target: Target;
    readonly interfaces: readonly Interface[];
  }) => AsyncGenerator<Event, boolean>,
): AsyncGenerator<Event> {
  yield { type: "command-started", command, dir };
  const finished = (ok: boolean): Event => ({ type: "command-finished", command, ok });
  try {
    const files = await readFiles(dir);
    const { extraction, problems } = parseExtraction(
      files.filter(({ path }) => path === "target.yaml" || path === "interfaces.yaml"),
    );
    for (const problem of problems) yield { type: "problem", ...problem };
    const { target, interfaces } = extraction;
    const selected = interfaces.filter((i) => only === undefined || i.interface === only);
    const failure =
      target === undefined
        ? "no target is declared"
        : selected.length === 0
          ? only === undefined
            ? "no interface is declared"
            : `no interface "${only}"`
          : undefined;
    if (failure !== undefined) yield { type: "command-failed", message: failure };
    if (problems.length > 0 || target === undefined || failure !== undefined) {
      yield finished(false);
      return;
    }
    yield finished(yield* body({ target, interfaces: selected }));
  } catch (error) {
    yield { type: "command-failed", message: messageOf(error) };
    yield finished(false);
  }
}

const byOf = (role: Role, name: string | undefined) =>
  name === undefined ? { role } : { role, interface: name };

export async function* roleSkipped(
  role: Role,
  name: string | undefined,
  why: string,
): AsyncGenerator<Event, boolean> {
  yield { type: "role-skipped", ...byOf(role, name), why };
  return true;
}

// One role on one interface, between its start and its end. What it raises fails it alone:
// the others go on.
export async function* roleJob(
  role: Role,
  name: string | undefined,
  run: () => AsyncGenerator<Event, boolean>,
): AsyncGenerator<Event, boolean> {
  const by = byOf(role, name);
  yield { type: "role-started", ...by };
  let ok: boolean;
  try {
    ok = yield* run();
  } catch (error) {
    yield { type: "command-failed", message: messageOf(error) };
    ok = false;
  }
  yield { type: "role-finished", ...by, ok };
  return ok;
}

const failedGate =
  "The tool's check of what you wrote failed. Fix what follows, then end with the same short message.";

// a role's session and its gate, the findings sent back `rounds` times at most
export function roleRounds({
  rolesRun: { dir, model, drive },
  role,
  name,
  rounds,
  session,
  gate,
}: {
  readonly rolesRun: RolesRun;
  readonly role: Role;
  readonly name: string | undefined;
  readonly rounds: number;
  readonly session: Omit<Session, "system" | "cwd" | "model">;
  readonly gate: Rounds["gate"];
}): AsyncGenerator<Event, boolean> {
  const by = byOf(role, name);
  return sessionRounds({
    drive,
    session: { ...session, system: roleInstructions[role], cwd: dir, model },
    rounds,
    failedGate,
    label: (event) => ({ ...event, ...by }),
    checked: (findings) => ({
      type: "gate-checked",
      ...by,
      ok: findings.length === 0,
      findings,
    }),
    gate,
  });
}
