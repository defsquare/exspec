import { driveAgent, type Session } from "../agent/drive.ts";
import { providersRead, providersWriteTwin } from "../agent/providers.ts";
import { type RolesCommand, rolesRunOf } from "../agent/roles.ts";
import { rolesBuild, rolesPlay } from "../agent/roles-build.ts";
import { rolesJudge } from "../agent/roles-judge.ts";
import { rolesRead } from "../agent/roles-read.ts";
import { rolesRecord } from "../agent/roles-record.ts";
import { rolesReplay } from "../agent/roles-replay.ts";
import {
  readExtractionFiles,
  removeExtractionFile,
  writeExtractionFile,
} from "../io/files.ts";
import type { Io } from "../run/io.ts";
import type { Event } from "../shapes/event.ts";
import { claudeExecutable } from "./extract.ts";

export type RolesAsked = {
  readonly command: RolesCommand;
  readonly dir: string;
  // roles play: "<interface>/<slug>"
  readonly scenario: string | undefined;
  readonly only: string | undefined;
  // roles record: a reference of the scenario as written is recorded again
  readonly force: boolean;
  readonly jobs: number;
  readonly model: string;
  readonly effort: Session["effort"];
  readonly io: Io;
};

export function rolesEvents({
  command,
  dir,
  scenario,
  only,
  force,
  jobs,
  model,
  effort,
  io,
}: RolesAsked): AsyncIterable<Event> {
  const executable = ["roles-play", "roles-record", "roles-replay"].includes(command)
    ? undefined
    : claudeExecutable();
  const rolesRun = rolesRunOf({
    dir,
    ...(only === undefined ? {} : { only }),
    jobs,
    model,
    effort,
    drive: (session) =>
      driveAgent(executable === undefined ? session : { ...session, executable }),
    io,
    readFiles: readExtractionFiles,
    writeFile: writeExtractionFile,
    removeFile: removeExtractionFile,
  });
  switch (command) {
    case "roles-read":
      return rolesRead(rolesRun);
    case "roles-build":
      return rolesBuild(rolesRun);
    case "roles-judge":
      return rolesJudge(rolesRun);
    case "roles-play":
      return rolesPlay(rolesRun, scenario ?? "");
    case "roles-record":
      return rolesRecord(rolesRun, force);
    case "roles-replay":
      return rolesReplay(rolesRun);
    case "providers-read":
      return providersRead(rolesRun);
    case "providers-write-twin":
      return providersWriteTwin(rolesRun);
    default: {
      const unreachable: never = command;
      return unreachable;
    }
  }
}
