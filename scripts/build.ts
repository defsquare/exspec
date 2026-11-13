// Ink imports react-devtools-core only when DEV is set and the package is installed; a
// bundler resolves the import all the same. It is given an empty module.
const result = await Bun.build({
  entrypoints: ["src/cli/main.ts"],
  compile: { outfile: "dist/specimen" },
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
