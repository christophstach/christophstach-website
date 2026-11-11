import { For, createMemo } from "solid-js";
import { getDeskContent, getDeskProjects } from "../../lib/desk/queries";
import { paths } from "../../router";
import styles from "./DeskContentPanel.module.css";

/** How much content the CVs pick from, each count linking to its page. */
export function DeskContentPanel() {
  const content = createMemo(() => getDeskContent());
  const projects = createMemo(() => getDeskProjects());

  const stats = () => {
    const { entries, skills } = content();
    const inSection = (section: string) => entries.filter((entry) => entry.section === section);

    return [
      {
        to: paths.desk.content.experience(),
        label: "experience",
        count: inSection("experience").length,
      },
      {
        to: paths.desk.content.education(),
        label: "education",
        count: inSection("education").length,
      },
      {
        to: paths.desk.content.experience(),
        label: "bullets",
        count: entries.reduce((sum, entry) => sum + entry.bullets.length, 0),
      },
      { to: paths.desk.content.skills(), label: "skill groups", count: skills.length },
      { to: paths.desk.content.projects(), label: "projects", count: projects().length },
    ];
  };

  return (
    <section class="panel" aria-labelledby="panel-content">
      <header class="panel__head">
        <h2 id="panel-content" class="panel__title">
          content
        </h2>
      </header>

      <ul class={styles.stats}>
        <For each={stats()}>
          {(stat) => (
            <li>
              <a href={stat.to} class={styles.stat}>
                <span class={styles.stat__count}>{stat.count}</span>
                <span class={styles.stat__label}>{stat.label}</span>
              </a>
            </li>
          )}
        </For>
      </ul>
    </section>
  );
}
