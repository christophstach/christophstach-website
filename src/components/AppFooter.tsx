import { IconBrandGithub, IconBrandLinkedin } from "./icons";
import styles from "./AppFooter.module.css";

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer class={styles.footer}>
      <div class={["container", styles.inner]}>
        <small>© 2022–{year} Christoph Stach</small>

        <div class={styles.social}>
          <a
            href="https://www.linkedin.com/in/christoph-stach-7586b958"
            target="_blank"
            rel="noopener"
            aria-label="LinkedIn profile"
            class="icon-button"
          >
            <IconBrandLinkedin size={20} />
          </a>
          <a
            href="https://github.com/christophstach"
            target="_blank"
            rel="noopener"
            aria-label="GitHub profile"
            class="icon-button"
          >
            <IconBrandGithub size={20} />
          </a>
        </div>
      </div>
    </footer>
  );
}
