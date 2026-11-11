import { For } from "solid-js";
import { getDeskContent, getDeskProjects } from "../../../../lib/desk/queries";
import { DeskContentPanel } from "../../../../components/desk/DeskContentPanel";
import { DeskMeta } from "../../../../components/desk/DeskMeta";
import type { RouteDefinition } from "@solidjs/router";
import { deskContentLinks } from "../../../../data/desk";

export const route = {
  preload: () => {
    void getDeskContent();
    void getDeskProjects();
  },
} satisfies RouteDefinition;

export default function DeskContent() {
  return (
    <div class="desk-page">
      <DeskMeta title="Content · Desk" />
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">~/desk/content</p>
          <h1 class="desk-head__title">Content</h1>
          <p class="desk-head__sub">
            What every CV picks from. A change here reaches every CV that prints it.
          </p>
        </div>
      </header>

      <div class="panels">
        <DeskContentPanel />

        <section class="panel" aria-labelledby="panel-pages">
          <header class="panel__head">
            <h2 id="panel-pages" class="panel__title">
              pages
            </h2>
          </header>
          <ul class="panel__rows">
            <For each={deskContentLinks}>
              {(link) => (
                <li>
                  <a href={link.to} class="panel-row">
                    <span class="panel-row__label">{link.label}</span>
                    <span class="panel-row__meta">{link.hint}</span>
                  </a>
                </li>
              )}
            </For>
          </ul>
        </section>
      </div>
    </div>
  );
}
