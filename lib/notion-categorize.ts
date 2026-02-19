import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Must match the Select options in your Notion database (Area). No Daily Briefing – that lives in Reno Times – Editions. */
export const AREAS = [
  "Kinnect",
  "Entrepreneurship (general)",
  "Crypto / Web3",
  "Public Markets / Equities",
  "Startups / VC",
  "Politics / Global",
  "Research / Q&A",
  "Other",
] as const;

/** Must match the Multi-select options in your Notion database (Topic Tags). */
export const TOPIC_TAGS = [
  "Marketing",
  "Strategy",
  "Scaling",
  "Leadership",
  "Operations",
  "Healthcare",
  "Mental Models",
  "Macro",
  "DSOs",
  "Dentistry",
  "Startups",
  "Crypto",
  "Growth",
  "Ops",
  "GTM",
  "Product",
  "Sales",
  "Other",
] as const;

/** Must match the Select options in your Notion database (Content Type). */
export const CONTENT_TYPES = [
  "Podcast",
  "Book",
  "Article",
  "News",
  "Report",
  "Research / Q&A",
  "Other",
] as const;

export type Area = (typeof AREAS)[number];
export type TopicTag = (typeof TOPIC_TAGS)[number];
export type ContentType = (typeof CONTENT_TYPES)[number];

export type CategorizeResult = {
  area: string;
  topicTags: string[];
  contentType: string;
};

const AREA_STR = AREAS.join(", ");
const TAGS_STR = TOPIC_TAGS.join(", ");
const TYPES_STR = CONTENT_TYPES.join(", ");

/**
 * Analyzes the summary + bullets + takeaways (and optional source hint) and returns
 * Area, Topic Tags, and Content Type that match your Notion database options.
 */
export async function categorizeForNotion(params: {
  titleOrSourceHint?: string;
  summary: string;
  bullets: string[];
  founderTakeaways: string[];
}): Promise<CategorizeResult> {
  const { titleOrSourceHint = "", summary, bullets, founderTakeaways } = params;
  const text = [
    titleOrSourceHint && `Title/source hint: ${titleOrSourceHint}`,
    "Summary:",
    summary.slice(0, 6000),
    "Key bullets:",
    bullets.slice(0, 20).join("\n"),
    "Founder takeaways:",
    founderTakeaways.slice(0, 10).join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  const systemPrompt = `You categorize content for a founder's knowledge base in Notion.

Pick exactly one Area, 1–5 Topic Tags, and one Content Type from the lists below. Choose only from these options; do not invent new values.

Areas (pick one): ${AREA_STR}

Topic Tags (pick 1–5 that fit; use exact spelling): ${TAGS_STR}

Content Types (pick one): ${TYPES_STR}

Rules:
- Area = main theme (Kinnect for your company/ortho marketplace; Entrepreneurship (general) for general startup/operator; Crypto/Web3; Public Markets; etc.).
- Topic Tags = specific topics (e.g. Strategy, Scaling, DSOs, Macro).
- Content Type = format (Podcast, Book, Article, News, Report, Research / Q&A, Other).

Respond with valid JSON only, no markdown:
{"area":"<one area from list>","topicTags":["<tag1>","<tag2>",...],"contentType":"<one type from list>"}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("No categorization response");

  let parsed: { area?: string; topicTags?: string[]; contentType?: string };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    throw new Error("Invalid categorization JSON");
  }

  const area = AREAS.includes(parsed.area as Area) ? parsed.area! : "Other";
  const topicTags = Array.isArray(parsed.topicTags)
    ? parsed.topicTags.filter((t) => TOPIC_TAGS.includes(t as TopicTag))
    : [];
  const contentType = CONTENT_TYPES.includes(parsed.contentType as ContentType)
    ? parsed.contentType!
    : "Other";

  return { area, topicTags, contentType };
}
