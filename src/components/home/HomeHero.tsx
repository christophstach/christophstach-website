import { IconArrowRight, IconBrandGithub, IconBrandLinkedin, IconDownload } from "../icons";
import { CV_PDF_PATH } from "../../data/endpoints";
import { cvDownloadVisible } from "../../data/cv-variants";
import styles from "./home.module.css";

/** The terminal window with name, role and links, beside the portrait. */
interface HomeHeroProps {
  yearsEmployed: number;
  /** The typed link to /curriculum, from the page (see there why). */
  curriculumHref: string;
}

export function HomeHero(props: HomeHeroProps) {
  return (
    <section class={styles.hero}>
      <div class={styles.hero__grid}>
        <div class={[styles.terminal, "reveal"]}>
          <div class={styles.terminal__bar}>
            <span class={styles.terminal__dots} aria-hidden="true">
              {" "}
              <i />
              <i />
              <i />{" "}
            </span>
            <span class={styles.terminal__path}>christoph@berlin: ~</span>
          </div>

          <div class={styles.terminal__body}>
            <p class={styles.terminal__cmd}>
              <span class={styles.terminal__prompt}>$</span> whoami
            </p>
            <h1 class={styles.hero__title}>Christoph Stach</h1>
            <p class={styles.hero__role}>
              Senior Software Engineer<span class={styles.hero__sep}>//</span>Berlin
              <span class={styles.hero__sep}>//</span>
              {props.yearsEmployed}+ yrs
            </p>

            <p class={styles.terminal__cmd}>
              <span class={styles.terminal__prompt}>$</span> cat about.txt
            </p>
            <p class={styles.hero__text}>
              Senior software engineer with a strong background in <strong>web development</strong>{" "}
              who owned features across the full development cycle, enforced code quality and kept
              software maintainable. Built <strong>LLM agents</strong> and worked with AI coding
              tools. Experience across enterprise, mid-sized and startup environments.
            </p>

            <div class={styles.hero__actions}>
              <a href={props.curriculumHref} class="button button--primary">
                ./curriculum
                <IconArrowRight size={16} />
              </a>

              {cvDownloadVisible && (
                <a href={CV_PDF_PATH} download class="button button--outline">
                  <IconDownload size={16} />
                  cv.pdf
                </a>
              )}

              <a
                href="https://www.linkedin.com/in/christoph-stach-7586b958"
                target="_blank"
                rel="noopener"
                aria-label="LinkedIn profile"
                class="button button--outline button--icon"
              >
                <IconBrandLinkedin size={16} />
              </a>

              <a
                href="https://github.com/christophstach"
                target="_blank"
                rel="noopener"
                aria-label="GitHub profile"
                class="button button--outline button--icon"
              >
                <IconBrandGithub size={16} />
              </a>
            </div>
          </div>
        </div>

        <figure class={[styles.hero__figure, "reveal"]} style={{ "animation-delay": "140ms" }}>
          <img
            src="/images/hero.webp"
            alt="Portrait of Christoph Stach"
            width="272"
            height="272"
            fetchpriority="high"
            class={styles.hero__portrait}
          />
          <figcaption class={styles.hero__figcaption}>portrait.webp, 1 image rendered</figcaption>
        </figure>
      </div>
    </section>
  );
}
