import { driveAgent, type Session } from "../agent/drive.ts";
import type { RolesCommand, RolesRun } from "../agent/roles.ts";
import { rolesBuild, rolesPlay } from "../agent/roles-build.ts";
import { rolesJudge } from "../agent/roles-judge.ts";
import { rolesRead } from "../agent/roles-read.ts";
import {
  readExtractionFiles,
  removeSpecimenFile,
  writeSpecimenFile,
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
  jobs,
  model,
  effort,
  io,
}: RolesAsked): AsyncIterable<Event> {
  const executable = command === "roles-play" ? undefined : claudeExecutable();
  const rolesRun: RolesRun = {
    dir,
    ...(only === undefined ? {} : { only }),
    jobs,
    model,
    drive: (session) =>
      driveAgent({
        ...session,
        ...(effort === undefined ? {} : { effort }),
        ...(executable === undefined ? {} : { executable }),
      }),
    io,
    readFiles: readExtractionFiles,
    writeFile: writeSpecimenFile,
    removeFile: removeSpecimenFile,
  };
  switch (command) {
    case "roles-read":
      return rolesRead(rolesRun);
    case "roles-build":
      return rolesBuild(rolesRun);
    case "roles-judge":
      return rolesJudge(rolesRun);
    case "roles-play":
      return rolesPlay(rolesRun, scenario ?? "");
    default: {
      const unreachable: never = command;
      return unreachable;
    }
  }
}
