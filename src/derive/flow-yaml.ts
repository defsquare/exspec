// words YAML reads as something else than the text
const reserved = new Set(["true", "false", "null"]);

// a text written bare when YAML reads it back as that text, quoted otherwise:
//   "Prog One" -> Prog One;  "true", "12", "a: b", "{{s.id}}" -> quoted
const text = (value: string) =>
  /^[A-Za-z_/][\w./@-]*( [\w./@-]+)*$/.test(value) && !reserved.has(value.toLowerCase())
    ? value
    : JSON.stringify(value);

// A value of plain data on one line, as a scenario's step is written; a key whose value is
// undefined is left out:
//   {operation: f, with: {x: "{{s.id}}", n: 1, t: [a b, "12"]}}
//   -> '{operation: f, with: {x: "{{s.id}}", n: 1, t: [a b, "12"]}}'
export function flowYaml(value: unknown): string {
  if (typeof value === "string") return text(value);
  if (Array.isArray(value)) return `[${value.map(flowYaml).join(", ")}]`;
  if (value === null || typeof value !== "object") return String(value);
  return `{${Object.entries(value)
    .filter(([, v]) => v !== undefined)
    .map(([key, v]) => `${text(key)}: ${flowYaml(v)}`)
    .join(", ")}}`;
}
