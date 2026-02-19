import Parser from "rss-parser";
import OpenAI from "openai";
import { RENO_TIMES_SECTIONS, RENO_TIMES_FORMAT } from "./daily-briefing-config";

const parser = new Parser();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type SectionContent = {
  id: string;
  title: string;
  tldr: string;
  bullets: string[];
};

/** Fetch recent items from an RSS feed. */
export async function fetchRssFeed(feedUrl: string, maxItems = 15): Promise<string> {
  try {
    const feed = await parser.parseURL(feedUrl);
    const items = (feed.items ?? []).slice(0, maxItems);
    return items
      .map((i) => `${i.title ?? ""} ${(i.contentSnippet ?? i.content ?? "").slice(0, 300)}`)
      .join("\n");
  } catch {
    return "";
  }
}

/** Build section contents from fetched RSS + LLM (TL;DR + bullets per section). */
export async function buildEditionSections(): Promise<SectionContent[]> {
  const sectionTexts: { id: string; title: string; text: string }[] = [];

  for (const section of RENO_TIMES_SECTIONS) {
    if (section.id === "conclusions") continue;
    let text = "";
    if (section.feedUrl) {
      // Handle single URL or array of URLs
      const urls = Array.isArray(section.feedUrl) ? section.feedUrl : [section.feedUrl];
      const texts = await Promise.all(urls.map((url) => fetchRssFeed(url)));
      text = texts.filter(Boolean).join("\n\n");
    }
    if (!text && section.optional) continue;
    sectionTexts.push({
      id: section.id,
      title: section.title,
      text:
        text ||
        "No feed configured or no items fetched. Do NOT claim facts. Instead: write a short watchlist: what to watch for, threats/opportunities, and what could matter next.",
    });
  }

  if (sectionTexts.length === 0) {
    return [
      {
        id: "conclusions",
        title: "Conclusions / So what?",
        tldr: "No sections fetched. Check RSS feeds or try again later.",
        bullets: [],
      },
    ];
  }

  const kinnectContext = `Kinnect context (for Healthcare + Kinnect Scout sections):
- Kinnect is a three-sided platform that matches traditionally underserved medical private practices with residents (starting with orthodontics).
- It modernizes recruiting with AI matching (preferences + culture/fit), retains users via guided mentorship, and enables knowledge/expertise exchange throughout a doctor's career lifecycle.
- Key pain points: prehistoric recruiting, private practices lose to hospitals, bad fits from centralized recruiting, headhunters cost ~15% of first-year salary, lack of mentors for private-practice realities, lack of always-on expertise channels.`;

  const prompt = `You are writing The Reno Times, a daily TL;DR briefing for a founder (Rene) building Kinnect (three-sided medical recruiting + mentorship marketplace). Focus on what matters for: Kinnect, markets, macro, and Rene's personal/financial decisions.

${RENO_TIMES_FORMAT}

${kinnectContext}

For each section below, output a TL;DR (1–2 sentences) and 2–5 short bullets. Include "So what for you" and "What could happen next" where relevant.

Sections and raw content:
${sectionTexts.map((s) => `\n## ${s.title}\n${s.text.slice(0, 2500)}`).join("\n")}

Also add a final section "Conclusions / So what?" with 3–5 bullets summarizing impact on Rene, Kinnect, macro, and what to watch.

Respond with valid JSON only (no markdown):
{
  "sections": [
    { "id": "section_id", "title": "Section Title", "tldr": "1-2 sentences", "bullets": ["bullet1", "bullet2", ...] },
    ...
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_tokens: 4000,
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("No LLM response for edition");

  const parsed = JSON.parse(raw) as { sections?: SectionContent[] };
  const sections = Array.isArray(parsed.sections) ? parsed.sections : [];

  const conclusions = RENO_TIMES_SECTIONS.find((s) => s.id === "conclusions");
  if (conclusions && !sections.some((s) => s.id === "conclusions")) {
    const concl = sections.find((s) => s.title?.toLowerCase().includes("conclusion"));
    if (!concl) {
      sections.push({
        id: "conclusions",
        title: "Conclusions / So what?",
        tldr: "See bullets above for impact and what to watch.",
        bullets: [],
      });
    }
  }

  return sections;
}

/** Format edition date as "The Reno Times – Tuesday, Feb 18, 2026". */
export function editionTitle(date: Date): string {
  const day = date.toLocaleDateString("en-US", { weekday: "long" });
  const rest = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `The Reno Times – ${day}, ${rest}`;
}
