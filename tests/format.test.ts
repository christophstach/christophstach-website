import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatDay,
  formatMonth,
  formatRelative,
  monthsBetween,
  stripScheme,
  textParts,
} from "../src/lib/format.ts";

await describe("formatMonth", async () => {
  await it("formats ISO YYYY-MM strings into English short month and year", () => {
    assert.equal(formatMonth("2024-03"), "Mar 2024");
    assert.equal(formatMonth("2026-11"), "Nov 2026");
    assert.equal(formatMonth("2020-01"), "Jan 2020");
  });
});

await describe("formatDay", async () => {
  await it("formats ISO dates in English and German locales", () => {
    assert.equal(formatDay("2026-11-02", "en"), "2 November 2026");
    assert.equal(formatDay("2026-11-02", "de"), "2. November 2026");
  });
});

await describe("stripScheme", async () => {
  await it("removes http:// and https:// prefixes only", () => {
    assert.equal(
      stripScheme("https://christophstach.de/curriculum"),
      "christophstach.de/curriculum",
    );
    assert.equal(stripScheme("http://example.com"), "example.com");
    assert.equal(stripScheme("christophstach.de"), "christophstach.de");
    assert.equal(
      stripScheme("mailto:christoph.stach@gmail.com"),
      "mailto:christoph.stach@gmail.com",
    );
  });
});

await describe("textParts", async () => {
  await it("handles empty and plain text without links", () => {
    assert.deepEqual(textParts(""), []);
    assert.deepEqual(textParts("Built LLM agents in Python."), [
      { text: "Built LLM agents in Python." },
    ]);
  });

  await it("splits text around http(s) markdown links while preserving order", () => {
    assert.deepEqual(
      textParts("See [GitHub](https://github.com/christophstach) and [Site](http://example.com)."),
      [
        { text: "See " },
        { text: "GitHub", href: "https://github.com/christophstach" },
        { text: " and " },
        { text: "Site", href: "http://example.com" },
        { text: "." },
      ],
    );
  });

  await it("does not turn non-http(s) markdown syntax into links", () => {
    const input = "Ignore [script](javascript:alert(1)) and [mail](mailto:test@example.com)";

    assert.deepEqual(textParts(input), [{ text: input }]);
  });
});

await describe("monthsBetween", async () => {
  await it("computes whole months between two ISO month strings", () => {
    assert.equal(monthsBetween("2020-01", "2022-01"), 24);
    assert.equal(monthsBetween("2023-06", "2024-02"), 8);
    assert.equal(monthsBetween("2025-05", "2025-05"), 0);
  });

  await it("treats an omitted or empty end month as the current month", () => {
    const now = new Date();
    const currentIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    assert.equal(monthsBetween(currentIso), 0);
    assert.equal(monthsBetween(currentIso, ""), 0);
  });
});

await describe("formatRelative", async () => {
  await it("formats timestamps relative to a fixed reference time", () => {
    const now = Date.UTC(2026, 10, 27, 12, 0, 0);

    assert.equal(formatRelative(new Date(now - 30_000).toISOString(), now), "just now");
    assert.equal(formatRelative(new Date(now - 5 * 60_000).toISOString(), now), "5 minutes ago");
    assert.equal(formatRelative(new Date(now - 2 * 3_600_000).toISOString(), now), "2 hours ago");
    assert.equal(formatRelative(new Date(now - 86_400_000).toISOString(), now), "yesterday");
    assert.equal(formatRelative(new Date(now - 3 * 86_400_000).toISOString(), now), "3 days ago");
  });
});
