import { expect, test } from "bun:test";
import {
  type Exchange,
  exchangeSchema,
  type SideEffect,
  sentSchema,
  stepRequestSchema,
} from "../../src/shapes/roles.ts";

const played: Exchange = {
  when: "call",
  as: "a",
  request: { method: "post", path: "/a" },
  response: { status: 200, body: { id: 1 } },
};

const sideEffect: SideEffect = {
  observable: "s",
  request: {
    method: "post",
    path: "/b",
    body: { to: "x", file: { bytes: 1234, sha256: "9f" } },
  },
  response: { status: 200, body: { id: "e1" } },
};

test("an exchange holds the side effects of its step", () => {
  const exchange: Exchange = { ...played, "side-effects": [sideEffect] };
  expect(exchangeSchema.parse(exchange)).toEqual(exchange);
});

test("an exchange with no side effects observed is not one with none", () => {
  const none: Exchange = { ...played, "side-effects": [] };
  expect([exchangeSchema.parse(played), exchangeSchema.parse(none)]).toEqual([
    played,
    none,
  ]);
});

test("a side effect keeps no header", () => {
  const request = { ...sideEffect.request, headers: { h: "v" } };
  const exchange: unknown = { ...played, "side-effects": [{ ...sideEffect, request }] };
  expect(exchangeSchema.safeParse(exchange).success).toBe(false);
});

test("a request carries a form, or a body, not both", () => {
  const form = { to: "x", copy: true };
  expect([
    stepRequestSchema.parse({ method: "post", path: "/a", form }),
    sentSchema.parse({ method: "post", path: "/a", form }),
    stepRequestSchema.safeParse({ method: "post", path: "/a", form, body: {} }).error
      ?.issues[0]?.message,
    sentSchema.safeParse({ method: "post", path: "/a", form, body: {} }).error?.issues[0]
      ?.message,
  ]).toEqual([
    { method: "post", path: "/a", form },
    { method: "post", path: "/a", form },
    "a request carries a body or a form, not both",
    "a request carries a body or a form, not both",
  ]);
});
