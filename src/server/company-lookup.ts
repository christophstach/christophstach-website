import "server-only";
import { COMPANY_FIELDS, COMPANY_FIELD_LABELS, COMPANY_FUNDINGS } from "../data/companies";
import { array, literal, object, safeParse, string } from "zod/mini";
import Anthropic, { APIConnectionTimeoutError, APIError, RateLimitError } from "@anthropic-ai/sdk";
import type { CompanySuggestion } from "../data/companies";
import { HttpError } from "./http";
import { env } from "virtual:solid-env/server";

// Suggests what a company does, where it's based and how it's funded, from a
// web search by Claude. It only suggests: the desk shows it, and the user
// decides what to save.

const MODEL = "claude-opus-5-5";

/** The app runs as one function with a 60 s limit; the lookup has to end before it. */
const TIMEOUT_MS = 50_000;

const SYSTEM = `You research companies for a software engineer looking for a job.
Given a company's name and some of its job ads, use web search to find out what it does, the country of its headquarters, how it is funded, and its website.

Answer with the JSON the output format asks for:
- field: the one value that fits its main product best: ${COMPANY_FIELDS.map((field) => `"${field}" (${COMPANY_FIELD_LABELS[field]})`).join(", ")}.
- headquarters: the ISO 3166-1 alpha-2 code of the country of its headquarters, e.g. "US".
- funding: "vc" if it raised venture capital and isn't listed on a stock exchange; "public" if it is listed; "private" if it is bootstrapped or privately owned without venture capital; "subsidiary" if it belongs to a larger company.
- website: its own homepage, as a full https URL.
- summary: two or three plain sentences on what it makes and how it is funded (its last round and lead investors, if known).
- sources: the URLs of the pages you relied on.

Several companies can share a name: the job ads say which one is meant. Leave a field as an empty string when your sources don't establish it; don't guess.`;

const SUGGESTION_SCHEMA = {
  type: "object",
  properties: {
    field: { type: "string", enum: ["", ...COMPANY_FIELDS] },
    headquarters: { type: "string" },
    funding: { type: "string", enum: ["", ...COMPANY_FUNDINGS] },
    website: { type: "string" },
    summary: { type: "string" },
    sources: { type: "array", items: { type: "string" } },
  },
  required: ["field", "headquarters", "funding", "website", "summary", "sources"],
  additionalProperties: false,
};

const NOT_A_SUGGESTION = "The lookup answered in a shape the desk doesn't know.";

const suggestionSchema = object({
  field: literal(["", ...COMPANY_FIELDS], NOT_A_SUGGESTION),
  headquarters: string(NOT_A_SUGGESTION),
  funding: literal(["", ...COMPANY_FUNDINGS], NOT_A_SUGGESTION),
  website: string(NOT_A_SUGGESTION),
  summary: string(NOT_A_SUGGESTION),
  sources: array(string(NOT_A_SUGGESTION), NOT_A_SUGGESTION),
});

/** A full http(s) URL as written; empty for anything else. */
function webAddress(value: string): string {
  try {
    const url = new URL(value.trim());

    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

/** The answer's text, parsed and cleaned: unknown codes and addresses become empty. */
function readSuggestion(text: string): CompanySuggestion {
  let json: unknown;

  try {
    json = JSON.parse(text);
  } catch {
    throw new HttpError(502, NOT_A_SUGGESTION);
  }

  const parsed = safeParse(suggestionSchema, json);

  if (!parsed.success) {
    throw new HttpError(502, NOT_A_SUGGESTION);
  }

  const headquarters = parsed.data.headquarters.trim().toUpperCase();

  return {
    field: parsed.data.field,
    headquarters: /^[A-Z]{2}$/u.test(headquarters) ? headquarters : "",
    funding: parsed.data.funding,
    website: webAddress(parsed.data.website),
    summary: parsed.data.summary.trim(),
    sources: [...new Set(parsed.data.sources.map(webAddress).filter((url) => url !== ""))],
  };
}

/** What the lookup knows of the company: its name, website and a few of its ads. */
interface LookupInput {
  name: string;
  website: string;
  postings: { title: string; location: string }[];
}

function question(input: LookupInput): string {
  const ads = input.postings
    .slice(0, 5)
    .map(
      (posting) => `- ${posting.title}${posting.location === "" ? "" : `, ${posting.location}`}`,
    );

  return [
    `Company: ${input.name}`,
    input.website === "" ? "" : `Website: ${input.website}`,
    ads.length === 0 ? "" : `Some of its job ads:\n${ads.join("\n")}`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** At most this many turns: a long search can pause one, and it goes on when sent back. */
const MAX_TURNS = 3;

/** One turn of the lookup; a paused turn is sent back with what it has so far. */
async function ask(
  client: Anthropic,
  messages: Anthropic.Beta.BetaMessageParam[],
  turn: number,
): Promise<CompanySuggestion> {
  if (turn === MAX_TURNS) {
    throw new HttpError(504, "The lookup didn't finish. Try again, or fill it in by hand.");
  }

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16_000,
    // A declined request runs again on another model inside the same call.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: SUGGESTION_SCHEMA },
    },
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 4 }],
    system: SYSTEM,
    messages,
  });

  if (response.stop_reason === "pause_turn") {
    return ask(client, [...messages, { role: "assistant", content: response.content }], turn + 1);
  }

  if (response.stop_reason === "refusal") {
    throw new HttpError(502, "The lookup was declined. Fill in the company by hand.");
  }

  return readSuggestion(
    response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join(""),
  );
}

/** Asks Claude, with web search, what the company is. Throws an HttpError if it can't tell. */
async function lookUpCompany(input: LookupInput): Promise<CompanySuggestion> {
  const apiKey = env.ANTHROPIC_API_KEY;

  if (apiKey === undefined) {
    throw new HttpError(503, "The lookup needs ANTHROPIC_API_KEY on the server.");
  }

  const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 0 });
  try {
    return await ask(client, [{ role: "user", content: question(input) }], 0);
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw new HttpError(429, "The lookup is rate limited. Try again in a minute.");
    }

    if (error instanceof APIConnectionTimeoutError) {
      throw new HttpError(504, "The lookup took too long. Try again, or fill it in by hand.");
    }

    if (error instanceof APIError) {
      throw new HttpError(502, `The lookup failed: ${error.message}`);
    }

    throw error;
  }
}

export { lookUpCompany };
