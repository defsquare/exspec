import { expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { CommandFailed, runLines } from "../../src/io/shell.ts";

test("a line that fails stops the lines after it, with its last output", async () => {
  const failed = await runLines(
    ["true", "seq 1 30; echo e >&2; exit 3", "echo never"],
    tmpdir(),
  ).catch((error: unknown) =>
    error instanceof CommandFailed
      ? {
          type: error.type,
          line: error.line,
          exitCode: error.exitCode,
          output: error.output,
        }
      : error,
  );
  expect(failed).toEqual({
    type: "command-failed",
    line: "seq 1 30; echo e >&2; exit 3",
    exitCode: 3,
    output: [...Array.from({ length: 19 }, (_, i) => String(i + 12)), "e"].join("\n"),
  });
});
