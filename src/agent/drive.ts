import { isAbsolute, join, relative, resolve } from "node:path";
import { type CanUseTool, query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { AgentEvent } from "../shapes/event.ts";

export class SessionWithoutResult extends Error {
  readonly type = "session-without-result";
}

export type Session = {
  readonly prompt: string;
  readonly system: string;
  readonly cwd: string;
  readonly model: string;
  // the id of the session this prompt continues
  readonly resume?: string;
};

export type Ended = { readonly session: string; readonly ok: boolean };

export type Drive = (session: Session) => AsyncGenerator<AgentEvent, Ended>;

// ("/d", "specimen/a.yaml") -> true; "src/a.ts", "/elsewhere/a", "specimen/references/f/a.yaml" -> false
export function mayWrite(dir: string, path: string): boolean {
  const within = relative(join(dir, "specimen"), resolve(dir, path));
  const parts = within.split("/");
  return (
    within !== "" &&
    !isAbsolute(within) &&
    parts[0] !== ".." &&
    parts[0]?.toLowerCase() !== "references"
  );
}

// set in the agent's shell: the commands that record or judge a reference, and `extract`
// itself, refuse to run where it is. The file tools' confinement does not cover a shell.
export const agentMark = "SPECIMEN_AGENT";

// no web, no sub-agent, no todo list, no notebook
const tools = ["Read", "Glob", "Grep", "Write", "Edit", "Bash"];

const writing = new Set(["Write", "Edit"]);

const toolInput = z
  .object({ command: z.string(), file_path: z.string(), pattern: z.string() })
  .partial();

// the shell command's first line, or the path or pattern a tool works on; 120 characters
function aboutOf(input: unknown): string {
  const parsed = toolInput.safeParse(input);
  const { command, file_path, pattern } = parsed.success ? parsed.data : {};
  return (command ?? file_path ?? pattern ?? "").replace(/\n[\s\S]*/, "").slice(0, 120);
}

// one session, or one more round of it when `resume` is given
export async function* driveAgent({
  prompt,
  system,
  cwd,
  model,
  resume,
}: Session): AsyncGenerator<AgentEvent, Ended> {
  const canUseTool: CanUseTool = async (tool, input) => {
    const path = input.file_path;
    if (writing.has(tool) && (typeof path !== "string" || !mayWrite(cwd, path))) {
      return {
        behavior: "deny",
        message:
          "Writing is allowed only under specimen/, and never under specimen/references/: the references are recorded by the tool.",
      };
    }
    return { behavior: "allow", updatedInput: input };
  };
  const messages = query({
    prompt,
    options: {
      cwd,
      model,
      systemPrompt: system,
      tools,
      settingSources: [],
      strictMcpConfig: true,
      mcpServers: {},
      plugins: [],
      skills: [],
      permissionMode: "default",
      canUseTool,
      // the SDK replaces the environment, it does not merge
      env: { ...process.env, [agentMark]: "1" },
      ...(resume === undefined ? {} : { resume }),
    },
  });
  for await (const message of messages) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "text") yield { type: "agent-said", text: block.text };
        if (block.type === "tool_use") {
          yield { type: "agent-used", tool: block.name, about: aboutOf(block.input) };
        }
      }
    }
    if (message.type === "result") {
      yield {
        type: "agent-ended",
        turns: message.num_turns,
        seconds: Math.round(message.duration_ms / 100) / 10,
        cost: message.total_cost_usd,
      };
      return {
        session: message.session_id,
        ok: message.subtype === "success" && !message.is_error,
      };
    }
  }
  throw new SessionWithoutResult("the agent's session ended without a result");
}
