import { Show } from "solid-js";
import { EmailReveal } from "../../components/EmailReveal";
import { SITE_OWNER } from "../../lib/site";
import styles from "./legal.module.css";

const streetAddress: string = SITE_OWNER.streetAddress;
const postalCodeCity: string = SITE_OWNER.postalCodeCity;

export default function Impressum() {
  return (
    <article class={["container", styles.page]} lang="de">
      <p class={styles.page__kicker}>
        <span class={styles.page__prompt} aria-hidden="true">
          $
        </span>{" "}
        cat impressum.md
      </p>

      <h1 class={styles.page__title}>Impressum</h1>

      <p class={styles.page__intro}>
        Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz) sowie § 18 Abs. 2 MStV
        (Medienstaatsvertrag).
      </p>

      <div class={styles.sections}>
        <section class={styles.section} aria-labelledby="impressum-anbieter">
          <h2 id="impressum-anbieter" class={styles.section__heading}>
            Anbieter und Verantwortlicher
          </h2>
          <address class={styles.section__address}>
            {SITE_OWNER.name}
            <br />
            <Show when={streetAddress !== ""} fallback={<>{SITE_OWNER.locationDe}</>}>
              {streetAddress}
              <br />
              <Show when={postalCodeCity !== ""} fallback={<>{SITE_OWNER.locationDe}</>}>
                {postalCodeCity}
                <br />
                Deutschland
              </Show>
            </Show>
          </address>
        </section>

        <section class={styles.section} aria-labelledby="impressum-kontakt">
          <h2 id="impressum-kontakt" class={styles.section__heading}>
            Kontakt
          </h2>
          <p class={styles.section__body}>
            E-Mail: <EmailReveal locale="de" />
          </p>
        </section>

        <section class={styles.section} aria-labelledby="impressum-redaktion">
          <h2 id="impressum-redaktion" class={styles.section__heading}>
            Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
          </h2>
          <p class={styles.section__body}>
            {SITE_OWNER.name}, {SITE_OWNER.locationDe} (Kontaktdaten wie oben angegeben).
          </p>
        </section>

        <section class={styles.section} aria-labelledby="impressum-hinweise">
          <h2 id="impressum-hinweise" class={styles.section__heading}>
            Hinweise zu Inhalten und externen Links
          </h2>
          <p class={styles.section__body}>
            Diese Website ist eine private, nicht-kommerzielle persönliche Vorstellung und
            Lebenslauf-Übersicht. Die Inhalte wurden mit größter Sorgfalt erstellt. Für die
            Richtigkeit, Vollständigkeit und Aktualität der Inhalte wird dennoch keine Gewähr
            übernommen.
          </p>
          <p class={styles.section__body}>
            Verweise auf externe Websites Dritter (z. B. GitHub oder LinkedIn) unterliegen der
            Verantwortung der jeweiligen Betreiber. Zum Zeitpunkt der Verlinkung waren keine
            Rechtsverstöße erkennbar.
          </p>
        </section>
      </div>
    </article>
  );
}
