/**
 * Signs out of the desk: the session cookie is cleared on the response. A
 * server function called directly; the caller navigates away afterwards.
 */
export async function signOut(): Promise<void> {
  "use server";

  const desk = await import("../../server/sign-out");

  await desk.signOut();
}
