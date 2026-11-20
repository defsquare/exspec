// `bun run build` -> dist/exspec, for this machine
// `bun run build all` -> dist/exspec-darwin-arm64, …, one per platform
const platforms = ["darwin-arm64", "darwin-x64", "linux-x64", "linux-arm64"] as const;
const outputs =
  process.argv[2] === "all"
    ? platforms.map((p) => ({ target: `bun-${p}` as const, outfile: `dist/exspec-${p}` }))
    : [{ outfile: "dist/exspec" }];

for (const compile of outputs) {
  const result = await Bun.build({
    entrypoints: ["src/cli/main.ts"],
    compile,
    // Ink imports react-devtools-core only when DEV is set and the package is installed; a
    // bundler resolves the import all the same. It is given an empty module.
    plugins: [
      {
        name: "no-react-devtools",
        setup(build) {
          build.onResolve({ filter: /^react-devtools-core$/ }, () => ({
            path: "react-devtools-core",
            namespace: "absent",
          }));
          build.onLoad({ filter: /.*/, namespace: "absent" }, () => ({
            contents: "export default {};",
            loader: "js",
          }));
        },
      },
    ],
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }
}

export {};
