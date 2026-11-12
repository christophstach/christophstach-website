import "server-only";

// What a company's own job ads say about its funding: a YC batch ("YC W25",
// "Y Combinator S24"), a round ("Series A", "seed-funded") or well-known
// investors. Free: the text is in the desk already.

/** What the ads say, with the sentence that says it. */
interface AdFacts {
  /** e.g. "W25"; empty if no ad names one. */
  batch: string;
  /** The ad says it raised venture capital. */
  venture: boolean;
  /** The sentence that shows it, trimmed; empty if none. */
  evidence: string;
  /** The posting it is from; empty if none. */
  postingId: string;
}

/** A posting's id and the text of its ad. */
interface Ad {
  id: string;
  text: string;
}

/** "YC W25", "(YC S24)", "Y Combinator W2025", "YC-backed (F24)". */
const YC_BATCH =
  /\b(?:YC|Y[\s-]?Combinator)\b[\s(\-–,]*(?:backed[\s(,]*)?\(?\s*([WSFX])\s*'?(?:20)?(\d{2})\b/iu;

/** Mentions of venture capital, English and German. */
const VENTURE = [
  /\b(?:YC|Y[\s-]?Combinator)[\s-]backed\b/iu,
  /\bbacked by (?:Y[\s-]?Combinator|YC)\b/iu,
  /\bSeries[\s-][A-F]\b/u,
  /\b(?:pre-?)?seed[\s-](?:round|stage|funded|funding|financing)\b/iu,
  /\b(?:venture|VC)[\s-](?:backed|funded|capital)\b/iu,
  /\braised \$?€?\d[\d.,]*\s?(?:M|m|million|Mio|bn|B|billion)\b/u,
  /\b(?:Risikokapital|Wagniskapital|Finanzierungsrunde|Seed-Finanzierung)\b/iu,
  /\b(?:Sequoia|Andreessen Horowitz|a16z|Accel|Index Ventures|Lakestar|Earlybird|Point Nine|HV Capital|Balderton|Atomico|Northzone|Creandum|Lightspeed|General Catalyst|Greylock|Benchmark Capital|Kleiner Perkins|Founders Fund|Insight Partners|Tiger Global|Coatue|Speedinvest|Cherry Ventures|Project A Ventures|468 Capital|La Famiglia|Picus Capital|Redalpine|LocalGlobe|Seedcamp|Khosla Ventures|Thrive Capital|Bessemer|Battery Ventures|Notion Capital)\b/u,
];

/** The sentence around `index`, cut to 200 characters. */
function sentenceAt(text: string, index: number): string {
  const start = Math.max(
    text.lastIndexOf(".", index) + 1,
    text.lastIndexOf("\n", index) + 1,
    index - 120,
  );
  const ends = [text.indexOf(".", index), text.indexOf("\n", index)].filter((end) => end !== -1);
  const end = Math.min(...ends, index + 120, text.length);

  return text
    .slice(start, end + 1)
    .replaceAll(/\s+/gu, " ")
    .trim()
    .slice(0, 200);
}

/** What the ads of a company's postings say about its funding: a YC batch first. */
function adFacts(ads: readonly Ad[]): AdFacts {
  for (const { id, text } of ads) {
    const batch = YC_BATCH.exec(text);

    if (batch?.[1] !== undefined && batch[2] !== undefined) {
      return {
        batch: `${batch[1].toUpperCase()}${batch[2]}`,
        venture: true,
        evidence: sentenceAt(text, batch.index),
        postingId: id,
      };
    }
  }

  for (const { id, text } of ads) {
    for (const pattern of VENTURE) {
      const match = pattern.exec(text);

      if (match !== null) {
        return {
          batch: "",
          venture: true,
          evidence: sentenceAt(text, match.index),
          postingId: id,
        };
      }
    }
  }

  return { batch: "", venture: false, evidence: "", postingId: "" };
}

export { adFacts };
export type { Ad, AdFacts };
