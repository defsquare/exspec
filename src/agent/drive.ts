import { isAbsolute, join } from "node:path";
import {
  type CanUseTool,
  createSdkMcpServer,
  query,
  tool,
} from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { AgentEvent } from "../shapes/event.ts";
import { type Step, stepRequestSchema, stepSchema } from "../shapes/roles.ts";

export class SessionWithoutResult extends Error {
  readonly type = "session-without-result";
}

export type Session = {
  readonly prompt: string;
  readonly system: string;
  readonly cwd: string;
  readonly model: string;
  // how hard the model reasons; without it, the model's default
  readonly effort?: "low" | "medium" | "high";
  // the id of the session this prompt continues
  readonly resume?: string;
  // the Claude Code executable to start; without it, the one the SDK installs beside itself
  readonly executable?: string;
  // the built-in tools it is given
  readonly tools: readonly string[];
  // path: as a tool gives it, relative to cwd or absolute; pattern: the glob of a search
  // (Glob, Grep) over path, absent for a Read
  readonly mayRead: (path: string, pattern?: string) => boolean;
  readonly mayWrite: (path: string) => boolean;
  // what the agent is told when a read or a write is denied
  readonly confinement: string;
  // given: a tool of the session's own, `play`: steps in, what the target answered out
  readonly play?: (steps: readonly Step[]) => Promise<string>;
};

// how: the SDK's word for an end in error ("error_max_turns", …); absent when it files the
// end under "success", error or not
export type Ended = {
  readonly session: string;
  readonly ok: boolean;
  readonly how?: string;
};

export type Drive = (session: Session) => AsyncGenerator<AgentEvent, Ended>;

// set in the agent's shell: the commands that record or judge a reference, and `extract`
// itself, refuse to run where it is present, whatever its value. The file tools'
// confinement does not cover a shell.
export const agentMark = "EXSPEC_AGENT";

// a phase's tools: no web, no sub-agent, no todo list, no notebook
export const phaseTools = ["Read", "Glob", "Grep", "Write", "Edit", "Bash"];

const writing = new Set(["Write", "Edit"]);

const toolInput = z
  .object({
    command: z.string(),
    file_path: z.string(),
    path: z.string(),
    pattern: z.string(),
    glob: z.string(),
    steps: z.array(z.object({ when: z.string(), request: stepRequestSchema })),
  })
  .partial();

const playName = "mcp__exspec__play";

// the shell command's first line, the path or pattern a tool works on, or the call a play
// sends (its first step's when there is none); 120 characters
function aboutOf(input: unknown): string {
  const parsed = toolInput.safeParse(input);
  const { command, file_path, pattern, steps } = parsed.success ? parsed.data : {};
  const step = steps?.find(({ when }) => when === "call") ?? steps?.[0];
  const played =
    step === undefined ? undefined : `${step.request.method} ${step.request.path}`;
  return (command ?? file_path ?? pattern ?? played ?? "")
    .replace(/\n[\s\S]*/, "")
    .slice(0, 120);
}

// The folders a glob names before its first wildcard are part of the folder it runs in:
// a search of "a/b/**/*.ts" from the root runs under a/b, not over the root.
//   (".", "a/b/**/*.ts") -> { path: "a/b", pattern: "**/*.ts" }
//   ("a", "*.ts")        -> { path: "a",   pattern: "*.ts" }
export function globSearch(
  path: string,
  pattern: string,
): { readonly path: string; readonly pattern: string } {
  if (isAbsolute(pattern)) return { path, pattern };
  const parts = pattern.split("/");
  const wild = parts.findIndex((part) => /[*?[{]/.test(part));
  const named = wild === -1 ? parts.length - 1 : wild;
  return {
    path: join(path, ...parts.slice(0, named)),
    pattern: parts.slice(named).join("/"),
  };
}

// Read, Glob, Grep and the writes, against the session's confinement; anything else allowed
export function allowed(
  name: string,
  given: unknown,
  { mayRead, mayWrite }: Pick<Session, "mayRead" | "mayWrite">,
): boolean {
  const parsed = z.record(z.string(), z.unknown()).safeParse(given);
  const input = parsed.success ? parsed.data : {};
  const text = (key: string) => (typeof input[key] === "string" ? input[key] : undefined);
  const path = text("file_path");
  if (writing.has(name)) return path !== undefined && mayWrite(path);
  if (name === "Read") return path !== undefined && mayRead(path);
  if (name === "Glob") {
    const search = globSearch(text("path") ?? ".", text("pattern") ?? "");
    return mayRead(search.path, search.pattern);
  }
  if (name === "Grep") return mayRead(text("path") ?? ".", text("glob") ?? "");
  return true;
}

function playServer(play: NonNullable<Session["play"]>) {
  return createSdkMcpServer({
    name: "exspec",
    tools: [
      tool(
        "play",
        "Puts the system back in its starting state, sends the steps in order and returns what it answered to each.",
        { steps: z.array(stepSchema) },
        async ({ steps }) => {
          try {
            return { content: [{ type: "text", text: await play(steps) }] };
          } catch (error) {
            // the agent is told; the session goes on
            const message = error instanceof Error ? error.message : String(error);
            return { content: [{ type: "text", text: message }], isError: true };
          }
        },
      ),
    ],
  });
}

// one session, or one more round of it when `resume` is given
export async function* driveAgent(session: Session): AsyncGenerator<AgentEvent, Ended> {
  const { prompt, system, cwd, model, effort, resume, executable, tools, play } = session;
  const canUseTool: CanUseTool = async (name, input) =>
    allowed(name, input, session)
      ? { behavior: "allow", updatedInput: input }
      : { behavior: "deny", message: session.confinement };
  const messages = query({
    prompt,
    options: {
      cwd,
      model,
      ...(effort === undefined ? {} : { effort }),
      systemPrompt: system,
      tools: [...tools],
      settingSources: [],
      strictMcpConfig: true,
      mcpServers: play === undefined ? {} : { exspec: playServer(play) },
      plugins: [],
      skills: [],
      permissionMode: "default",
      canUseTool,
      // a read inside cwd is never put to canUseTool: the hook sees every call
      hooks: {
        PreToolUse: [
          {
            onFailure: "block",
            hooks: [
              async (input) =>
                input.hook_event_name !== "PreToolUse" ||
                allowed(input.tool_name, input.tool_input, session)
                  ? {}
                  : {
                      hookSpecificOutput: {
                        hookEventName: "PreToolUse",
                        permissionDecision: "deny",
                        permissionDecisionReason: session.confinement,
                      },
                    },
            ],
          },
        ],
      },
      // the SDK replaces the environment, it does not merge
      env: { ...process.env, [agentMark]: "1" },
      ...(resume === undefined ? {} : { resume }),
      ...(executable === undefined ? {} : { pathToClaudeCodeExecutable: executable }),
    },
  });
  for await (const message of messages) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "text") yield { type: "agent-said", text: block.text };
        if (block.type === "tool_use") {
          const name = block.name === playName ? "play" : block.name;
          yield { type: "agent-used", tool: name, about: aboutOf(block.input) };
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
        // an error the SDK files under "success" has no word of its own
        ...(message.subtype === "success" ? {} : { how: message.subtype }),
      };
    }
  }
  throw new SessionWithoutResult("the agent's session ended without a result");
}
