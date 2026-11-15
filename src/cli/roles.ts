import { driveAgent } from "../agent/drive.ts";
import type { Roling } from "../agent/roles.ts";
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
  readonly command: "roles-read" | "roles-build" | "roles-judge" | "roles-play";
  readonly dir: string;
  // roles play: "<interface>/<slug>"
  readonly scenario: string | undefined;
  readonly only: string | undefined;
  readonly jobs: number;
  readonly model: string;
  readonly io: Io;
};

export function rolesEvents({
  command,
  dir,
  scenario,
  only,
  jobs,
  model,
  io,
}: RolesAsked): AsyncIterable<Event> {
  const executable = command === "roles-play" ? undefined : claudeExecutable();
  const roling: Roling = {
    dir,
    ...(only === undefined ? {} : { only }),
    jobs,
    model,
    drive: (session) =>
      driveAgent(executable === undefined ? session : { ...session, executable }),
    io,
    readFiles: readExtractionFiles,
    writeFile: writeSpecimenFile,
    removeFile: removeSpecimenFile,
  };
  switch (command) {
    case "roles-read":
      return rolesRead(roling);
    case "roles-build":
      return rolesBuild(roling);
    case "roles-judge":
      return rolesJudge(roling);
    case "roles-play":
      return rolesPlay(roling, scenario ?? "");
    default: {
      const unreachable: never = command;
      return unreachable;
    }
  }
}
