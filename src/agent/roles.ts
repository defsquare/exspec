import type { Io } from "../run/io.ts";
import type { Command, Event, Role } from "../shapes/event.ts";
import {
  type Extraction,
  parseExtraction,
  type SourceFile,
} from "../shapes/extraction.ts";
import type { Interface, Observable, Target } from "../shapes/target.ts";
import type { Drive, Session } from "./drive.ts";
import { roleInstructions } from "./instructions.ts";
import { type Rounds, sessionRounds } from "./rounds.ts";

export type RolesRun = {
  readonly dir: string;
  // the one interface, or provider, to work on, done or not; none: every one not done yet
  readonly only?: string;
  // the most sessions at once
  readonly jobs: number;
  readonly model: string;
  readonly drive: Drive;
  readonly io: Io;
  // the files under <dir>/exspec, path relative to it, read again before every gate
  readonly readFiles: (dir: string) => Promise<readonly SourceFile[]>;
  // path relative to <dir>/exspec: what the tool writes itself, never the agent
  readonly writeFile: (dir: string, path: string, text: string) => Promise<void>;
  readonly removeFile: (dir: string, path: string) => Promise<void>;
};

// what a roles' command runs on once its frame has read target.yaml and interfaces.yaml
export type RolesSetting = {
  readonly target: Target;
  readonly interfaces: readonly Interface[];
};

// The run of the roles' sessions: one drive, given the roles' effort when there is one and
// the session sets none of its own.
export function rolesRunOf({
  drive,
  effort,
  ...run
}: Omit<RolesRun, "drive"> & {
  readonly drive: Drive;
  readonly effort: Session["effort"];
}): RolesRun {
  return {
    ...run,
    drive: effort === undefined ? drive : (session) => drive({ effort, ...session }),
  };
}

export type RolesCommand = Extract<Command, `roles-${string}` | `providers-${string}`>;

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

// The frame of a roles command. It parses the files it is given, nothing else of the
// extraction; `only` names one of what it works on, the interfaces or the providers
async function* commandFrame<T>(
  command: RolesCommand,
  { dir, only, readFiles }: RolesRun,
  {
    parsed,
    noun,
    of,
  }: {
    readonly parsed: readonly string[];
    // "interface", "provider"
    readonly noun: string;
    // what the command works on, by name
    readonly of: (extraction: Extraction) => readonly { name: string; one: T }[];
  },
  body: (target: Target, selected: readonly T[]) => AsyncGenerator<Event, boolean>,
): AsyncGenerator<Event> {
  yield { type: "command-started", command, dir };
  const finished = (ok: boolean): Event => ({ type: "command-finished", command, ok });
  try {
    const files = await readFiles(dir);
    const { extraction, problems } = parseExtraction(
      files.filter(({ path }) => parsed.includes(path)),
    );
    for (const problem of problems) yield { type: "problem", ...problem };
    const { target } = extraction;
    const selected = of(extraction)
      .filter(({ name }) => only === undefined || name === only)
      .map(({ one }) => one);
    const failure =
      target === undefined
        ? "no target is declared"
        : selected.length === 0
          ? only === undefined
            ? `no ${noun} is declared`
            : `no ${noun} "${only}"`
          : undefined;
    if (failure !== undefined) yield { type: "command-failed", message: failure };
    if (problems.length > 0 || target === undefined || failure !== undefined) {
      yield finished(false);
      return;
    }
    yield finished(yield* body(target, selected));
  } catch (error) {
    yield { type: "command-failed", message: messageOf(error) };
    yield finished(false);
  }
}

// The frame of a command of the operations' roles: target.yaml and interfaces.yaml parse;
// `only` names one of the interfaces.
export function rolesCommand(
  command: RolesCommand,
  rolesRun: RolesRun,
  body: (setting: RolesSetting) => AsyncGenerator<Event, boolean>,
): AsyncGenerator<Event> {
  return commandFrame(
    command,
    rolesRun,
    {
      parsed: ["target.yaml", "interfaces.yaml"],
      noun: "interface",
      of: ({ interfaces }) => interfaces.map((one) => ({ name: one.interface, one })),
    },
    (target, interfaces) => body({ target, interfaces }),
  );
}

// The frame of a command of the providers' roles: target.yaml parses; `only` names one of
// its observables.
export function providersCommand(
  command: RolesCommand,
  rolesRun: RolesRun,
  body: (providers: readonly Observable[]) => AsyncGenerator<Event, boolean>,
): AsyncGenerator<Event> {
  return commandFrame(
    command,
    rolesRun,
    {
      parsed: ["target.yaml"],
      noun: "provider",
      of: ({ target }) =>
        (target?.observables ?? []).map((one) => ({ name: one.observable, one })),
    },
    (_target, providers) => body(providers),
  );
}

const providerRoles: readonly Role[] = ["provider-reader", "twin-writer"];

// {role: builder} on f -> {role: builder, interface: f}; {role: twin-writer} on p -> {role:
// twin-writer, provider: p}
const byOf = (role: Role, name: string | undefined) =>
  name === undefined
    ? { role }
    : providerRoles.includes(role)
      ? { role, provider: name }
      : { role, interface: name };

export async function* roleSkipped(
  role: Role,
  name: string | undefined,
  why: string,
): AsyncGenerator<Event, boolean> {
  yield { type: "role-skipped", ...byOf(role, name), why };
  return true;
}

// One role on one interface, between its start and its end. What its job raises fails it
// alone, told as role-failed: the others go on.
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
    yield { type: "role-failed", ...by, message: messageOf(error) };
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
