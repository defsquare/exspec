import { expect, test } from "bun:test";
import { type Path, stepsFromStates } from "../../src/derive/steps-from-states.ts";
import type { Step, WrittenStep } from "../../src/shapes/roles.ts";

const path: Path = {
  state: "s",
  steps: [
    { when: "arrange", as: "a", name: "c", call: { operation: "f", with: { y: 1 } } },
    { when: "before", as: "a", request: { method: "get", path: "/a" } },
    {
      when: "call",
      as: "a",
      name: "d",
      request: { method: "get", path: "/a/{{c.id}}" },
    },
    { when: "after", as: "a", request: { method: "get", path: "/a/{{d.body.id}}" } },
  ],
};

const call: WrittenStep = {
  when: "call",
  as: "a",
  call: { operation: "g", with: { x: "{{p.c.id}}", z: "{{n.body.id}}" } },
};

test("a state step is the path's steps up to its call, as arrange, their names and holes under its name", () => {
  expect(
    stepsFromStates(
      [
        { when: "arrange", as: "a", name: "n", request: { method: "post", path: "/n" } },
        { when: "arrange", state: "s", name: "p" },
        call,
      ],
      [path],
    ),
  ).toEqual({
    from: [1, 2, 2, 3],
    steps: [
      { when: "arrange", as: "a", name: "n", request: { method: "post", path: "/n" } },
      { when: "arrange", as: "a", name: "p-c", call: { operation: "f", with: { y: 1 } } },
      {
        when: "arrange",
        as: "a",
        name: "p-d",
        request: { method: "get", path: "/a/{{p-c.id}}" },
      },
      {
        when: "call",
        as: "a",
        call: { operation: "g", with: { x: "{{p-c.id}}", z: "{{n.body.id}}" } },
      },
    ],
  });
});

test("steps with no state step come back as they are", () => {
  const steps: readonly Step[] = [
    { when: "arrange", service: "v", is: "refuses", with: { a: "{{p.c.id}}" } },
    { when: "call", as: null, request: { method: "get", path: "/a/{{p.c.id}}" } },
  ];
  expect(stepsFromStates(steps, [path])).toEqual({ steps, from: [1, 2] });
});

test("a state not reached, with why, a state states.yaml lacks and a name the path's steps take twice are findings", () => {
  expect(
    stepsFromStates(
      [
        {
          when: "arrange",
          as: "a",
          name: "p-c",
          request: { method: "post", path: "/n" },
        },
        { when: "arrange", state: "s", name: "p" },
        { when: "arrange", state: "t", name: "q" },
        { when: "arrange", state: "u", name: "r" },
        call,
      ],
      [path],
      [{ state: "t", awaited: true, why: "its path f/a is not judged yet" }],
    ),
  ).toEqual({
    findings: [
      'step 2: the names collide on "p-c"',
      'step 3: "t" is not a state that is reached: its path f/a is not judged yet',
      'step 4: "u" is not a state of states.yaml',
    ],
  });
});
