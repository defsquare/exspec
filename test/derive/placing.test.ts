import { expect, test } from "bun:test";
import { placedOfRoles, placeOperations } from "../../src/derive/placing.ts";
import { parseExtraction } from "../../src/shapes/extraction.ts";
import { rulesSchema } from "../../src/shapes/roles.ts";

const structure = (name: string) => `
- structure: ${name}
  identity: id
  fields: { id: { type: string }, name: { type: string } }`;

test("an operation is filed under the structure it answers, else under the one it names", () => {
  const { extraction, problems } = parseExtraction([
    { path: "structures.yaml", text: structure("A") + structure("B") },
    {
      path: "facts.yaml",
      text: `
- fact: a-exists
  condition: [{ structure: A, where: { id: [call, id] }, must-be: [exists] }]
`,
    },
    {
      path: "operations/answers.yaml",
      text: `
operation: answers
takes: { b: { field: [B, id] }, n: { field: [B, name] } }
answers: A
effects: [{ rule: e, then: { field: [{ of: [A, name], change: [set, x] }] } }]
`,
    },
    {
      path: "operations/names-one.yaml",
      text: `
operation: names-one
takes: { id: { field: [A, id] } }
requires: [{ rule: r, fact: a-exists, otherwise: not-found }]
answers: null
`,
    },
    {
      path: "operations/names-two.yaml",
      text: `
operation: names-two
takes: { a: { field: [A, id] }, b: { field: [B, id] } }
answers: null
`,
    },
    {
      path: "operations/guarded.yaml",
      text: `
operation: guarded
takes: { n: { type: int } }
requires: [{ rule: r, fact: a-exists, otherwise: not-found }]
answers: null
`,
    },
  ]);
  expect(problems).toEqual([]);
  expect(placeOperations(extraction)).toEqual([
    {
      operation: "answers",
      home: "A",
      touches: [
        {
          structure: "A",
          as: [
            { verb: "answers", what: [] },
            { verb: "changes", what: ["name"] },
          ],
        },
        { structure: "B", as: [{ verb: "takes", what: ["id", "name"] }] },
      ],
    },
    {
      operation: "names-one",
      home: "A",
      touches: [
        {
          structure: "A",
          as: [
            { verb: "takes", what: ["id"] },
            { verb: "requires", what: ["r"] },
          ],
        },
      ],
    },
    {
      operation: "names-two",
      home: null,
      touches: [
        { structure: "A", as: [{ verb: "takes", what: ["id"] }] },
        { structure: "B", as: [{ verb: "takes", what: ["id"] }] },
      ],
    },
    {
      operation: "guarded",
      home: null,
      touches: [{ structure: "A", as: [{ verb: "requires", what: ["r"] }] }],
    },
  ]);
});

test("a reading is filed under the structure it answers, else under the one its inputs name", () => {
  const { extraction } = parseExtraction([
    { path: "structures.yaml", text: structure("A") + structure("B") },
  ]);
  const readings = [
    `
operation: answers
takes: { a: { says: "the a", field: [A, id] }, n: { says: "a name" } }
answers: { says: "200 with the a", structure: A }
`,
    `
operation: takes
takes: { b: { says: "the b", field: [B, id] } }
answers: { says: "204", structure: null }
`,
    `
operation: names-nothing
takes: { n: { says: "a number" } }
answers: { says: "200 with a count", structure: null }
`,
  ].map((text) => rulesSchema.parse(Bun.YAML.parse(text)));
  expect(placedOfRoles(extraction.structures, readings)).toEqual([
    {
      operation: "answers",
      home: "A",
      touches: [
        {
          structure: "A",
          as: [
            { verb: "answers", what: [] },
            { verb: "takes", what: ["id"] },
          ],
        },
      ],
    },
    {
      operation: "takes",
      home: "B",
      touches: [{ structure: "B", as: [{ verb: "takes", what: ["id"] }] }],
    },
    { operation: "names-nothing", home: null, touches: [] },
  ]);
});
