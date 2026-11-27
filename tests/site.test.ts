import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SITE_OWNER, SITE_URL, normalizePathname } from "../src/lib/site.ts";

await describe("site constants", async () => {
  await it("defines a canonical HTTPS SITE_URL without a trailing slash", () => {
    const parsed = new URL(SITE_URL);

    assert.equal(parsed.protocol, "https:");
    assert.equal(SITE_URL.endsWith("/"), false);
  });

  await it("defines non-empty SITE_OWNER metadata with valid links and email", () => {
    assert.ok(SITE_OWNER.name.length > 0);
    assert.ok(SITE_OWNER.location.length > 0);
    assert.ok(SITE_OWNER.locationDe.length > 0);
    assert.match(SITE_OWNER.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/u);
    assert.equal(new URL(SITE_OWNER.githubUrl).protocol, "https:");
    assert.equal(new URL(SITE_OWNER.linkedinUrl).protocol, "https:");
  });
});

await describe("normalizePathname", async () => {
  await it("keeps root and collapses empty or slash-only inputs to /", () => {
    assert.equal(normalizePathname("/"), "/");
    assert.equal(normalizePathname(""), "/");
    assert.equal(normalizePathname("   "), "/");
    assert.equal(normalizePathname("///"), "/");
  });

  await it("ensures a leading slash and strips trailing slashes", () => {
    assert.equal(normalizePathname("curriculum"), "/curriculum");
    assert.equal(normalizePathname("/curriculum/"), "/curriculum");
    assert.equal(normalizePathname("/impressum///"), "/impressum");
    assert.equal(normalizePathname("  /datenschutz/  "), "/datenschutz");
  });

  await it("preserves nested path segments", () => {
    assert.equal(normalizePathname("/desk/cvs/primary/"), "/desk/cvs/primary");
    assert.equal(normalizePathname("desk/postings"), "/desk/postings");
  });
});
