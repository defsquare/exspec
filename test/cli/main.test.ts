import { expect, test } from "bun:test";
import { join } from "node:path";

const main = join(import.meta.dir, "../../src/cli/main.ts");

function exspec(...args: readonly string[]) {
  const { exitCode, stdout, stderr } = Bun.spawnSync(["bun", main, ...args]);
  return {
    exitCode,
    out: stdout.toString().split("\n")[0],
    err: stderr.toString().split("\n")[0],
  };
}

test("--help prints the usage and succeeds", () => {
  expect(exspec("--help")).toEqual({
    exitCode: 0,
    out: "usage: exspec <status|check|verdicts> <dir> [--format json]",
    err: "",
  });
});

test("--version names the tool and succeeds", () => {
  const { exitCode, out, err } = exspec("--version");
  expect({ exitCode, out: out?.replace(/\d+\.\d+\.\d+\S*/, "x.y.z"), err }).toEqual({
    exitCode: 0,
    out: "exspec x.y.z",
    err: "",
  });
});

test("an option's value that is not one of its own is refused", () => {
  const refused = { exitCode: 2, out: "" };
  const { exitCode, out } = exspec("status", ".", "--effort", "huge");
  expect({ exitCode, out }).toEqual(refused);
  const format = exspec("status", ".", "--format", "xml");
  expect({ exitCode: format.exitCode, out: format.out }).toEqual(refused);
});

test("an unknown option is refused, nothing on the output", () => {
  const { exitCode, out } = exspec("--nope");
  expect({ exitCode, out }).toEqual({ exitCode: 2, out: "" });
});
