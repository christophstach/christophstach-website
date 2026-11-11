import { DEV_SIGN_IN_PATH, GITHUB_SIGN_IN_PATH } from "../../data/endpoints";
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
        href={GITHUB_SIGN_IN_PATH}
        class={["button button--primary", styles.login__action]}
        rel="external"
      >
        <IconBrandGithub size={16} />
        Sign in with GitHub
      </a>

      <Show when={import.meta.env.DEV}>
        <p class={styles.login__intro}>
          <a href={DEV_SIGN_IN_PATH} class="text-link" rel="external">
            Sign in locally without GitHub
          </a>{" "}
          (dev server only)
        </p>
      </Show>
    </div>
  );
}
