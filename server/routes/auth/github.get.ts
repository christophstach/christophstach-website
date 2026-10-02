import { sendRedirect } from "h3";
import { useRuntimeConfig } from "nitropack/runtime";

// defineOAuthGitHubEventHandler and setUserSession are Nitro auto-imports:
// nuxt-auth-utils exposes no import path, and an explicit `#imports` import
// breaks typecheck because typed $fetch also checks this file in the app
// program, where `#imports` means the app's imports.
export default defineOAuthGitHubEventHandler({
  async onSuccess(event, { user }) {
    // The desk is single-user: only the configured GitHub account gets a session.
    if (user.id !== Number(useRuntimeConfig(event).deskGithubId)) {
      return sendRedirect(event, "/login?error=forbidden");
    }

    await setUserSession(event, {
      user: { githubId: user.id, login: user.login, avatarUrl: user.avatar_url },
    });

    return sendRedirect(event, "/desk");
  },

  onError(event) {
    return sendRedirect(event, "/login?error=oauth");
  },
});
