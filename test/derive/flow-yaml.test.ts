import { expect, test } from "bun:test";
import { flowYaml } from "../../src/derive/flow-yaml.ts";

const value = {
  when: "arrange",
  as: "a",
  call: {
    operation: "f",
    with: {
      x: "{{s.id}}",
      n: 1,
      t: ["Prog One", "12", "true", "a: b", "2026-12-01", "u@x.test", "/a/b"],
      e: { z: null, b: false },
    },
  },
};

test("a value on one line, a text bare only when YAML reads it back as that text", () => {
  expect({
    line: flowYaml(value),
    back: Bun.YAML.parse(flowYaml(value)),
  }).toEqual({
    line: '{when: arrange, as: a, call: {operation: f, with: {x: "{{s.id}}", n: 1, t: [Prog One, "12", "true", "a: b", "2026-12-01", u@x.test, /a/b], e: {z: null, b: false}}}}',
    back: value,
  });
});
