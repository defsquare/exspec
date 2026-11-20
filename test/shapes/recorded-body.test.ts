import { expect, test } from "bun:test";
import { recordedBody } from "../../src/shapes/recorded-body.ts";

const bytesOf = (text: string) => new TextEncoder().encode(text);

const longBase64 = "A".repeat(1028);

test("a body is kept as nothing, a value, a text or a digest", () => {
  expect([
    recordedBody({ contentType: "application/json", bytes: new Uint8Array() }),
    recordedBody({
      contentType: "application/json; charset=utf-8",
      bytes: bytesOf(JSON.stringify({ to: "x", file: longBase64, short: "AAAA" })),
    }),
    recordedBody({ contentType: "text/html", bytes: bytesOf("<p>") }),
    recordedBody({ contentType: null, bytes: bytesOf("not json") }),
    recordedBody({
      contentType: "application/pdf",
      bytes: new Uint8Array([37, 80, 68, 70]),
    }),
  ]).toEqual([
    undefined,
    {
      to: "x",
      file: {
        bytes: 771,
        sha256: "ac01bc7504ce2d26c19f5870a9f236ee22f061091a2b2c58a9c67da6cbbb0024",
      },
      short: "AAAA",
    },
    "<p>",
    "not json",
    {
      bytes: 4,
      sha256: "315d429b7714cedb6ad04ac31240145257692630457f3c88253c5beceac76027",
    },
  ]);
});

test("a prefixed base64 string and a text too long to read are kept as digests", () => {
  const file = {
    bytes: 771,
    sha256: "ac01bc7504ce2d26c19f5870a9f236ee22f061091a2b2c58a9c67da6cbbb0024",
  };
  expect(
    recordedBody({
      contentType: "application/json",
      bytes: bytesOf(
        JSON.stringify({
          a: `base64:${longBase64}`,
          b: `data:font/ttf;base64,${longBase64}`,
          c: "é".repeat(16385),
          d: "base64:AAAA",
        }),
      ),
    }),
  ).toEqual({
    a: file,
    b: file,
    c: {
      bytes: 32770,
      sha256: new Bun.CryptoHasher("sha256").update("é".repeat(16385)).digest("hex"),
    },
    d: "base64:AAAA",
  });
});

test("a form-encoded body is kept as its text", () => {
  expect(
    recordedBody({
      contentType: "application/x-www-form-urlencoded",
      bytes: bytesOf("to=x+y&n=1"),
    }),
  ).toEqual("to=x+y&n=1");
});
