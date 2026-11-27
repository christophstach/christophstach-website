import {
  IconArrowRight,
  IconBrandGithub,
  IconBrandLinkedin,
  IconCopy,
  IconDownload,
  IconMail,
} from "../icons";
import { Show, createSignal, onSettled } from "solid-js";
import { cvDownloadVisible } from "../../data/cvs";
import styles from "./home.module.css";

export interface HomeContactCtaProps {
  email: string;
  githubUrl: string;
  linkedinUrl: string;
  curriculumHref: string;
  cvPdfHref: string;
}

/** Quiet, terminal-styled recruiter closing CTA with direct contact and CV links. */
export function HomeContactCta(props: HomeContactCtaProps) {
  const [status, setStatus] = createSignal<"idle" | "copied" | "error">("idle");
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  onSettled(() => () => {
    if (resetTimer !== undefined) {
      clearTimeout(resetTimer);
    }
  });

  async function copyEmail() {
    if (resetTimer !== undefined) {
      clearTimeout(resetTimer);
      resetTimer = undefined;
    }

    try {
      await navigator.clipboard.writeText(props.email);
      setStatus("copied");
      resetTimer = setTimeout(() => {
        setStatus("idle");
        resetTimer = undefined;
      }, 2500);
    } catch {
      setStatus("error");
    }
  }

  const statusMessage = () => {
    if (status() === "copied") {
      return "Email copied to clipboard.";
    }

    if (status() === "error") {
      return "Could not copy email. Use the mail link directly.";
    }

    return "";
  };

  return (
    <section class={[styles.contact, "reveal--scroll"]} aria-labelledby="home-contact-heading">
      <h2 id="home-contact-heading" class="section-label">
        contact
      </h2>

      <div class={styles.contact__card}>
        <p class={styles.contact__lead}>
          Full work history, downloadable CV, or direct contact by email.
        </p>

        <div class={styles.contact__mail}>
          <a href={`mailto:${props.email}`} class={["text-link", styles.contact__address]}>
            <IconMail size={16} />
            {props.email}
          </a>

          <button
            type="button"
            class={["button button--outline button--icon", styles.contact__copy]}
            onClick={() => {
              void copyEmail();
            }}
          >
            <IconCopy size={16} />
            {status() === "copied" ? "Copied" : "Copy email"}
          </button>

          <span
            class={[
              styles.contact__status,
              { [styles["contact__status--error"] ?? ""]: status() === "error" },
            ]}
            role="status"
            aria-live="polite"
          >
            {statusMessage()}
          </span>
        </div>

        <div class={styles.contact__actions}>
          <a href={props.curriculumHref} class="button button--outline">
            ./curriculum
            <IconArrowRight size={16} />
          </a>

          <Show when={cvDownloadVisible && props.cvPdfHref !== ""}>
            <a href={props.cvPdfHref} download class="button button--outline">
              <IconDownload size={16} />
              cv.pdf
            </a>
          </Show>

          <a
            href={props.linkedinUrl}
            target="_blank"
            rel="noopener"
            class="button button--outline button--icon"
          >
            <IconBrandLinkedin size={16} />
            LinkedIn
          </a>

          <a
            href={props.githubUrl}
            target="_blank"
            rel="noopener"
            class="button button--outline button--icon"
          >
            <IconBrandGithub size={16} />
            GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
