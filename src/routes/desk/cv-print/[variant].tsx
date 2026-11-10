import { Meta, Title } from "@solidjs/meta";
import { useParams, useSearchParams } from "@solidjs/router";
import { CvDocument } from "../../../components/CvDocument";
import type { CvLayout } from "../../../data/cv-print-layout";
import { createMemo } from "solid-js";
import { cvLayoutSchema } from "../../../data/cv-print-layout";
import { getDeskVariantPrint } from "../../../lib/desk/variants";
import { safeParse } from "zod/mini";

// A private CV variant, printed by /api/desk/cv/<variant> and by the desk's
// page check. It lives under /desk so the guard keeps it behind the GitHub
// session, and has no frame because Chrome prints it as is. Layout steps in
// the query are a trial of unsaved steps.
/** The query's argument; JSON can't carry an undefined field, so it's left out. */
function withTrial(id: string, trial: CvLayout | undefined) {
  return trial === undefined ? { id } : { id, trial };
}

export default function DeskCvPrint() {
  const params = useParams<{ variant: string }>();
  const [search] = useSearchParams();
  const trial = () => {
    const parsed = safeParse(cvLayoutSchema, {
      spacing: search.spacing,
      textSize: search.textSize,
      margin: search.margin,
    });

    return parsed.success ? parsed.data : undefined;
  };
  const cv = createMemo(() => getDeskVariantPrint(withTrial(params.variant, trial())));

  return (
    <>
      {/* Chrome writes the title into the PDF's Title metadata. */}
      <Title>CV - Christoph Stach</Title>
      <Meta name="robots" content="noindex, nofollow" />
      <main>
        <CvDocument cv={cv()} />
      </main>
    </>
  );
}
