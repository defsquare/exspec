// Jobs run `width` at a time, their events passed on as they come, interleaved; each job's
// result at its index. A job that throws ends them all: a job catches what it can survive.
export async function* inParallel<E, R>(
  jobs: readonly (() => AsyncGenerator<E, R>)[],
  width: number,
): AsyncGenerator<E, readonly R[]> {
  const results: R[] = [];
  const running = new Map<
    number,
    Promise<{ readonly i: number; readonly next: IteratorResult<E, R> }>
  >();
  const generators = new Map<number, AsyncGenerator<E, R>>();
  const advance = (i: number, generator: AsyncGenerator<E, R>) =>
    running.set(
      i,
      generator.next().then((next) => ({ i, next })),
    );
  let started = 0;
  const fill = () => {
    for (; running.size < width && started < jobs.length; started++) {
      const job = jobs[started];
      if (job === undefined) continue;
      const generator = job();
      generators.set(started, generator);
      advance(started, generator);
    }
  };
  fill();
  while (running.size > 0) {
    const { i, next } = await Promise.race(running.values());
    const generator = generators.get(i);
    if (next.done || generator === undefined) {
      running.delete(i);
      if (next.done) results[i] = next.value;
      fill();
      continue;
    }
    yield next.value;
    advance(i, generator);
  }
  return results;
}
