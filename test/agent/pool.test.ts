import { expect, test } from "bun:test";
import { inParallel } from "../../src/agent/pool.ts";

const job = (name: string, every: number) =>
  async function* (): AsyncGenerator<string, string> {
    for (let i = 0; i < 2; i++) {
      await Bun.sleep(every);
      yield `${name}${i}`;
    }
    return name;
  };

async function run(width: number) {
  const events: string[] = [];
  const pool = inParallel([job("a", 20), job("b", 30)], width);
  for (let next = await pool.next(); ; next = await pool.next()) {
    if (next.done) return { events, results: next.value };
    events.push(next.value);
  }
}

test("jobs run width at a time, their events interleaved, their results in order", async () => {
  expect([await run(1), await run(2)]).toEqual([
    { events: ["a0", "a1", "b0", "b1"], results: ["a", "b"] },
    { events: ["a0", "b0", "a1", "b1"], results: ["a", "b"] },
  ]);
});
