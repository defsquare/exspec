import { isAbsolute, relative, resolve } from "node:path";

// a.yaml of under("a") -> false; "a" and "a/b.yaml" -> true
export const under = (folder: string) => (path: string) =>
  path === folder || path.startsWith(`${folder}/`);

// What a role's session may read, relative to its checkout cwd:
//   outside specimen/   all of it when `checkout`, nothing otherwise
//   under specimen/     what `allowed` accepts, given the path below specimen/
//   a search            the same of the folder it runs in, which must hold no part of
//                       specimen/ it may not read; its glob climbs nowhere
// ("/d", checkout, allowed "a.yaml"): "src/x.ts", "specimen/a.yaml" -> true;
//   "specimen/b.yaml", "../x", a search over "." or "specimen" -> false
export function readsOf(
  cwd: string,
  {
    checkout,
    allowed,
  }: { readonly checkout: boolean; readonly allowed: (path: string) => boolean },
): (path: string, pattern?: string) => boolean {
  return (path, pattern) => {
    const within = relative(cwd, resolve(cwd, path));
    if (within.startsWith("..") || isAbsolute(within)) return false;
    if (pattern !== undefined && (pattern.includes("..") || isAbsolute(pattern))) {
      return false;
    }
    if (under("specimen")(within)) {
      return allowed(within.slice("specimen/".length));
    }
    // a search over the checkout's root runs through specimen/ too
    return checkout && !(pattern !== undefined && within === "");
  };
}

// What a role's session may write: under specimen/, what `allowed` accepts
export function writesOf(
  cwd: string,
  allowed: (path: string) => boolean,
): (path: string) => boolean {
  return (path) => {
    const within = relative(cwd, resolve(cwd, path));
    return (
      under("specimen")(within) &&
      within !== "specimen" &&
      allowed(within.slice("specimen/".length))
    );
  };
}
