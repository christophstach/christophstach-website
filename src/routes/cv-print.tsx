import { Meta, Title } from "@solidjs/meta";
import { CvDocument } from "../components/CvDocument";
import type { RouteDefinition } from "@solidjs/router";
import { createMemo } from "solid-js";
import { getPrimaryCv } from "../lib/cv-print";

export const route = {
  preload: () => {
    void getPrimaryCv();
  },
} satisfies RouteDefinition;

// The public CV, unlinked and kept out of search; /christoph-stach-cv.pdf
// prints it with headless Chrome.
export default function CvPrint() {
  const cv = createMemo(() => getPrimaryCv());

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
