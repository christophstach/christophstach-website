import { getDeskContent, getDeskVariants } from "../../../../../lib/desk/queries";
import { DeskEntryEditor } from "../../../../../components/desk/DeskEntryEditor";
import type { RouteDefinition } from "@solidjs/router";
import { useParams } from "@solidjs/router";

export default function EducationEntry() {
  const params = useParams<{ id: string }>();

  return <DeskEntryEditor section="education" id={params.id} />;
}

export const route = {
  preload: () => {
    void getDeskContent();
    void getDeskVariants();
  },
} satisfies RouteDefinition;
