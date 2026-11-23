import type { Target } from "../shapes/target.ts";

const nameCharacter = /[a-z0-9-]/;

// Each provider declared must be named at the proxy by what starts the target: its start
// lines, or one of the texts given (the files under exspec/target/).
//   proxy: {port: 9100}, observables: [{observable: p}]
//   "URL=http://127.0.0.1:9100/p"    names p
//   "URL=http://127.0.0.1:9100/pq"   does not: q is a character of a name
// A naive check: it catches a target left calling the real provider, not a target pointed
// wrongly — the host, a port mapped, a path the client adds are not looked at.
export function checkPointedAtProxy(
  { proxy, observables = [], start }: Target,
  texts: readonly string[],
): readonly string[] {
  if (proxy === undefined) return [];
  if (observables.length === 0) {
    return [
      "target.yaml: a proxy is declared and no provider — declare each provider the target calls, or remove the proxy",
    ];
  }
  const all = [start.join("\n"), ...texts];
  const names = (text: string, at: string) =>
    text.split(at).some((after, i) => i > 0 && !nameCharacter.test(after.charAt(0)));
  return observables.flatMap(({ observable }) =>
    all.some((text) => names(text, `:${proxy.port}/${observable}`))
      ? []
      : [
          `target.yaml: the provider "${observable}" is declared and nothing that starts the target names it at the proxy — expected http://127.0.0.1:${proxy.port}/${observable} in the start lines or in a file of exspec/target/`,
        ],
  );
}
