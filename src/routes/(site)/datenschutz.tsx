import { Show } from "solid-js";
import { SITE_OWNER } from "../../lib/site";
import styles from "./legal.module.css";

const streetAddress: string = SITE_OWNER.streetAddress;
const postalCodeCity: string = SITE_OWNER.postalCodeCity;

export default function Datenschutz() {
  return (
    <article class={["container", styles.page]} lang="de">
      <p class={styles.page__kicker}>
        <span class={styles.page__prompt} aria-hidden="true">
          $
        </span>{" "}
        cat datenschutz.md
      </p>

      <h1 class={styles.page__title}>Datenschutzerklärung</h1>

      <p class={styles.page__intro}>
        Informationen zur Verarbeitung personenbezogener Daten gemäß Art. 13 DSGVO und zum Einsatz
        von Cookies gemäß § 25 TDDDG beim Besuch dieser Website.
      </p>

      <div class={styles.sections}>
        <section class={styles.section} aria-labelledby="datenschutz-verantwortlicher">
          <h2 id="datenschutz-verantwortlicher" class={styles.section__heading}>
            1. Verantwortlicher
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
            <br />
            E-Mail:{" "}
            <a href={`mailto:${SITE_OWNER.email}`} class="text-link">
              {SITE_OWNER.email}
            </a>
          </address>
        </section>

        <section class={styles.section} aria-labelledby="datenschutz-hosting">
          <h2 id="datenschutz-hosting" class={styles.section__heading}>
            2. Hosting und Server-Logfiles (Vercel)
          </h2>
          <p class={styles.section__body}>
            Diese Website wird bei Vercel Inc. (440 N Barranca Ave #4133, Covina, CA 91723, USA)
            über dessen globales Edge-Netzwerk gehostet. Beim Aufruf der Seiten verarbeitet der
            Hosting-Anbieter automatisch technisch erforderliche Zugriffsdaten in Server-Logfiles,
            insbesondere IP-Adresse, Datum und Uhrzeit des Abrufs, angefragte URL, HTTP-Statuscode,
            übertragene Datenmenge, Referrer-URL sowie Browser- und Betriebssysteminformationen.
          </p>
          <p class={styles.section__body}>
            Die Verarbeitung erfolgt zur sicheren und stabilen Bereitstellung der Website sowie zur
            Abwehr von Missbrauch auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
            Interesse). Soweit dabei Daten in die USA übermittelt werden, stützt sich Vercel auf das
            EU-US Data Privacy Framework sowie auf EU-Standardvertragsklauseln (SCC).
          </p>
        </section>

        <section class={styles.section} aria-labelledby="datenschutz-datenbank">
          <h2 id="datenschutz-datenbank" class={styles.section__heading}>
            3. Öffentliche Lebenslauf-Daten und Edge-Caching (Neon Postgres)
          </h2>
          <p class={styles.section__body}>
            Die öffentlichen Inhalte dieser Website (berufliche Stationen, Ausbildung, Kenntnisse
            und Projekte) werden in einer PostgreSQL-Datenbank bei Neon Inc. gespeichert und bei
            Bedarf zur Auslieferung gelesen sowie über Incremental Static Regeneration (ISR) am Edge
            zwischengespeichert. Beim Besuch der öffentlichen Seiten werden keinerlei
            personenbezogene Daten von Besucherinnen und Besuchern in dieser Datenbank gespeichert.
          </p>
        </section>

        <section class={styles.section} aria-labelledby="datenschutz-cookies">
          <h2 id="datenschutz-cookies" class={styles.section__heading}>
            4. Cookies und technisch erforderliche Speicherung (§ 25 TDDDG)
          </h2>
          <p class={styles.section__body}>
            Diese Website setzt ausschließlich technisch erforderliche Cookies im Sinne von § 25
            Abs. 2 Nr. 2 TDDDG ein. Es werden keine Tracking-, Analyse- oder Marketing-Cookies
            verwendet.
          </p>
          <ul class={styles.section__list}>
            <li>
              <code class={styles.section__code}>color-mode</code>: Speichert auf Ihren
              ausdrücklichen Wunsch hin die gewählte Farbdarstellung (
              <code class={styles.section__code}>system</code>,{" "}
              <code class={styles.section__code}>light</code> oder{" "}
              <code class={styles.section__code}>dark</code>), wenn Sie den Theme-Umschalter
              betätigen (Laufzeit: 1 Jahr, <code class={styles.section__code}>SameSite=Lax</code>).
              Rechtsgrundlage ist § 25 Abs. 2 Nr. 2 TDDDG bzw. Art. 6 Abs. 1 lit. f DSGVO.
            </li>
            <li>
              <code class={styles.section__code}>oauth-state</code> und{" "}
              <code class={styles.section__code}>desk-session</code>: Ausschließlich für die
              Anmeldung des Website-Betreibers am geschützten Verwaltungsbereich (
              <code class={styles.section__code}>/desk</code>) über GitHub OAuth. Reguläre
              Besucherinnen und Besucher dieser Website erhalten diese Cookies nicht; eine
              Verbindung zu GitHub entsteht erst bei aktivem Aufruf der Betreiber-Anmeldung.
            </li>
          </ul>
        </section>

        <section class={styles.section} aria-labelledby="datenschutz-schriften">
          <h2 id="datenschutz-schriften" class={styles.section__heading}>
            5. Lokal eingebundene Schriftarten (Self-Hosting)
          </h2>
          <p class={styles.section__body}>
            Die eingesetzten Schriftarten (IBM Plex Sans und JetBrains Mono) werden lokal über
            Fontsource als Bestandteil dieser Website ausgeliefert. Beim Laden der Schriftarten wird
            keine Verbindung zu externen Servern (wie Google Fonts) hergestellt.
          </p>
        </section>

        <section class={styles.section} aria-labelledby="datenschutz-tracking">
          <h2 id="datenschutz-tracking" class={styles.section__heading}>
            6. Kein Tracking, keine Analyse und externe Links
          </h2>
          <p class={styles.section__body}>
            Diese Website verzichtet vollständig auf Web-Analyse-Dienste, Tracking-Pixel,
            Werbenetzwerke und eingebettete Social-Media-Plugins. Verweise auf externe Profile (z.
            B. GitHub oder LinkedIn) sind einfache Hyperlinks; Daten an diese Anbieter werden erst
            übertragen, wenn Sie den jeweiligen Link aktiv anklicken.
          </p>
        </section>

        <section class={styles.section} aria-labelledby="datenschutz-kontakt">
          <h2 id="datenschutz-kontakt" class={styles.section__heading}>
            7. Kontaktaufnahme per E-Mail
          </h2>
          <p class={styles.section__body}>
            Wenn Sie mir per E-Mail schreiben, werden die von Ihnen übermittelten Angaben (z. B.
            E-Mail-Adresse, Name und Nachrichteninhalt) ausschließlich zur Bearbeitung Ihrer Anfrage
            verarbeitet (Art. 6 Abs. 1 lit. b DSGVO bei vorvertraglichen Anfragen bzw. Art. 6 Abs. 1
            lit. f DSGVO). Die Daten werden gelöscht, sobald sie für den Zweck nicht mehr
            erforderlich sind und keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
          </p>
        </section>

        <section class={styles.section} aria-labelledby="datenschutz-rechte">
          <h2 id="datenschutz-rechte" class={styles.section__heading}>
            8. Ihre Rechte als betroffene Person
          </h2>
          <p class={styles.section__body}>
            Sie haben im Rahmen der DSGVO jederzeit das Recht auf Auskunft über die Sie betreffenden
            personenbezogenen Daten (Art. 15 DSGVO), auf Berichtigung unrichtiger Daten (Art. 16
            DSGVO), auf Löschung (Art. 17 DSGVO), auf Einschränkung der Verarbeitung (Art. 18
            DSGVO), auf Datenübertragbarkeit (Art. 20 DSGVO) sowie auf Widerspruch gegen die
            Verarbeitung aus Gründen, die sich aus Ihrer besonderen Situation ergeben (Art. 21
            DSGVO).
          </p>
          <p class={styles.section__body}>
            Darüber hinaus steht Ihnen ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde zu
            (Art. 77 DSGVO), insbesondere bei der für Berlin zuständigen Behörde:
          </p>
          <address class={styles.section__address}>
            Berliner Beauftragte für Datenschutz und Informationsfreiheit
            <br />
            Alt-Moabit 59–61
            <br />
            10555 Berlin
            <br />
            <a
              href="https://www.datenschutz-berlin.de"
              target="_blank"
              rel="noopener"
              class="text-link"
            >
              https://www.datenschutz-berlin.de
            </a>
          </address>
        </section>
      </div>
    </article>
  );
}
