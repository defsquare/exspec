export class CommandFailed extends Error {
  readonly type = "command-failed";
  constructor(
    readonly line: string,
    readonly exitCode: number,
    readonly output: string,
  ) {
    super(`\`${line}\` exited with ${exitCode}${output ? `:\n${output}` : ""}`);
  }
}

// each line through sh -c, in order, from cwd; the first that fails stops the others
export async function runLines(lines: readonly string[], cwd: string): Promise<void> {
  for (const line of lines) {
    const child = Bun.spawn(["sh", "-c", line], { cwd, stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    if (exitCode !== 0) {
      const output = `${stdout}${stderr}`.trimEnd().split("\n").slice(-20).join("\n");
      throw new CommandFailed(line, exitCode, output);
    }
  }
}
