import { getRequestEvent, isServer } from "@solidjs/web";

/** A cookie's value from a Cookie header (or document.cookie), or undefined. */
export function readCookie(header: string | null | undefined, name: string): string | undefined {
  for (const part of header?.split(";") ?? []) {
    const separator = part.indexOf("=");

    if (separator > 0 && part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
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
