import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const VIRTUAL_STUBS = new Set(["server-only", "virtual:solid-env/server"]);

// Allows Node's native TypeScript runner to import server modules that rely on
// Vite's virtual `server-only` / env modules and extensionless relative imports.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (VIRTUAL_STUBS.has(specifier)) {
      return { shortCircuit: true, url: `virtual-test-stub:${specifier}` };
    }

    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL?.startsWith("file:") === true &&
      !/\.[a-z0-9]+$/iu.test(specifier)
    ) {
      const parentUrl = new URL(context.parentURL);
      const fileCandidate = new URL(`${specifier}.ts`, parentUrl);

      if (existsSync(fileURLToPath(fileCandidate))) {
        return { shortCircuit: true, url: pathToFileURL(fileURLToPath(fileCandidate)).href };
      }

      const indexCandidate = new URL(`${specifier}/index.ts`, parentUrl);

      if (existsSync(fileURLToPath(indexCandidate))) {
        return { shortCircuit: true, url: pathToFileURL(fileURLToPath(indexCandidate)).href };
      }
    }

    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === "virtual-test-stub:server-only") {
      return { format: "module", shortCircuit: true, source: "export {};" };
    }

    if (url === "virtual-test-stub:virtual:solid-env/server") {
      return { format: "module", shortCircuit: true, source: "export const env = {};" };
    }

    return nextLoad(url, context);
  },
});

const { assertSafePublicUrl, isDisallowedHost } = await import("../src/server/collectors/url.ts");

await describe("isDisallowedHost", async () => {
  await it("rejects empty hosts and reserved local/internal hostnames", () => {
    for (const host of [
      "",
      "   ",
      "localhost",
      "LOCALHOST.",
      "api.localhost",
      "local",
      "printer.local",
      "internal",
      "metadata.google.internal",
      "home.arpa",
      "router.home.arpa",
    ]) {
      assert.equal(isDisallowedHost(host), true, `Expected ${host} to be disallowed`);
    }
  });

  await it("rejects private, loopback, link-local, metadata, CGNAT, and shorthand IPv4 addresses", () => {
    for (const ip of [
      "0.0.0.0",
      "10.0.0.1",
      "100.64.0.1",
      "100.127.255.254",
      "127.0.0.1",
      "127.255.255.254",
      "169.254.169.254",
      "172.16.0.1",
      "172.31.255.255",
      "192.0.2.1",
      "192.168.1.1",
      "198.18.0.1",
      "198.51.100.1",
      "203.0.113.1",
      "224.0.0.1",
      "255.255.255.255",
      "127.1",
      "2130706433",
      "0x7f000001",
    ]) {
      assert.equal(isDisallowedHost(ip), true, `Expected IPv4 ${ip} to be disallowed`);
    }
  });

  await it("rejects loopback, link-local, unique-local, multicast, and IPv4-mapped private IPv6 addresses", () => {
    for (const ip of [
      "::",
      "::1",
      "[::1]",
      "::ffff:127.0.0.1",
      "[::ffff:169.254.169.254]",
      "::ffff:10.0.0.1",
      "64:ff9b::127.0.0.1",
      "fc00::1",
      "fd12:3456:789a::1",
      "fe80::1",
      "fe80::1%eth0",
      "ff02::1",
      "2001:db8::1",
    ]) {
      assert.equal(isDisallowedHost(ip), true, `Expected IPv6 ${ip} to be disallowed`);
    }
  });

  await it("allows public domain names and public IPv4/IPv6 addresses", () => {
    for (const host of [
      "christophstach.de",
      "careers.mercedes-benz.com",
      "1.1.1.1",
      "8.8.8.8",
      "172.15.255.255",
      "172.32.0.1",
      "100.63.255.255",
      "100.128.0.1",
      "2606:4700:4700::1111",
      "::ffff:1.1.1.1",
    ]) {
      assert.equal(isDisallowedHost(host), false, `Expected ${host} to be allowed`);
    }
  });
});

await describe("assertSafePublicUrl", async () => {
  await it("accepts public http and https URLs and trims surrounding whitespace", () => {
    const httpsUrl = assertSafePublicUrl("  https://example.com/jobs/123?ref=abc  ");
    const httpUrl = assertSafePublicUrl("http://boards.greenhouse.io/acme/jobs/1");

    assert.equal(httpsUrl.href, "https://example.com/jobs/123?ref=abc");
    assert.equal(httpUrl.href, "http://boards.greenhouse.io/acme/jobs/1");
  });

  await it("rejects invalid URLs, non-http(s) protocols, embedded credentials, and internal hosts", () => {
    const withUserPass = new URL("https://example.com/job");
    withUserPass.username = "alice";
    withUserPass.password = "example";

    const withUserOnly = new URL("https://example.com/job");
    withUserOnly.username = "alice";

    for (const badUrl of [
      "not-a-url",
      "file:///etc/passwd",
      "ftp://example.com/file",
      "javascript:alert(1)",
      "data:text/html,<h1>hi</h1>",
      withUserPass.href,
      withUserOnly.href,
      "http://localhost:3000/desk",
      "http://127.0.0.1:8080/admin",
      "http://169.254.169.254/latest/meta-data/",
      "http://[::1]/",
      "https://service.internal/secret",
      "http://10.0.0.5/internal",
    ]) {
      assert.throws(() => assertSafePublicUrl(badUrl), { name: "BadRequestError" }, badUrl);
    }
  });
});
