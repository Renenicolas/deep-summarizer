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
  /** Optional source links for "read further" (e.g. [{ label: "CoinDesk", url: "..." }]). */
  sources?: { label: string; url: string }[];
};

export type RssFetchResult = { text: string; links: { label: string; url: string }[] };

/** Fetch recent items from an RSS feed; returns text and links for "read further". */
export async function fetchRssFeed(feedUrl: string, maxItems = 15): Promise<string> {
  const r = await fetchRssFeedWithLinks(feedUrl, maxItems);
  return r.text;
}

export async function fetchRssFeedWithLinks(feedUrl: string, maxItems = 15): Promise<RssFetchResult> {
  try {
    const feed = await parser.parseURL(feedUrl);
    const items = (feed.items ?? []).slice(0, maxItems);
    const text = items
      .map((i) => `${i.title ?? ""} ${(i.contentSnippet ?? i.content ?? "").slice(0, 300)}`)
      .join("\n");
    const links = items
      .filter((i) => i.link && i.title)
      .slice(0, 5)
      .map((i) => ({ label: (i.title ?? "").slice(0, 80), url: i.link! }));
    return { text, links };
  } catch {
    return { text: "", links: [] };
  }
}

/** Build section contents from fetched RSS + LLM (TL;DR + bullets per section). Includes source links per section. */
export async function buildEditionSections(): Promise<SectionContent[]> {
  const sectionTexts: { id: string; title: string; text: string; links: { label: string; url: string }[] }[] = [];

  for (const section of RENO_TIMES_SECTIONS) {
    if (section.id === "conclusions") continue;
    let text = "";
    const allLinks: { label: string; url: string }[] = [];
    if (section.feedUrl) {
      const urls = Array.isArray(section.feedUrl) ? section.feedUrl : [section.feedUrl];
      const results = await Promise.all(urls.map((url) => fetchRssFeedWithLinks(url)));
      text = results.map((r) => r.text).filter(Boolean).join("\n\n");
      results.forEach((r) => r.links.forEach((l) => allLinks.push(l)));
    }
    if (!text && section.optional) continue;
    sectionTexts.push({
      id: section.id,
      title: section.title,
      text:
        text ||
        "No feed configured or no items fetched. Do NOT claim facts. Instead: write a short watchlist: what to watch for, threats/opportunities, and what could matter next.",
      links: allLinks.slice(0, 6),
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

  const sourcesForPrompt = sectionTexts
    .map(
      (s) =>
        `\n## ${s.title} – available sources (use exact URL in your output)\n${s.links.map((l) => `- ${l.label} | ${l.url}`).join("\n")}`
    )
    .join("\n");

  const prompt = `You are writing The Reno Times, a daily briefing for Rene (founder of Kinnect). Write so a middle-schooler could understand—simple, clear language, no jargon without explaining it.

RULES:
1. DEPTH: Every point must be specific, not generic. No filler like "monitor trends" or "stay informed." Say exactly what happened, why it matters, and what to do.
2. SO WHAT AT END OF EACH SECTION: At the end of every section (before any links), include 2–4 bullets under a clear subheading "So what for you / Actionables" that are specific to that section: what Rene should do, watch, or avoid and why. Make it super clear so no further inquiry is needed.
3. INSTITUTIONAL MEMORY: Reference recent context where relevant. Be specific to Rene's company and life.
4. PUBLIC MARKETS: Structure the Public Markets section in two parts: (a) Overall market – professional investor view (macro, indices, rates, what it means for the market as a whole, key levels or catalysts). (b) Top stocks / equity research – name 3–5 stocks to look into, why each matters, professional-level analysis (thesis, risk, what to watch), so Rene fully understands each pick.
5. CRYPTO/MARKETS: Write like a professional desk: concrete levels, catalysts, what to do (e.g. "If BTC holds above X, watch Y; else Z").
6. TOOLS & AI: For every tool: (a) What it is, (b) How Rene/Kinnect could use it, (c) Cost, (d) Setup time, (e) Integration, (f) Worth it? (yes/no + why). Be meticulous.
7. CONCLUSIONS: Final section with 4–6 specific actionables: what to do this week, what to watch, what to avoid. No generic "stay informed"—name the regulation or the move.
8. SOURCE LINK LABELS: For "sources" in each section, output a short descriptive label for each link so Rene knows exactly what they'll learn when they click (e.g. "Why the Fed's move matters for tech stocks" not just the article title). Each label should be one short phrase that describes what the linked article explains.

${kinnectContext}

Sections and raw content:
${sectionTexts.map((s) => `\n## ${s.title}\n${s.text.slice(0, 2500)}`).join("\n")}

Available sources per section (use these exact URLs in your "sources" output; provide a descriptive "label" for each so the reader knows what they'll learn):
${sourcesForPrompt}

Output per section: TL;DR, 3–6 content bullets, then 2–4 "So what for you / Actionables" bullets, then "sources" with url + descriptive label. Add final section "Conclusions / So what?" with 4–6 specific actionables.

Respond with valid JSON only (no markdown):
{
  "sections": [
    { "id": "section_id", "title": "Section Title", "tldr": "...", "bullets": ["...", "So what: ...", ...], "sources": [ { "url": "exact URL from list", "label": "Short phrase: what reader will learn" } ] },
    ...
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_tokens: 8000,
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("No LLM response for edition");

  const parsed = JSON.parse(raw) as { sections?: SectionContent[] };
  const sections = Array.isArray(parsed.sections) ? parsed.sections : [];

  for (const sec of sections) {
    const meta = sectionTexts.find((m) => m.id === sec.id);
    if (sec.sources?.length) {
      // LLM provided descriptive labels; keep them (urls must match our RSS)
      sec.sources = sec.sources.filter((s) => s.url && s.label);
    }
    if (!sec.sources?.length && meta?.links?.length) sec.sources = meta.links;
  }

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
