import { defineNuxtRouteMiddleware, navigateTo } from "nuxt/app";
import { useUserSession } from "#imports";

// Runs during SSR too, so the desk is never rendered for an anonymous request.
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession();

  if (to.path.startsWith("/desk") && !loggedIn.value) {
    return navigateTo("/login");
  }

  if (to.path === "/login" && loggedIn.value) {
    return navigateTo("/desk");
  }
});
