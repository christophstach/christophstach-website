import { getDeskContent, getDeskCvs } from "../../../../../lib/desk/queries";
import { DeskEntryList } from "../../../../../components/desk/DeskEntryList";
import { DeskMeta } from "../../../../../components/desk/DeskMeta";
import type { RouteDefinition } from "@solidjs/router";

export default function EducationList() {
  return (
    <>
      <DeskMeta title="Education · CV · Desk" />
      <DeskEntryList section="education" />
    </>
  );
}

export const route = {
  preload: () => {
    void getDeskContent();
    void getDeskCvs();
  },
} satisfies RouteDefinition;
