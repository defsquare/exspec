import type { Json } from "../shapes/roles.ts";
import type { Shape } from "../shapes/target.ts";
import { isTuple } from "./shape-path.ts";

// One value of a wire shape, the same every time:
//   string "a", any "a", int 1, number 1, boolean true, null null
//   {k: int} {k: 1},  [string] ["a"],  [maybe, int] 1,  [schema, N] {}
// A named shape is not looked up: {} stands for it.
export function valueOfShape(shape: Shape): Json {
  if (shape === null) return null;
  if (typeof shape === "string") {
    return shape === "int" || shape === "number" ? 1 : shape === "boolean" ? true : "a";
  }
  if (isTuple(shape)) {
    if (shape.length === 1) return [valueOfShape(shape[0])];
    return shape[0] === "schema" ? {} : valueOfShape(shape[1]);
  }
  return Object.fromEntries(
    Object.entries(shape).map(([key, one]) => [key, valueOfShape(one)]),
  );
}
