import { IconBrandGithub, IconBrandLinkedin, IconMail } from "./icons";
import { SITE_OWNER } from "../lib/site";
import { paths } from "../router";
import styles from "./AppFooter.module.css";

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer class={styles.footer}>
      <div class={["container", styles.inner]}>
        <div class={styles.meta}>
          <small>
            © 2022–{year} {SITE_OWNER.name}
          </small>

          <nav class={styles.legal} aria-label="Legal">
            <a href={paths.impressum()} class={styles.legal__link}>
              Impressum
            </a>
            <a href={paths.datenschutz()} class={styles.legal__link}>
              Datenschutz
            </a>
          </nav>
        </div>

        <div class={styles.social}>
          <a
            href={`mailto:${SITE_OWNER.email}`}
            aria-label={`Email ${SITE_OWNER.name}`}
            class="icon-button"
          >
            <IconMail size={20} />
          </a>
          <a
            href={SITE_OWNER.linkedinUrl}
            target="_blank"
            rel="noopener"
            aria-label="LinkedIn profile"
            class="icon-button"
          >
            <IconBrandLinkedin size={20} />
          </a>
          <a
            href={SITE_OWNER.githubUrl}
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
