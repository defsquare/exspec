// The three families of commands, as they are typed:
//   read the extraction    status, check, verdicts
//   drive the target       target up, target down, target play
//   the references and the agent itself    record, replay, extract — refused to the agent
const read = ["status", "check", "verdicts"];
export const onTarget = ["up", "down", "play"];
const refusedToAgent = ["record", "replay", "extract"];

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
export function askedOf(positionals: readonly string[], agent: boolean): Asked {
  const [first, second, ...after] = positionals;
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
