import { COVER_LETTER_MARGIN_MM, COVER_LETTER_WORDING } from "../../../data/cover-letter-wording";
import { Meta, Style, Title } from "@solidjs/meta";
import { CoverLetterDocument } from "../../../components/CoverLetterDocument";
import { createMemo } from "solid-js";
import { getDeskLetterPrint } from "../../../lib/desk/letters";
import { useParams } from "@solidjs/router";

// A cover letter, printed by /api/desk/cover-letters/<id>/pdf and by the
// desk's page check. It lives under /desk so the guard keeps it behind the
// GitHub session, and has no frame because Chrome prints it as is.
export default function CoverLetterPrint() {
  const params = useParams<{ id: string }>();
  const letter = createMemo(() => getDeskLetterPrint(params.id));

  return (
    <>
      {/* Chrome writes the title into the PDF's Title metadata. */}
      <Title>{`${COVER_LETTER_WORDING[letter().language].title} - ${letter().profile.name}`}</Title>
      <Meta name="robots" content="noindex, nofollow" />
      <Style>{`@page { size: A4; margin: ${COVER_LETTER_MARGIN_MM}mm; }`}</Style>
      <CoverLetterDocument letter={letter()} />
    </>
  );
}
