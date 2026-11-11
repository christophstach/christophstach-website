import { getDeskContent, getDeskCvs } from "../../../../../lib/desk/queries";
import { DeskEntryEditor } from "../../../../../components/desk/DeskEntryEditor";
import type { RouteDefinition } from "@solidjs/router";
import { useParams } from "@solidjs/router";

export default function ExperienceEntry() {
  const params = useParams<{ id: string }>();

  return <DeskEntryEditor section="experience" id={params.id} />;
}

export const route = {
  preload: () => {
    void getDeskContent();
    void getDeskCvs();
  },
} satisfies RouteDefinition;
