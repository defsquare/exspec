// a file imported `with { type: "text" }` is its text, embedded in a compiled binary
declare module "*.md" {
  const text: string;
  export default text;
}
