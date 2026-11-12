import type { AtsBoard } from "../../data/postings";
import { boardUrl, readBoardUrl } from "../ats-board";

// A job board collector's board as its form edits it: the careers address,
// and the filters as comma-separated words.

interface BoardForm {
  address: string;
  company: string;
  titleIncludes: string;
  titleExcludes: string;
  locations: string;
}

type BoardField = keyof BoardForm;

/** What a new job board collector starts with: titles a software engineer looks for. */
const NEW_BOARD_FORM: BoardForm = {
  address: "",
  company: "",
  titleIncludes: "engineer, developer",
  titleExcludes: "intern, working student, werkstudent, recruiter, sourcer",
  locations: "Berlin, Germany, Deutschland, Remote",
};

function words(list: string): string[] {
  return list
    .split(",")
    .map((word) => word.trim())
    .filter((word) => word !== "");
}

function boardForm(board: AtsBoard | null): BoardForm {
  return board === null
    ? NEW_BOARD_FORM
    : {
        address: boardUrl(board),
        company: board.company,
        titleIncludes: board.titleIncludes.join(", "),
        titleExcludes: board.titleExcludes.join(", "),
        locations: board.locations.join(", "),
      };
}

/** The board a form describes; undefined while its address names none. */
function toBoard(form: BoardForm): AtsBoard | undefined {
  const address = readBoardUrl(form.address);

  return address === undefined
    ? undefined
    : {
        ...address,
        company: form.company.trim(),
        titleIncludes: words(form.titleIncludes),
        titleExcludes: words(form.titleExcludes),
        locations: words(form.locations),
      };
}

export { NEW_BOARD_FORM, boardForm, toBoard };
export type { BoardField, BoardForm };
