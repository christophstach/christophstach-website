import styles from "./home.module.css";

interface HomeStatsProps {
  yearsEmployed: number;
  companyCount: number;
  totalSkills: number;
}

/** Career at a glance: years, companies, degrees, technologies. */
export function HomeStats(props: HomeStatsProps) {
  return (
    <section class={[styles.stats, "reveal--scroll"]}>
      <h2 class="section-label">stats --summary</h2>
      <ul class={styles.stats__grid} aria-label="Career at a glance">
        <li class={styles.stat}>
          <span class={styles.stat__value}>
            {props.yearsEmployed}
            <span class={styles.stat__unit}>+</span>
          </span>
          <span class={styles.stat__label}>years_exp</span>
        </li>
        <li class={styles.stat}>
          <span class={styles.stat__value}>{props.companyCount}</span>
          <span class={styles.stat__label}>companies</span>
        </li>
        <li class={styles.stat}>
          <span class={styles.stat__value}>2</span>
          <span class={styles.stat__label}>cs_degrees</span>
        </li>
        <li class={styles.stat}>
          <span class={styles.stat__value}>{props.totalSkills}</span>
          <span class={styles.stat__label}>technologies</span>
        </li>
      </ul>
    </section>
  );
}
