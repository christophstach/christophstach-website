import { getRequestEvent, isServer } from "@solidjs/web";

/** Decodes a percent-encoded cookie value, falling back to the raw value if malformed. */
export function safeDecodeCookieValue(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Parses a Cookie header (or document.cookie) into a name→value map. */
export function parseCookieHeader(header: string | null | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};

  for (const part of header?.split(";") ?? []) {
    const separator = part.indexOf("=");

    if (separator <= 0) {
      continue;
    }

    const key = part.slice(0, separator).trim();

    if (
      key === "" ||
      key === "__proto__" ||
      key === "constructor" ||
      key === "prototype" ||
      Object.hasOwn(cookies, key)
    ) {
      continue;
    }

    cookies[key] = safeDecodeCookieValue(part.slice(separator + 1).trim());
  }

  return cookies;
}

/** A cookie's value from a Cookie header (or document.cookie), or undefined. */
export function readCookie(header: string | null | undefined, name: string): string | undefined {
  for (const part of header?.split(";") ?? []) {
    const separator = part.indexOf("=");

    if (separator > 0 && part.slice(0, separator).trim() === name) {
      return safeDecodeCookieValue(part.slice(separator + 1).trim());
    }
  }

  return undefined;
}

/**
 * A cookie of the current page: the request's on the server, the document's
 * in the browser, so both sides of a hydration read the same value.
 */
export function pageCookie(name: string): string | undefined {
  const header = isServer ? getRequestEvent()?.request.headers.get("cookie") : document.cookie;

  return readCookie(header, name);
}
