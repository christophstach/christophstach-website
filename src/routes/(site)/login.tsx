import { IconBrandGithub } from "../../components/icons";
import { Show } from "solid-js";
import styles from "../../components/login/login.module.css";
import { useSearchParams } from "@solidjs/router";

const ERRORS: Partial<Record<string, string>> = {
  forbidden:
    "This GitHub account doesn't have access to the desk. Sign in with the owner's account.",
  oauth: "GitHub sign-in didn't complete. Try again.",
};

export default function Login() {
  const [search] = useSearchParams();
  const error = () => {
    const code = search.error;

    return typeof code === "string" ? ERRORS[code] : undefined;
  };

  return (
    <div class={["container", styles.login]}>
      <h1 class={styles.login__title}>Sign in to the desk</h1>

      <p class={styles.login__intro}>The desk is private. Sign in with GitHub to open it.</p>

      <Show when={error()}>
        {(message) => (
          <p class={styles.login__error} role="alert">
            {message()}
          </p>
        )}
      </Show>

      {/* A plain link: the OAuth route is a server handler, not an app page. */}
      <a
        href="/auth/github"
        class={["button button--primary", styles.login__action]}
        rel="external"
      >
        <IconBrandGithub size={16} />
        Sign in with GitHub
      </a>
    </div>
  );
}
