import { expect, test } from "bun:test";
import { pathsFirst } from "../../src/derive/paths-first.ts";
import { bound, filesOf, hash, judgedAs, points } from "../roles-left-fixture.ts";

const g = { ...bound, interface: "g", pattern: "/g" };
const h = { ...bound, interface: "h", pattern: "/h" };

test("the interfaces a path of a state not reached names go first, none once it is reached", () => {
  const at = (path: string) =>
    pathsFirst(
      filesOf({
        ...points["a reference"],
        ...judgedAs(hash),
        "states.yaml": `- {state: s, of: [S], seen: x, path: ${path}}`,
      }),
      [bound, g, h],
    );
  expect({
    unreached: at("f/answers"),
    reached: at("f/exists-a"),
    none: pathsFirst(filesOf(points.judged), [bound, g, h]),
  }).toEqual({ unreached: [bound], reached: [], none: [] });
});
