import { Meta, Title } from "@solidjs/meta";
import { CvDocument } from "../../../../components/CvDocument";
import { createMemo } from "solid-js";
import { getDeskSentCv } from "../../../../lib/desk/applications";
import { useParams } from "@solidjs/router";

// The CV an application sent, as it printed then; printed by
// /api/desk/applications/<id>/sent-cv. Under /desk for the guard, without a
// frame because Chrome prints it as is.
export default function DeskSentCvPrint() {
  const params = useParams<{ id: string }>();
  const cv = createMemo(() => getDeskSentCv(params.id));

  return (
    <>
      {/* Chrome writes the title into the PDF's Title metadata. */}
      <Title>{`CV - ${cv().profile.name}`}</Title>
      <Meta name="robots" content="noindex, nofollow" />
      <main>
        <CvDocument cv={cv()} />
      </main>
    </>
  );
}
