import { IconLogout } from "../icons";
import { ThemeToggle } from "../ThemeToggle";
import { createMemo } from "solid-js";
import { getColorMode } from "../../lib/color-mode";
import { getDeskUser } from "../../lib/desk/queries";
import { paths } from "../../router";
import { signOut } from "../../lib/desk/session";
import styles from "./DeskLayout.module.css";
import { useNavigate } from "@solidjs/router";

/** The foot of the sidebar: who is signed in, sign-out and the theme toggle. */
export function DeskSession(props: { collapsed: boolean }) {
  const navigate = useNavigate();
  const user = createMemo(() => getDeskUser());

  async function handleSignOut() {
    await signOut();
    navigate(paths());
  }

  return (
    <div class={styles.desk__session}>
      <p
        class={[styles.desk__item, styles.desk__user]}
        title={props.collapsed ? user().login : undefined}
      >
        <img src={user().avatarUrl} alt="" width="20" height="20" class={styles.desk__avatar} />
        <span class={styles.desk__label}>{user().login}</span>
      </p>

      <div class={styles.desk__actions}>
        <button
          type="button"
          class={[styles.desk__item, styles.desk__logout]}
          title={props.collapsed ? "Sign out" : undefined}
          onClick={() => {
            void handleSignOut();
          }}
        >
          <IconLogout size={18} class={styles.desk__icon} />
          <span class={styles.desk__label}>Sign out</span>
        </button>

        <ThemeToggle initial={getColorMode()} />
      </div>
    </div>
  );
}
