import {
  COVER_LETTER_MARGIN_MM,
  COVER_LETTER_WORDING,
} from "../../../../data/cover-letter-wording";
import { Meta, Style, Title } from "@solidjs/meta";
import { CoverLetterDocument } from "../../../../components/CoverLetterDocument";
import { createMemo } from "solid-js";
import { getDeskSentLetter } from "../../../../lib/desk/applications";
import { useParams } from "@solidjs/router";

// A cover letter an application sent, as it printed then; printed by
// /api/desk/applications/<id>/sent-letters/<letter>. Under /desk for the
// guard, without a frame because Chrome prints it as is.
export default function DeskSentLetterPrint() {
  const params = useParams<{ id: string; letter: string }>();
  const letter = createMemo(() => getDeskSentLetter(params.id, params.letter));

  return (
    <>
      {/* Chrome writes the title into the PDF's Title metadata. */}
      <Title>{`${COVER_LETTER_WORDING[letter().language].title} - ${letter().profile.name}`}</Title>
      <Meta name="robots" content="noindex, nofollow" />
      <Style>{`@page { size: A4; margin: ${COVER_LETTER_MARGIN_MM}mm; }`}</Style>
      <main>
        <CoverLetterDocument letter={letter()} />
      </main>
    </>
  );
}
