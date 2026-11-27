import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SITE_OWNER, SITE_URL, normalizePathname, resolveOwnerEmail } from "../src/lib/site.ts";

await describe("site constants", async () => {
  await it("defines a canonical HTTPS SITE_URL without a trailing slash", () => {
    const parsed = new URL(SITE_URL);

    assert.equal(parsed.protocol, "https:");
    assert.equal(SITE_URL.endsWith("/"), false);
  });

  await it("defines non-empty SITE_OWNER metadata with valid links and no plaintext email", () => {
    assert.ok(SITE_OWNER.name.length > 0);
    assert.ok(SITE_OWNER.location.length > 0);
    assert.ok(SITE_OWNER.locationDe.length > 0);
    assert.equal("email" in SITE_OWNER, false);
    assert.equal(new URL(SITE_OWNER.githubUrl).protocol, "https:");
    assert.equal(new URL(SITE_OWNER.linkedinUrl).protocol, "https:");
  });

  await it("resolves the expected owner email address on demand", () => {
    const email = resolveOwnerEmail();
    const parts = email.split("@");

    assert.match(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/u);
    assert.equal(parts.length, 2);
    assert.equal(parts[0], ["christoph", "stach"].join("."));
    assert.equal(parts[1], ["gmail", "com"].join("."));
    assert.equal(email.length, 25);
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
