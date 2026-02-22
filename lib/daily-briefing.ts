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

  const todayLabel = new Date().toISOString().slice(0, 10);

  for (const section of RENO_TIMES_SECTIONS) {
    if (section.id === "conclusions") continue;
    let text = "";
    const allLinks: { label: string; url: string }[] = [];
    const sectionId = section.id as string;
    if (sectionId === "major_news") {
      text = `Today's date: ${todayLabel}. ONLY include this section if there is a major release or one-off event that many people care about—e.g. Bain annual report, McKinsey report, major consulting/industry report, big product launch (Apple, Google, OpenAI, etc.), major regulatory or world news. If nothing like that is happening or you're not sure, output TL;DR: Nothing major today. and one short line; keep it rare. If there IS something major, write 1–3 short paragraphs with context and "So what for you / Actionables" as usual.`;
      sectionTexts.push({ id: section.id, title: section.title, text, links: [] });
      continue;
    }
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

  const prompt = `You are writing The Reno Times, a daily briefing newsletter modeled after Finimize, Morning Brew, and TLDR. Digestible but with enough context that Rene fully understands each point. Total read: under 15 minutes.

STYLE (Morning Brew / TLDR / Finimize):
- Each section: short headline, then TL;DR (one sentence), then 2–4 short PARAGRAPHS (not bare bullets). Each paragraph must give CONTEXT: what happened, why it matters, who it affects, and enough background so Rene can understand without reading the source.
- After the paragraphs in that section, add "So what for you / Actionables": 2–3 bullets specific to Rene/Kinnect—what to do, watch, or avoid and why. So-what lives at the end of EACH section only (no separate Conclusions section).
- If a section has NO concrete news or update (e.g. no new competitor move, no new tool, no real market move): do NOT write generic filler like "Waiting for new information", "Focus on key competitors", or "Monitor trends". Write one short line only: "Nothing major today." or "Quiet day—no major moves." and move on. Only write substantive content when there is real news.
- When there IS news: give full context in 2–4 sentences per point so Rene fully understands, then the so-what bullets.

RULES:
1. Middle-school language: simple, clear, no jargon without explaining.
2. Every point specific—no filler. Say exactly what happened, why it matters, and what to do.
3. SO WHAT AT END OF EACH SECTION (REQUIRED): 2–3 bullets "So what for you / Actionables" for that section only.
4. INSTITUTIONAL MEMORY: Reference recent context where relevant. Be specific to Rene's company and life.
5. PUBLIC MARKETS: (a) Overall market – professional view (macro, indices, rates, catalysts). (b) Top stocks – 3–5 with thesis, risk, what to watch.
6. CRYPTO/MARKETS: Concrete levels, catalysts, what to do (e.g. "If BTC holds above X, watch Y").
7. TOOLS & AI: For each tool: what it is, how Rene/Kinnect could use it, cost, setup time, worth it? (yes/no + why).
8. SOURCE LINK LABELS: Descriptive label per link so Rene knows what he'll get when he clicks.

${kinnectContext}

Sections and raw content:
${sectionTexts.map((s) => `\n## ${s.title ?? "Section"}\n${(s.text ?? "").slice(0, 2500)}`).join("\n")}

Available sources per section (use these exact URLs in your "sources" output; provide a descriptive "label" for each):
${sourcesForPrompt}

Output per section: TL;DR (one sentence), then 2–4 short paragraphs (each with full context so Rene understands—no bare bullets without explanation), then 2–3 bullets "So what for you / Actionables", then "sources" with url + descriptive label. If a section has no real news, output only a one-line TL;DR like "Nothing major today." and empty or minimal bullets. Do NOT output a "Conclusions" section—so-what is at the end of each section only.

Respond with valid JSON only (no markdown):
{
  "sections": [
    { "id": "section_id", "title": "Section Title", "tldr": "One sentence summary", "bullets": ["Paragraph 1: what happened and why.", "Paragraph 2: context and implications.", "So what / Actionables: what Rene should do/watch/avoid.", "So what / Actionables: ..."], "sources": [ { "url": "exact URL from list", "label": "Short phrase: what reader will learn" } ] },
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
