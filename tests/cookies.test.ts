import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCookieHeader, readCookie, safeDecodeCookieValue } from "../src/lib/cookies.ts";

await describe("safeDecodeCookieValue", async () => {
  await it("decodes valid percent-encoded values", () => {
    assert.equal(safeDecodeCookieValue("hello%20world"), "hello world");
    assert.equal(safeDecodeCookieValue("a%3Db%26c%3Dd"), "a=b&c=d");
    assert.equal(safeDecodeCookieValue("dark"), "dark");
  });

  await it("falls back to the raw value when percent-encoding is malformed", () => {
    assert.equal(safeDecodeCookieValue("%E0%A4%A"), "%E0%A4%A");
    assert.equal(safeDecodeCookieValue("100%ZZ"), "100%ZZ");
  });
});

await describe("parseCookieHeader", async () => {
  await it("returns an empty object for missing or empty headers", () => {
    assert.deepEqual(parseCookieHeader(undefined), {});
    assert.deepEqual(parseCookieHeader(null), {});
    assert.deepEqual(parseCookieHeader(""), {});
    assert.deepEqual(parseCookieHeader("   ; ; "), {});
  });

  await it("parses multiple cookies, preserves equals signs in values, and trims whitespace", () => {
    assert.deepEqual(
      parseCookieHeader(" color-mode = dark ; token=abc== ; encoded=hello%20berlin "),
      {
        "color-mode": "dark",
        token: "abc==",
        encoded: "hello berlin",
      },
    );
  });

  await it("skips malformed entries and keeps the first occurrence of duplicate keys", () => {
    assert.deepEqual(parseCookieHeader("no-equals; =empty-key; mode=light; mode=dark"), {
      mode: "light",
    });
  });

  await it("ignores prototype-polluting cookie names", () => {
    const parsed = parseCookieHeader(
      "__proto__=polluted; constructor=bad; prototype=bad; valid=ok",
    );

    assert.deepEqual(parsed, { valid: "ok" });
    assert.equal(Object.hasOwn(parsed, "__proto__"), false);
    assert.equal(Object.hasOwn(parsed, "constructor"), false);
    assert.equal(Object.hasOwn(parsed, "prototype"), false);
  });

  await it("keeps raw values when percent-decoding fails", () => {
    assert.deepEqual(parseCookieHeader("broken=%E0%A4%A; good=light"), {
      broken: "%E0%A4%A",
      good: "light",
    });
  });
});

await describe("readCookie", async () => {
  await it("reads an exact cookie match without partial-name collisions", () => {
    const header = "mode=light; color-mode=dark; other=1%202";

    assert.equal(readCookie(header, "color-mode"), "dark");
    assert.equal(readCookie(header, "mode"), "light");
    assert.equal(readCookie(header, "other"), "1 2");
    assert.equal(readCookie(header, "color"), undefined);
  });

  await it("returns undefined for missing headers or absent cookies", () => {
    assert.equal(readCookie(undefined, "color-mode"), undefined);
    assert.equal(readCookie(null, "color-mode"), undefined);
    assert.equal(readCookie("a=1; b=2", "c"), undefined);
  });

  await it("preserves equals signs and falls back on malformed encoding", () => {
    assert.equal(readCookie("sig=abc=def==; bad=%ZZ", "sig"), "abc=def==");
    assert.equal(readCookie("sig=abc=def==; bad=%ZZ", "bad"), "%ZZ");
  });
});
