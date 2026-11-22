// The three families of commands, as they are typed:
//   read the extraction    status, check, verdicts
//   drive the target       target up, target down, target play
//   the references and the agent itself    record, replay, extract, view — refused to the agent
//   the three roles        roles read, roles build, roles judge, roles play, roles record,
//                          roles replay — refused to the agent
//   the providers' roles   providers read, providers write-twin — refused to the agent
//   the states             states rename — refused to the agent: states.yaml is the user's
const read = ["status", "check", "verdicts"];
const roles = ["read", "build", "judge", "play", "record", "replay"];
const providers = ["read", "write-twin"];
const states = ["rename"];
export const onTarget = ["up", "down", "play"];
// view: a page for a person, every recorded answer in it
const refusedToAgent = ["record", "replay", "extract", "view"];

export type Asked =
  | {
      readonly type: "command";
      readonly command: string;
      readonly rest: readonly string[];
    }
  | { readonly type: "refused-to-agent"; readonly command: string }
  | { readonly type: "unknown" };

// ["target", "up", "d"]  -> { type: "command", command: "up", rest: ["d"] }
// ["check", "d"]         -> { type: "command", command: "check", rest: ["d"] }
// ["up", "d"]            -> { type: "unknown" }
// ["record", "d"], agent -> { type: "refused-to-agent", command: "record" }
// ["roles", "read", "d"] -> { type: "command", command: "roles-read", rest: ["d"] }
// ["providers", "write-twin", "d"] -> { type: "command", command: "providers-write-twin", … }
// ["states", "rename", "d", "s", "t"] -> { type: "command", command: "states-rename", rest: ["d", "s", "t"] }
export function askedOf(positionals: readonly string[], agent: boolean): Asked {
  const [first, second, ...after] = positionals;
  if (first === "roles" || first === "providers" || first === "states") {
    const known = { roles, providers, states }[first];
    if (second === undefined || !known.includes(second)) return { type: "unknown" };
    const command = `${first}-${second}`;
    return agent
      ? { type: "refused-to-agent", command }
      : { type: "command", command, rest: after };
  }
  if (first === "target") {
    return second !== undefined && onTarget.includes(second)
      ? { type: "command", command: second, rest: after }
      : { type: "unknown" };
  }
  if (first === undefined) return { type: "unknown" };
  const rest = positionals.slice(1);
  if (read.includes(first)) return { type: "command", command: first, rest };
  if (!refusedToAgent.includes(first)) return { type: "unknown" };
  return agent
    ? { type: "refused-to-agent", command: first }
    : { type: "command", command: first, rest };
}
