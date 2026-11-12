import "server-only";
import { boardPosting, isoDay, joinPlaces, workplaceInLocation } from "./types";
import { decodeEntities, htmlToText } from "../text";
import type { AtsBoard } from "../../../data/postings";
import type { AtsReader } from "./types";
import type { FoundPosting } from "../types";
import { HttpError } from "../../http";
import { fetchBoard } from "./fetch";

// Personio's job feed: <board>.jobs.personio.de/xml, common with German
// companies. It lists each job as a <position>: id, office (and
// additionalOffices), name, createdAt, and the ad as jobDescriptions, each a
// heading and HTML in CDATA. It states no workplace or salary.

/** A tag's text: CDATA as it is, anything else with its entities decoded. */
function textOf(content: string): string {
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/u.exec(content)?.[1];

  return cdata ?? decodeEntities(content).trim();
}

/** The contents of each <tag> in a piece of XML, in order. */
function tagsOf(xml: string, tag: string): string[] {
  return Array.from(
    xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "gu")),
    (match) => match[1] ?? "",
  );
}

/** One <position>, without its descriptions; they hold <name>s of their own. */
function toPosting(position: string, board: AtsBoard): FoundPosting | undefined {
  const descriptions = tagsOf(position, "jobDescriptions")[0] ?? "";
  const head = position.replace(/<jobDescriptions>[\s\S]*?<\/jobDescriptions>/u, "");
  const id = textOf(tagsOf(head, "id")[0] ?? "");
  const title = textOf(tagsOf(head, "name")[0] ?? "");

  if (!/^\d+$/u.test(id) || title === "") {
    return undefined;
  }

  // The first <office> is the main one; additionalOffices hold the others.
  const location = joinPlaces(tagsOf(head, "office").map(textOf));
  const description = tagsOf(descriptions, "jobDescription")
    .map((part) =>
      [textOf(tagsOf(part, "name")[0] ?? ""), htmlToText(textOf(tagsOf(part, "value")[0] ?? ""))]
        .filter((line) => line !== "")
        .join("\n"),
    )
    .join("\n\n");

  return {
    ...boardPosting(board, id),
    url: `https://${board.board}.jobs.personio.de/job/${id}`,
    title,
    location,
    description,
    postedOn: isoDay(textOf(tagsOf(head, "createdAt")[0] ?? "")),
    workplace: workplaceInLocation(location),
    raw: position,
  };
}

const personio: AtsReader = {
  provider: "personio",
  async read(board) {
    const xml = await fetchBoard(
      `https://${encodeURIComponent(board.board)}.jobs.personio.de/xml`,
      board,
    );

    if (!xml.includes("<workzag-jobs")) {
      throw new HttpError(502, `Personio's board "${board.board}" no longer reads as expected.`);
    }

    return tagsOf(xml, "position").flatMap((position) => toPosting(position, board) ?? []);
  },
  reread(raw, board) {
    return toPosting(raw, board);
  },
};

export { personio };
