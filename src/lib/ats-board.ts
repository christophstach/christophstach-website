import type { AtsBoard, AtsProvider } from "../data/postings";

// Where the job boards of the applicant tracking systems live, for people:
// the careers page an "ats-board" collector reads, and which provider and
// board a pasted careers address names.

type BoardAddress = Pick<AtsBoard, "provider" | "board">;

/** A board's name at its provider: letters, digits, dots, hyphens and underscores. */
const BOARD_NAME = /^[\w.-]+$/u;

const CAREERS_PAGES: Record<AtsProvider, (name: string) => string> = {
  greenhouse: (name) => `https://job-boards.greenhouse.io/${name}`,
  lever: (name) => `https://jobs.lever.co/${name}`,
  ashby: (name) => `https://jobs.ashbyhq.com/${name}`,
  personio: (name) => `https://${name}.jobs.personio.de`,
};

/** The careers page of a board, as people see it. */
function boardUrl({ provider, board }: BoardAddress): string {
  return CAREERS_PAGES[provider](encodeURIComponent(board));
}

/** Hosts whose first path segment is the board. */
const PATH_HOSTS: [RegExp, AtsProvider][] = [
  [/^(?:job-)?boards(?:\.eu)?\.greenhouse\.io$/u, "greenhouse"],
  [/^boards-api\.greenhouse\.io$/u, "greenhouse"],
  [/^jobs(?:\.eu)?\.lever\.co$/u, "lever"],
  [/^jobs\.ashbyhq\.com$/u, "ashby"],
];

/**
 * The provider and board a careers address names, e.g.
 * jobs.lever.co/acme/123 → lever/acme or acme.jobs.personio.de → personio/acme;
 * undefined for any other address. Greenhouse's embedded boards name theirs
 * as ?for=acme.
 */
function readBoardUrl(address: string): BoardAddress | undefined {
  let url: URL;

  try {
    url = new URL(address.trim());
  } catch {
    return undefined;
  }

  const host = url.hostname.toLowerCase();
  const personio = /^([\w-]+)\.jobs\.personio\.(?:de|com)$/u.exec(host)?.[1];

  if (personio !== undefined) {
    return { provider: "personio", board: personio };
  }

  const provider = PATH_HOSTS.find(([pattern]) => pattern.test(host))?.[1];

  if (provider === undefined) {
    return undefined;
  }

  const segments = url.pathname.split("/").filter((segment) => segment !== "");
  // boards-api.greenhouse.io/v1/boards/<board>/jobs; embeds use ?for=<board>.
  const board =
    url.searchParams.get("for") ??
    (segments[0] === "v1" && segments[1] === "boards" ? segments[2] : segments[0]);

  if (board === undefined || board === "embed" || !BOARD_NAME.test(board)) {
    return undefined;
  }

  return { provider, board };
}

export { BOARD_NAME, boardUrl, readBoardUrl };
export type { BoardAddress };
