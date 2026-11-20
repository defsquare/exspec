import type { InputPlace, Trigger } from "../shapes/bindings.ts";
import type { Interface } from "../shapes/target.ts";
import { isMap } from "./json.ts";

export type Places = {
  readonly places: Readonly<Record<string, InputPlace>>;
  readonly unplaced: readonly { readonly input: string; readonly why: string }[];
};

type Kind = InputPlace[0];

const kinds: readonly Kind[] = ["path", "query", "body", "form"];

const said: Readonly<Record<Kind, string>> = {
  path: "path parameter",
  query: "query parameter",
  body: "body field",
  form: "form field",
};

// The description's places named like the input: {path: {x}, body: {x, c}}, "x"
//   -> [[path, x], [body, x]]
function namedLike({ request }: Interface, input: string): readonly InputPlace[] {
  const parameters = {
    path: request.path,
    query: request.query,
    body: isMap(request.body) ? request.body : undefined,
    form: request.form,
  };
  return kinds
    .filter((kind) => {
      const named = parameters[kind];
      return named !== undefined && Object.hasOwn(named, input);
    })
    .map((kind): InputPlace => (kind === "body" ? ["body", input] : [kind, input]));
}

// Where each input of an operation is sent: the trigger's sends, else the one place of the
// description named like it.
//   inputs [x, c, b], sends {b: [body, a, b]}, "post /s/{x}" taking body {a: {b}, c}
//   -> {places: {x: [path, x], c: [body, c], b: [body, a, b]}, unplaced: []}
// Named nowhere, or twice (a path parameter and a body field): unplaced, with why. Two
// places are never chosen between: the trigger says which.
export function placesOfInputs({
  inputs,
  sends,
  bound,
}: {
  readonly inputs: readonly string[];
  readonly sends: Trigger["sends"];
  readonly bound: Interface;
}): Places {
  const where = `${bound.method} ${bound.pattern}`;
  const placed = inputs.map((input) => {
    const sent = Object.hasOwn(sends, input) ? sends[input] : undefined;
    return { input, places: sent === undefined ? namedLike(bound, input) : [sent] };
  });
  return {
    places: Object.fromEntries(
      placed.flatMap(({ input, places: [place, ...more] }) =>
        place !== undefined && more.length === 0 ? [[input, place]] : [],
      ),
    ),
    unplaced: placed.flatMap(({ input, places }) => {
      if (places.length === 1) return [];
      const why =
        places.length === 0
          ? `no path parameter, query parameter, body field or form field of ${where} is named "${input}"`
          : `"${input}" is a ${places.map(([kind]) => said[kind]).join(" and a ")} of ${where}: the trigger's sends says which`;
      return [{ input, why }];
    }),
  };
}
