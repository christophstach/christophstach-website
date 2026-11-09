/**
 * Signs out of the desk: the session cookie is cleared on the response. A
 * server function called directly; the caller navigates away afterwards.
 */
export async function signOut(): Promise<void> {
  "use server";

  const { getRequestEvent } = await import("@solidjs/web");
  const { signOutCookies } = await import("../../server/session");
  const event = getRequestEvent();

  if (event !== undefined) {
    for (const cookie of await signOutCookies(event.request)) {
      event.response.headers.append("Set-Cookie", cookie);
    }
  }
}
