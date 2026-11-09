import { getDeskContent, getDeskVariants } from "../../../../../lib/desk/queries";
import { DeskEntryList } from "../../../../../components/desk/DeskEntryList";
import { DeskMeta } from "../../../../../components/desk/DeskMeta";
import type { RouteDefinition } from "@solidjs/router";

export default function ExperienceList() {
  return (
    <>
      <DeskMeta title="Experience · CV · Desk" />
      <DeskEntryList section="experience" />
    </>
  );
}

export const route = {
  preload: () => {
    void getDeskContent();
    void getDeskVariants();
  },
} satisfies RouteDefinition;
