import { CvText } from "../CvText";
import { For } from "solid-js";
import type { SkillGroup } from "../../data/cv";
import styles from "./home.module.css";

/** Every skill group as a directory tree. */
export function HomeStack(props: { skills: SkillGroup[] }) {
  return (
    <section class={[styles.stack, "reveal--scroll"]}>
      <h2 class="section-label">stack --tree</h2>

      <p class={styles.tree__root} aria-hidden="true">
        stack/
      </p>
      <ul class={styles.tree}>
        <For each={props.skills}>
          {(group) => (
            <li class={styles.tree__group}>
              <span class={styles.tree__label}>{group.label}/</span>
              <ul class={styles.tree__items} aria-label={`${group.label} technologies`}>
                <For each={group.items}>
                  {(item) => (
                    <li class={["chip", styles.tree__item]}>
                      <CvText text={item} />
                    </li>
                  )}
                </For>
              </ul>
            </li>
          )}
        </For>
      </ul>
    </section>
  );
}
