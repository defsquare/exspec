import { z } from "zod";

// The metamodel as docs/metamodel.yaml writes it, and its drawings: one of the groups, one
// a group. Pure: a model in, SVG texts out; with a base, what changed since is coloured.

const at = z.tuple([z.int().min(0), z.int().min(0)]).readonly();

export const modelSchema = z
  .strictObject({
    groups: z
      .array(z.strictObject({ group: z.string(), says: z.string(), at }).readonly())
      .readonly(),
    concepts: z
      .array(
        // at: its place on its group's grid; in: the concept it is a part of, drawn inside it
        z
          .strictObject({
            concept: z.string(),
            group: z.string(),
            says: z.string(),
            at: at.optional(),
            in: z.string().optional(),
          })
          .readonly(),
      )
      .readonly(),
    links: z
      .array(
        z
          .strictObject({
            from: z.string(),
            to: z.string(),
            verb: z.string(),
            card: z.string().optional(),
            exception: z.literal(true).optional(),
          })
          .readonly(),
      )
      .readonly(),
  })
  .readonly();

export type Model = z.infer<typeof modelSchema>;
type Concept = Model["concepts"][number];
type Link = Model["links"][number];

// same: as in the base, or no base; was: what a changed one said before
type Status = "same" | "added" | "removed" | "changed";
type Marked<T> = T & { readonly status: Status; readonly was?: string };

export class MetamodelError extends Error {
  readonly type = "metamodel";
}

const sayOf = (link: Link) =>
  `${link.verb}${link.card === undefined ? "" : ` ${link.card}`}${link.exception ? " (exception)" : ""}`;

// A concept is the same concept by its name, a link by its two ends; its place on the grid
// is not compared.
//   base {a, b; a>b "has"}, now {a, c; a>c "has"}  ->  a same, b removed, c added,
//   a>b removed, a>c added
function marked(model: Model, base: Model | undefined) {
  const key = (link: Link) => `${link.from}>${link.to}`;
  const concepts: readonly Marked<Concept>[] = [
    ...model.concepts.map((concept): Marked<Concept> => {
      const old = base?.concepts.find((one) => one.concept === concept.concept);
      if (base === undefined) return { ...concept, status: "same" };
      if (old === undefined) return { ...concept, status: "added" };
      return old.group === concept.group &&
        old.says === concept.says &&
        old.in === concept.in
        ? { ...concept, status: "same" }
        : { ...concept, status: "changed", was: `${old.group}: ${old.says}` };
    }),
    ...(base?.concepts ?? [])
      .filter((old) => !model.concepts.some((one) => one.concept === old.concept))
      .map((old): Marked<Concept> => ({ ...old, status: "removed" })),
  ];
  const links: readonly Marked<Link>[] = [
    ...model.links.map((link): Marked<Link> => {
      const old = base?.links.find((one) => key(one) === key(link));
      if (base === undefined) return { ...link, status: "same" };
      if (old === undefined) return { ...link, status: "added" };
      return sayOf(old) === sayOf(link)
        ? { ...link, status: "same" }
        : { ...link, status: "changed", was: sayOf(old) };
    }),
    ...(base?.links ?? [])
      .filter((old) => !model.links.some((one) => key(one) === key(old)))
      .map((old): Marked<Link> => ({ ...old, status: "removed" })),
  ];
  return { concepts, links };
}

// what changed since the base, a line each: "+ concept state", "~ link a > b: was has 1"
export function changesOf(model: Model, base: Model): readonly string[] {
  const { concepts, links } = marked(model, base);
  const sign = { added: "+", removed: "-", changed: "~", same: "" };
  return [
    ...concepts
      .filter(({ status }) => status !== "same")
      .map(
        ({ concept, status, was }) =>
          `${sign[status]} concept ${concept}${was === undefined ? "" : `: was ${was}`}`,
      ),
    ...links
      .filter(({ status }) => status !== "same")
      .map(
        (link) =>
          `${sign[link.status]} link ${link.from} > ${link.to}: ${sayOf(link)}${link.was === undefined ? "" : `, was ${link.was}`}`,
      ),
  ];
}

// ---- drawing

type Point = { readonly x: number; readonly y: number };
type Box = Point & { readonly w: number; readonly h: number };

const fills: Record<string, { readonly fill: string; readonly stroke: string }> = {
  proof: { fill: "#e8f0fe", stroke: "#3b6fd4" },
  specification: { fill: "#f5f3ff", stroke: "#7c3aed" },
  bindings: { fill: "#fff4d6", stroke: "#b8860b" },
  target: { fill: "#f1f5f9", stroke: "#475569" },
};
const paintOf = (group: string) => fills[group] ?? { fill: "#ffffff", stroke: "#334155" };
const ink = { same: "#334155", added: "#15803d", removed: "#dc2626", changed: "#d97706" };

const n = (value: number) => String(Math.round(value * 10) / 10);
const esc = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const centre = ({ x, y, w, h }: Box): Point => ({ x: x + w / 2, y: y + h / 2 });

function text(
  { x, y }: Point,
  said: string,
  {
    size = 12,
    weight = 400,
    anchor = "middle",
    fill = "#111827",
    halo = false,
    struck = false,
    italic = false,
  }: {
    readonly size?: number;
    readonly weight?: number;
    readonly anchor?: "start" | "middle" | "end";
    readonly fill?: string;
    readonly halo?: boolean;
    readonly struck?: boolean;
    readonly italic?: boolean;
  } = {},
) {
  const more = [
    halo ? ' stroke="#ffffff" stroke-width="4" paint-order="stroke"' : "",
    struck ? ' text-decoration="line-through"' : "",
    italic ? ' font-style="italic"' : "",
  ].join("");
  return `<text x="${n(x)}" y="${n(y)}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" fill="${fill}"${more}>${esc(said)}</text>`;
}

function rect(
  { x, y, w, h }: Box,
  {
    fill,
    stroke,
    width = 1.5,
    dash,
    rx = 6,
  }: {
    readonly fill: string;
    readonly stroke: string;
    readonly width?: number;
    readonly dash?: string;
    readonly rx?: number;
  },
) {
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${dash === undefined ? "" : ` stroke-dasharray="${dash}"`}/>`;
}

const dashOf = ({ status, exception }: Marked<Link>) =>
  status === "removed" ? "2 4" : exception ? "6 4" : undefined;

// a line through points, an arrow at its end
function arrow(points: readonly Point[], link: Marked<Link>) {
  const dash = dashOf(link);
  return `<polyline points="${points.map(({ x, y }) => `${n(x)},${n(y)}`).join(" ")}" fill="none" stroke="${ink[link.status]}" stroke-width="${link.status === "same" ? 1.4 : 2.4}"${dash === undefined ? "" : ` stroke-dasharray="${dash}"`} marker-end="url(#to-${link.status})"/>`;
}

const defs = `<defs>${(["same", "added", "removed", "changed"] as const)
  .map(
    (status) =>
      `<marker id="to-${status}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${ink[status]}"/></marker>`,
  )
  .join("")}</defs>`;

const legend = (y: number) =>
  [
    text({ x: 20, y }, "added", { anchor: "start", fill: ink.added, weight: 600 }),
    text({ x: 80, y }, "changed", { anchor: "start", fill: ink.changed, weight: 600 }),
    text({ x: 150, y }, "removed", {
      anchor: "start",
      fill: ink.removed,
      weight: 600,
      struck: true,
    }),
  ].join("");

function svg(width: number, height: number, parts: readonly string[], diff: boolean) {
  const tall = height + (diff ? 30 : 0);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(width)} ${n(tall)}" width="${n(width)}" height="${n(tall)}" font-family="'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif">
${defs}
<rect width="${n(width)}" height="${n(tall)}" fill="#ffffff"/>
${parts.filter((part) => part !== "").join("\n")}${diff ? `\n${legend(height + 10)}` : ""}
</svg>
`;
}

const partLineHeight = 24;

// a part of a concept, and the links between the two: down, from the concept to its part
type Part = {
  readonly part: Marked<Concept>;
  readonly down: readonly Marked<Link>[];
  readonly up: readonly Marked<Link>[];
};
const wordsOf = (link: Link) =>
  `${link.verb}${link.card === undefined ? "" : ` ${link.card}`}`;
const wide = (said: string) => said.length * 5.3;

// a line of a concept's box, a part each:   holds 1..n [field] ↩ may refer to
function partLine({ x, y }: Point, { part, down, up }: Part) {
  const before = down.map(wordsOf).join(", ");
  const after = up.map((link) => `↩ ${wordsOf(link)}`).join(", ");
  const chip = wide(part.concept) + 18;
  const left = x - (wide(before) + chip + wide(after) + 12) / 2;
  const inkOf = (links: readonly Marked<Link>[]) =>
    links.find(({ status }) => status !== "same")?.status ?? "same";
  const faint = (status: Status) => (status === "same" ? "#4b5563" : ink[status]);
  const changed = part.status !== "same";
  return [
    text({ x: left + wide(before), y: y + 13 }, before, {
      size: 10,
      anchor: "end",
      fill: faint(inkOf(down)),
    }),
    rect(
      { x: left + wide(before) + 6, y, w: chip, h: 18 },
      {
        fill: "#ffffff",
        stroke: changed ? ink[part.status] : paintOf(part.group).stroke,
        width: changed ? 2.4 : 1,
        rx: 9,
      },
    ),
    text({ x: left + wide(before) + 6 + chip / 2, y: y + 13 }, part.concept, {
      size: 11,
      weight: 600,
      struck: part.status === "removed",
    }),
    text({ x: left + wide(before) + chip + 12, y: y + 13 }, after, {
      size: 10,
      anchor: "start",
      fill: faint(inkOf(up)),
    }),
  ].join("");
}

// a concept's box: its name, and what it says and its parts when it is drawn whole
function conceptBox(
  box: Box,
  concept: Marked<Concept>,
  whole: boolean,
  parts: readonly Part[] = [],
) {
  const { fill, stroke } = paintOf(concept.group);
  const changed = concept.status !== "same";
  const { x } = centre(box);
  const struck = concept.status === "removed";
  return [
    concept.was === undefined ? "" : `<g><title>was ${esc(concept.was)}</title>`,
    rect(box, {
      fill,
      stroke: changed ? ink[concept.status] : stroke,
      width: changed ? 3 : 1.5,
      ...(struck ? { dash: "4 4" } : {}),
    }),
    text({ x, y: box.y + (whole ? 20 : box.h / 2 + 4) }, concept.concept, {
      size: 13,
      weight: 600,
      struck,
    }),
    whole ? text({ x, y: box.y + 37 }, concept.says, { size: 11, fill: "#4b5563" }) : "",
    ...(whole
      ? parts.map((part, i) => partLine({ x, y: box.y + 46 + i * partLineHeight }, part))
      : []),
    concept.was === undefined ? "" : "</g>",
  ].join("");
}

function label(at: Point, link: Marked<Link>, anchor: "start" | "middle" | "end") {
  const said = `${link.verb}${link.card === undefined ? "" : ` ${link.card}`}`;
  return [
    link.was === undefined ? "" : `<g><title>was ${esc(link.was)}</title>`,
    text(at, said, {
      size: 11,
      anchor,
      halo: true,
      fill: link.status === "same" ? "#111827" : ink[link.status],
      struck: link.status === "removed",
    }),
    link.was === undefined ? "" : "</g>",
  ].join("");
}

// where the segment from the centre of a box towards a point leaves the box
function leaves(box: Box, towards: Point): Point {
  const from = centre(box);
  const dx = towards.x - from.x;
  const dy = towards.y - from.y;
  const scale = Math.min(
    dx === 0 ? Number.POSITIVE_INFINITY : box.w / 2 / Math.abs(dx),
    dy === 0 ? Number.POSITIVE_INFINITY : box.h / 2 / Math.abs(dy),
  );
  return { x: from.x + dx * scale, y: from.y + dy * scale };
}

const side = { box: { w: 250, h: 48 }, cell: { w: 370, h: 132 }, pad: 100 };
const out = { box: { w: 136, h: 30 }, pad: 30, top: 40, gap: 26 };
const margin = 24;
type Side = "left" | "right" | "top" | "bottom";

// One group whole — its concepts on their grid, their links — in a thick frame; around it,
// in a dashed frame each, the groups it shares a link with, holding only the concepts such
// a link reaches. A link between two concepts of the group is a straight line; one that
// crosses the frames runs in the gaps between the boxes.
function drawGroup(
  model: Model,
  group: string,
  all: ReturnType<typeof marked>,
  diff: boolean,
) {
  // A part is drawn inside its concept, and a link that names a part is drawn at the
  // concept, the part's name in its words:
  //   field in structure; operation > field "takes"  ->  operation > structure "takes field"
  const concepts = all.concepts.flatMap((one) =>
    one.at === undefined ? [] : [{ ...one, at: one.at }],
  );
  const wholeOf = (name: string) =>
    all.concepts.find((one) => one.concept === name)?.in ?? name;
  const partsOf = (name: string): readonly Part[] =>
    all.concepts
      .filter((one) => one.in === name)
      .map((part) => ({
        part,
        down: all.links.filter((l) => l.from === name && l.to === part.concept),
        up: all.links.filter((l) => l.from === part.concept && l.to === name),
      }));
  const links = all.links
    .filter((link) => wholeOf(link.from) !== wholeOf(link.to))
    .map((link): Marked<Link> => {
      const { card, ...rest } = link;
      const said = [card, wholeOf(link.to) === link.to ? undefined : link.to]
        .filter((word) => word !== undefined)
        .join(" ");
      return {
        ...rest,
        from: wholeOf(link.from),
        to: wholeOf(link.to),
        verb: wholeOf(link.from) === link.from ? link.verb : `${link.from} ${link.verb}`,
        ...(said === "" ? {} : { card: said }),
      };
    });
  const groupOf = (name: string) => concepts.find((one) => one.concept === name)?.group;
  const placeOf = (name: string) => model.groups.find((one) => one.group === name)?.at;
  const inner = concepts.filter((one) => one.group === group);
  const columns = Math.max(...inner.map(({ at: [c] }) => c)) + 1;
  const rows = Math.max(...inner.map(({ at: [, r] }) => r)) + 1;
  const crossing = links.filter(
    (link) => (groupOf(link.from) === group) !== (groupOf(link.to) === group),
  );
  const outerOf = (link: Link) => (groupOf(link.from) === group ? link.to : link.from);
  const here = placeOf(group) ?? [0, 0];
  const sideOf = (other: string): Side => {
    const [c, r] = placeOf(other) ?? [0, 0];
    const dc = c - here[0];
    const dr = r - here[1];
    if (Math.abs(dc) + Math.abs(dr) !== 1)
      throw new MetamodelError(
        `a link joins ${group} and ${other}: the two groups must sit side by side`,
      );
    return dc === -1 ? "left" : dc === 1 ? "right" : dr === -1 ? "top" : "bottom";
  };
  const neighbours = [
    ...new Set(crossing.flatMap((link) => groupOf(outerOf(link)) ?? [])),
  ].map((name) => {
    const held = concepts
      .filter((one) => one.group === name)
      .filter((one) => crossing.some((link) => outerOf(link) === one.concept))
      .sort((a, b) => a.at[1] - b.at[1] || a.at[0] - b.at[0]);
    const where = sideOf(name);
    const upright = where === "left" || where === "right";
    return {
      name,
      held,
      where,
      upright,
      w: upright
        ? out.box.w + 2 * out.pad
        : held.length * out.box.w + (held.length - 1) * out.gap + 2 * out.pad,
      h: upright
        ? held.length * out.box.h + (held.length - 1) * out.gap + out.top + out.pad
        : out.box.h + out.top + out.pad,
      lanes: crossing.filter((link) => groupOf(outerOf(link)) === name).length,
    };
  });
  const at = (where: Side) => neighbours.find((one) => one.where === where);
  const gapOf = (where: Side) => 60 + 18 * (at(where)?.lanes ?? 0);
  const frame: Box = {
    x: margin + (at("left") === undefined ? 0 : (at("left")?.w ?? 0) + gapOf("left")),
    y: margin + (at("top") === undefined ? 0 : (at("top")?.h ?? 0) + gapOf("top")),
    w: 2 * side.pad + (columns - 1) * side.cell.w + side.box.w,
    h: 2 * side.pad + (rows - 1) * side.cell.h + side.box.h,
  };
  // a concept with parts is taller, and stays centred on its row
  const innerBox = ({ concept, at: [c, r] }: (typeof inner)[number]): Box => {
    const more = partsOf(concept).length * partLineHeight;
    return {
      x: frame.x + side.pad + c * side.cell.w,
      y: frame.y + side.pad + r * side.cell.h - more / 2,
      w: side.box.w,
      h: side.box.h + more,
    };
  };
  const frames = neighbours.map((one) => {
    const box: Box = {
      x:
        one.where === "left"
          ? margin
          : one.where === "right"
            ? frame.x + frame.w + gapOf("right")
            : frame.x + Math.max(0, (frame.w - one.w) / 2),
      y:
        one.where === "top"
          ? margin
          : one.where === "bottom"
            ? frame.y + frame.h + gapOf("bottom")
            : frame.y + Math.max(0, (frame.h - one.h) / 2),
      w: one.w,
      h: one.h,
    };
    return {
      ...one,
      box,
      boxes: one.held.map((concept, i) => ({
        concept,
        box: {
          x: box.x + out.pad + (one.upright ? 0 : i * (out.box.w + out.gap)),
          y: box.y + out.top + (one.upright ? i * (out.box.h + out.gap) : 0),
          ...out.box,
        },
      })),
    };
  });
  const width =
    Math.max(frame.x + frame.w, ...frames.map(({ box }) => box.x + box.w)) + margin;
  const height =
    Math.max(frame.y + frame.h, ...frames.map(({ box }) => box.y + box.h)) + margin;

  const within = links.filter(
    (link) => groupOf(link.from) === group && groupOf(link.to) === group,
  );
  const pairOf = (link: Link) => [link.from, link.to].sort().join(" | ");
  const straight = within.map((link) => {
    const from = inner.find((one) => one.concept === link.from);
    const to = inner.find((one) => one.concept === link.to);
    if (from === undefined || to === undefined) return "";
    const a = innerBox(from);
    const b = innerBox(to);
    // the links between the same two concepts are drawn apart, side by side, and each
    // is said at its own place along the way
    const same = within.filter((one) => pairOf(one) === pairOf(link));
    const nth = same.indexOf(link);
    const way = [link.from, link.to].sort()[0] === link.from ? 1 : -1;
    const length = Math.hypot(centre(b).x - centre(a).x, centre(b).y - centre(a).y);
    const apart = (nth - (same.length - 1) / 2) * 18 * way;
    const shift = {
      x: (-(centre(b).y - centre(a).y) / length) * apart,
      y: ((centre(b).x - centre(a).x) / length) * apart,
    };
    const moved = (box: Box): Box => ({ ...box, x: box.x + shift.x, y: box.y + shift.y });
    const start = leaves(moved(a), centre(moved(b)));
    const end = leaves(moved(b), centre(moved(a)));
    // upright, they are said outside the pair, left of the left one, right of the right
    const beside = Math.abs(shift.x) > Math.abs(shift.y) ? Math.sign(shift.x) : 0;
    const along =
      beside !== 0
        ? 0.5
        : way === 1
          ? (nth + 1) / (same.length + 1)
          : 1 - (nth + 1) / (same.length + 1);
    return [
      arrow([start, end], link),
      label(
        {
          x: start.x + (end.x - start.x) * along + beside * 6,
          y: start.y + (end.y - start.y) * along + 4,
        },
        link,
        beside < 0 ? "end" : beside > 0 ? "start" : "middle",
      ),
    ].join("");
  });

  // A link that crosses the frames enters its concept of the group by the side that faces
  // the other frame when the concept is on that edge of the grid; else it runs in the
  // gutter above the concept's row (from a frame beside) or left of its column (from a
  // frame above or below).
  const routes = frames.flatMap((one) =>
    crossing
      .filter((link) => groupOf(outerOf(link)) === one.name)
      .flatMap((link, lane) => {
        const outer = one.boxes.find(({ concept }) => concept.concept === outerOf(link));
        const concept = inner.find(
          (c) => c.concept === link.from || c.concept === link.to,
        );
        if (outer === undefined || concept === undefined) return [];
        const [c, r] = concept.at;
        const edge = one.upright
          ? c === (one.where === "left" ? 0 : columns - 1)
          : r === (one.where === "top" ? 0 : rows - 1);
        const enters: Side = edge ? one.where : one.upright ? "top" : "left";
        return [{ link, lane, one, outer, concept, edge, enters }];
      }),
  );
  type Route = (typeof routes)[number];
  // the place of a route among those of the same key, centred: of three, -1, 0, 1
  const placeAmong = (route: Route, keyOf: (one: Route) => string) => {
    const same = routes.filter((one) => keyOf(one) === keyOf(route));
    return same.indexOf(route) - (same.length - 1) / 2;
  };
  const taken = new Map<string, number>();
  const nextIn = (gutter: string) => {
    const count = taken.get(gutter) ?? 0;
    taken.set(gutter, count + 1);
    return count;
  };
  const routed = routes.map((route) => {
    const { link, lane, one, outer, concept, edge, enters } = route;
    const box = innerBox(concept);
    const mid = centre(box);
    const o = centre(outer.box);
    const [c, r] = concept.at;
    const entering = placeAmong(
      route,
      (x) => `${x.enters} ${x.edge} ${x.concept.concept}`,
    );
    const leaving = placeAmong(route, (x) => x.outer.concept.concept) * 8;
    // from a gutter, it enters off the middle of the side, towards where it comes from:
    // the middle is where a link of the group itself arrives
    const off = edge ? 0 : one.where === "left" || one.where === "top" ? -1 : 1;
    const entry: Point =
      enters === "top" || enters === "bottom"
        ? {
            x: mid.x + (off * box.w) / 4 + entering * 46,
            y: enters === "top" ? box.y : box.y + box.h,
          }
        : {
            x: enters === "left" ? box.x : box.x + box.w,
            y: mid.y + off * 12 + entering * 16,
          };
    const start: Point = one.upright
      ? {
          x: one.where === "left" ? outer.box.x + outer.box.w : outer.box.x,
          y: o.y + leaving,
        }
      : {
          x: o.x + leaving,
          y: one.where === "top" ? outer.box.y + outer.box.h : outer.box.y,
        };
    const far = 30 + 18 * lane;
    const gap: Point = one.upright
      ? { x: one.where === "left" ? frame.x - far : frame.x + frame.w + far, y: start.y }
      : { x: start.x, y: one.where === "top" ? frame.y - far : frame.y + frame.h + far };
    const above = box.y - 20 - 16 * (edge || !one.upright ? 0 : nextIn(`row ${r}`));
    const beside = box.x - 22 - 16 * (edge || one.upright ? 0 : nextIn(`column ${c}`));
    const points: readonly Point[] = edge
      ? [
          start,
          gap,
          one.upright ? { x: gap.x, y: entry.y } : { x: entry.x, y: gap.y },
          entry,
        ]
      : one.upright
        ? [start, gap, { x: gap.x, y: above }, { x: entry.x, y: above }, entry]
        : [start, gap, { x: beside, y: gap.y }, { x: beside, y: entry.y }, entry];
    const line = groupOf(link.from) === group ? [...points].reverse() : points;
    // from a gutter, it is said beside the last turn: the middle of a gutter is where the
    // links of the group cross it, each with its own words
    const said = !edge
      ? one.upright
        ? label({ x: entry.x - off * 10, y: above + 12 }, link, off < 0 ? "end" : "start")
        : label({ x: beside - 6, y: entry.y + off * 16 + 4 }, link, "end")
      : one.upright
        ? label(
            { x: entry.x + (enters === "left" ? -14 : 14), y: entry.y - 4 },
            link,
            enters === "left" ? "end" : "start",
          )
        : label(
            { x: entry.x - 6, y: enters === "top" ? entry.y - 12 : entry.y + 20 },
            link,
            "end",
          );
    return [arrow(line, link), said].join("");
  });

  const title = (box: Box, name: string, bold: boolean) =>
    text({ x: box.x + 14, y: box.y + 22 }, name, {
      anchor: "start",
      size: bold ? 15 : 13,
      weight: 700,
      fill: paintOf(name).stroke,
    });
  return svg(
    width,
    height,
    [
      rect(frame, { fill: "#ffffff", stroke: paintOf(group).stroke, width: 3, rx: 10 }),
      title(frame, group, true),
      ...frames.map(({ box, name }) =>
        [
          rect(box, {
            fill: "#ffffff",
            stroke: paintOf(name).stroke,
            width: 1.2,
            dash: "7 5",
            rx: 10,
          }),
          title(box, name, false),
        ].join(""),
      ),
      ...straight,
      ...routed,
      ...inner.map((concept) =>
        conceptBox(innerBox(concept), concept, true, partsOf(concept.concept)),
      ),
      ...frames.flatMap(({ boxes }) =>
        boxes.map(({ concept, box }) => conceptBox(box, concept, false)),
      ),
    ],
    diff,
  );
}

// "a, b, c, d" cut into lines of about a width: ["a, b,", "c, d"]
function wrapped(words: readonly string[], width: number): readonly string[] {
  const lines: string[] = [];
  for (const [i, word] of words.entries()) {
    const said = i === words.length - 1 ? word : `${word},`;
    const last = lines.at(-1);
    if (last !== undefined && `${last} ${said}`.length <= width)
      lines[lines.length - 1] = `${last} ${said}`;
    else lines.push(said);
  }
  return lines;
}

// left, top: room for what is written left of an arrow that goes down from the first
// column, and above one that leaves the first row
const big = { w: 360, h: 118, gap: { w: 330, h: 200 }, left: 90, top: 70 };

// The groups, each a box naming its concepts, and between two groups one arrow for the
// links that go one way, another for those that leave the direction of the references;
// beside an arrow, each link it stands for.
function drawGroups(
  model: Model,
  { concepts, links }: ReturnType<typeof marked>,
  diff: boolean,
) {
  const boxOf = ({ at: [c, r] }: Model["groups"][number]): Box => ({
    x: margin + big.left + c * (big.w + big.gap.w),
    y: margin + big.top + r * (big.h + big.gap.h),
    w: big.w,
    h: big.h,
  });
  const groupOf = (name: string) => concepts.find((one) => one.concept === name)?.group;
  const between = links.flatMap((link) => {
    const from = groupOf(link.from);
    const to = groupOf(link.to);
    return from === undefined || to === undefined || from === to
      ? []
      : [{ link, from, to }];
  });
  const pairs = [
    ...new Set(between.map(({ from, to }) => [from, to].sort().join(" | "))),
  ];
  const arrows = pairs.flatMap((pair) => {
    const ways = [
      ...new Set(
        between
          .filter(({ from, to }) => [from, to].sort().join(" | ") === pair)
          .map(({ from, to, link }) => `${from}>${to}>${link.exception ? "x" : ""}`),
      ),
    ];
    return ways.map((way, i) => {
      const [fromName = "", toName = "", exception] = way.split(">");
      const from = model.groups.find((one) => one.group === fromName);
      const to = model.groups.find((one) => one.group === toName);
      if (from === undefined || to === undefined) return "";
      const a = boxOf(from);
      const b = boxOf(to);
      const level = from.at[1] === to.at[1];
      if (!level && from.at[0] !== to.at[0])
        throw new MetamodelError(
          `a link joins ${fromName} and ${toName}: the two groups must sit side by side`,
        );
      const off = (i - (ways.length - 1) / 2) * 34;
      const start = level
        ? { x: from.at[0] < to.at[0] ? a.x + a.w : a.x, y: centre(a).y + off }
        : { x: centre(a).x + off, y: from.at[1] < to.at[1] ? a.y + a.h : a.y };
      const end = level
        ? { x: from.at[0] < to.at[0] ? b.x : b.x + b.w, y: start.y }
        : { x: start.x, y: from.at[1] < to.at[1] ? b.y : b.y + b.h };
      const stood = between.filter(
        ({ from: f, to: t, link }) =>
          f === fromName && t === toName && (link.exception ? "x" : "") === exception,
      );
      const first = i < ways.length / 2;
      const lines = stood.map(({ link }, k) => {
        const at = level
          ? {
              x: (start.x + end.x) / 2,
              y: first
                ? start.y - 8 - (stood.length - 1 - k) * 15
                : start.y + 17 + k * 15,
            }
          : {
              x: start.x + (first ? -10 : 10),
              y: (start.y + end.y) / 2 + (k - (stood.length - 1) / 2) * 15 + 4,
            };
        return text(at, `${link.from} ${link.verb} ${link.to}`, {
          size: 11,
          anchor: level ? "middle" : first ? "end" : "start",
          halo: true,
          fill: link.status === "same" ? "#111827" : ink[link.status],
          struck: link.status === "removed",
        });
      });
      return [
        arrow([start, end], {
          from: fromName,
          to: toName,
          verb: "",
          status: "same",
          ...(exception === "x" ? { exception: true as const } : {}),
        }),
        ...lines,
      ].join("");
    });
  });
  const boxes = model.groups.map((group) => {
    const box = boxOf(group);
    const { fill, stroke } = paintOf(group.group);
    const { x } = centre(box);
    const live = concepts.filter(
      (one) => one.group === group.group && one.status !== "removed",
    );
    const names = live
      .filter((one) => one.in === undefined)
      .map((one) => {
        const parts = live.filter((part) => part.in === one.concept);
        return parts.length === 0
          ? one.concept
          : `${one.concept} (${parts.map((part) => part.concept).join(" · ")})`;
      });
    return [
      rect(box, { fill, stroke, width: 2, rx: 10 }),
      text({ x, y: box.y + 28 }, group.group, { size: 17, weight: 700 }),
      text({ x, y: box.y + 48 }, group.says, { size: 12, fill: "#374151" }),
      ...wrapped(names, 52).map((line, i) =>
        text({ x, y: box.y + 72 + i * 16 }, line, { size: 12, italic: true }),
      ),
    ].join("");
  });
  const width = Math.max(...model.groups.map((g) => boxOf(g).x + big.w)) + margin;
  const height = Math.max(...model.groups.map((g) => boxOf(g).y + big.h)) + margin;
  return svg(width, height, [...arrows, ...boxes], diff);
}

// The drawings of a model: "groups", then one named by each group. base: the model they
// are compared with, what changed since coloured.
export function drawingsOf(
  model: Model,
  base?: Model,
): readonly { readonly name: string; readonly svg: string }[] {
  for (const { from, to } of model.links) {
    for (const end of [from, to]) {
      if (!model.concepts.some(({ concept }) => concept === end))
        throw new MetamodelError(`a link names "${end}", which is not a concept`);
    }
  }
  for (const { concept, group, at, in: whole } of model.concepts) {
    if (!model.groups.some((one) => one.group === group))
      throw new MetamodelError(`"${concept}" is of "${group}", which is not a group`);
    if ((at === undefined) === (whole === undefined))
      throw new MetamodelError(`"${concept}" has either a place (at) or a whole (in)`);
    if (
      whole !== undefined &&
      !model.concepts.some(
        (one) => one.concept === whole && one.group === group && one.in === undefined,
      )
    )
      throw new MetamodelError(
        `"${concept}" is in "${whole}", which is not a placed concept of ${group}`,
      );
  }
  const all = marked(model, base);
  const diff = base !== undefined;
  return [
    { name: "groups", svg: drawGroups(model, all, diff) },
    ...model.groups.map(({ group }) => ({
      name: group,
      svg: drawGroup(model, group, all, diff),
    })),
  ];
}
