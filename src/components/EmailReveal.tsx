import { Show, createSignal, onSettled } from "solid-js";
import { IconCopy, IconMail } from "./icons";
import { resolveOwnerEmail } from "../lib/site";
import styles from "./EmailReveal.module.css";

export type EmailRevealLocale = "de" | "en";

export interface EmailRevealProps {
  locale?: EmailRevealLocale | undefined;
  id?: string | undefined;
}

const COPY = {
  de: {
    reveal: "E-Mail-Adresse anzeigen",
    copy: "Kopieren",
    copied: "Kopiert",
    copyError: "Kopieren fehlgeschlagen. Bitte den E-Mail-Link direkt verwenden.",
    noscript: "JavaScript wird benötigt, um die E-Mail-Adresse anzuzeigen.",
  },
  en: {
    reveal: "Reveal email",
    copy: "Copy",
    copied: "Copied",
    copyError: "Could not copy email. Use the mail link directly.",
    noscript: "JavaScript is required to reveal the email address.",
  },
} as const;

/** Click-to-reveal email control that assembles the address only on client interaction. */
export function EmailReveal(props: EmailRevealProps) {
  const [address, setAddress] = createSignal<string | null>(null);
  const [status, setStatus] = createSignal<"idle" | "copied" | "error">("idle");
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  onSettled(() => () => {
    if (resetTimer !== undefined) {
      clearTimeout(resetTimer);
    }
  });

  const labels = () => COPY[props.locale ?? "en"];

  function reveal() {
    setAddress(resolveOwnerEmail());
  }

  async function copyEmail(email: string) {
    if (resetTimer !== undefined) {
      clearTimeout(resetTimer);
      resetTimer = undefined;
    }

    try {
      await navigator.clipboard.writeText(email);
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
      return labels().copied;
    }

    if (status() === "error") {
      return labels().copyError;
    }

    return "";
  };

  return (
    <span id={props.id} class={styles.reveal}>
      <Show
        when={address()}
        fallback={
          <>
            <button
              type="button"
              class={["button button--outline button--icon", styles.trigger]}
              onClick={reveal}
            >
              <IconMail size={16} />
              {labels().reveal}
            </button>
            <noscript class={styles.noscript}>{labels().noscript}</noscript>
          </>
        }
      >
        {(email) => (
          <>
            <a href={`mailto:${email()}`} class={["text-link", styles.address]}>
              {email()}
            </a>
            <button
              type="button"
              class={["button button--outline button--icon", styles.copy]}
              onClick={() => {
                void copyEmail(email());
              }}
            >
              <IconCopy size={16} />
              {status() === "copied" ? labels().copied : labels().copy}
            </button>
            <span
              class={[styles.status, { [styles["status--error"] ?? ""]: status() === "error" }]}
              role="status"
              aria-live="polite"
            >
              {statusMessage()}
            </span>
          </>
        )}
      </Show>
    </span>
  );
}
