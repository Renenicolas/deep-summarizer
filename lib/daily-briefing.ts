import Parser from "rss-parser";
import OpenAI from "openai";
import { RENO_TIMES_SECTIONS, RENO_TIMES_FORMAT } from "./daily-briefing-config";

async function serperSearch(query: string): Promise<string> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.warn("[Serper] SERPER_API_KEY not set, skipping search for:", query);
    return "";
  }
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 5 }),
    });
    const data = await res.json();
    const results = (data.organic ?? []) as { title?: string; snippet?: string; link?: string }[];
    return results
      .map((r, i) => `[${i + 1}] ${r.title ?? ""}\n${r.snippet ?? ""}\nURL: ${r.link ?? ""}`)
      .join("\n\n");
  } catch (e) {
    console.warn("[Serper] Search failed for:", query, e);
    return "";
  }
}

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
export async function buildEditionSections(): Promise<{
  sections: SectionContent[];
  inputTokens: number;
  outputTokens: number;
}> {
  const sectionTexts: { id: string; title: string; text: string; links: { label: string; url: string }[] }[] = [];

  const todayLabel = new Date().toISOString().slice(0, 10);

  for (const section of RENO_TIMES_SECTIONS) {
    let text = "";
    const allLinks: { label: string; url: string }[] = [];
    if (section.feedUrl) {
      const urls = Array.isArray(section.feedUrl) ? section.feedUrl : [section.feedUrl];
      const results = await Promise.all(urls.map((url) => fetchRssFeedWithLinks(url)));
      text = results.map((r) => r.text).filter(Boolean).join("\n\n");
      results.forEach((r) => r.links.forEach((l) => allLinks.push(l)));
    }
    sectionTexts.push({
      id: section.id,
      title: section.title,
      text:
        text ||
        "No feed configured or no items fetched. You are Rene's scout and advisor: write a short watchlist—competitors to keep tabs on, themes to monitor, what could matter next. Do NOT claim facts; do give things to watch and think about.",
      links: allLinks.slice(0, 6),
    });
  }

  // Enrich major_news with live search
  const majorNewsSection = sectionTexts.find((s) => s.id === "major_news");
  if (majorNewsSection) {
    const today = new Date().toISOString().slice(0, 10);
    const searchText =
      (await serperSearch(`top news today ${today}`)) +
      "\n\n" +
      (await serperSearch(`market moving news ${today}`));
    if (searchText.trim()) majorNewsSection.text = (majorNewsSection.text ?? "") + "\n\n" + searchText;
  }

  // Enrich kinnect_scout with live search
  const kinnectScoutSection = sectionTexts.find((s) => s.id === "kinnect_scout");
  if (kinnectScoutSection) {
    const searches = await Promise.all([
      serperSearch("orthodontic recruiting software 2026"),
      serperSearch("dental staffing startup funding 2026"),
      serperSearch("DSO recruiting technology news"),
      serperSearch("orthodontic resident job market 2026"),
    ]);
    const searchText = searches.filter(Boolean).join("\n\n");
    if (searchText.trim()) kinnectScoutSection.text = (kinnectScoutSection.text ?? "") + "\n\n" + searchText;
  }

  if (sectionTexts.length === 0) {
    return {
      sections: [
        {
          id: "public_markets",
          title: "No content",
          tldr: "No sections fetched. Check RSS feeds or try again later.",
          bullets: [],
        },
      ],
      inputTokens: 0,
      outputTokens: 0,
    };
  }

  const kinnectContext = `Kinnect context — read carefully before writing every section:

COMPANY: Kinnect is a three-sided platform matching orthodontic residents with private practices and DSOs. Core value: AI-powered culture-fit matching, mentorship continuity, and an always-on expertise channel. Pre-revenue, MVP in progress. Next major milestone: AAO conference April 30, 2026.

ICP:
- Residents: PGY1-3 orthodontic residents who want private practice over hospital systems but have no good way to find the right culture fit
- Practices: 1-3 doctor private orthodontic offices losing recruiting battles to DSOs and hospitals; currently paying headhunters ~15% of first-year salary for bad fits
- DSOs: secondary, longer-term target

COMPETITORS TO WATCH: OrthoFi (patient financing/practice ops), RevenueWell (patient comms), Rhinogram (telehealth messaging), generic job boards (Indeed, LinkedIn), dental-specific headhunters, any startup that recently raised in dental/orthodontic staffing or practice management tech

CURRENT FOCUS: outreach and onboarding (residents + practices), Delphi AI "expert brain" concept (digital twin trained on top orthodontist expertise and case records), AAO booth/presence strategy

RENE'S PERSONAL MARKET CONTEXT: early-stage solo founder, long investment horizon, holds BTC, interested in macro and rates insofar as they affect startup fundraising conditions and consumer spending on elective dental/orthodontic work; interested in AI tools that reduce solo-founder overhead and can be evaluated quickly on cost vs. ROI

WHAT RENE DOES NOT WANT — ENFORCE THESE STRICTLY:
- Generic "founder advice" that applies to any startup — every So What bullet must name Kinnect, residents, practices, or DSOs specifically
- Filler phrases like "keep an eye on X" or "monitor Y" without saying exactly what to watch for and why it matters to Kinnect
- Any section that uses the words "quiet day", "nothing major", "no significant news", or any equivalent
- Surface-level crypto commentary — always include specific price levels, the catalyst, and a clear action or decision threshold
- Bullet points that could apply to any founder or any company — if it doesn't mention orthodontics, recruiting, or Kinnect's specific situation, rewrite it`;

  const sourcesForPrompt = sectionTexts
    .map(
      (s) =>
        `\n## ${s.title} – available sources (use exact URL in your output)\n${s.links.map((l) => `- ${l.label} | ${l.url}`).join("\n")}`
    )
    .join("\n");

  const prompt = `You are writing The Reno Times — Rene's only daily news source. He reads this instead of everything else. Your job is to make him genuinely informed on every topic, not just aware of it. After reading each section he should be able to discuss that topic with an expert without having read anything else.

TARGET LENGTH: 2,500–3,500 words total across all sections. Never go under this. If a section has thin RSS data, fill it with essential background context, historical patterns, what experts are watching, and what the range of outcomes looks like. Never write less than 4 full paragraphs per section regardless of news volume.

STYLE:
- Each paragraph: minimum 4 sentences. First sentence = what happened. Second = why it happened / root cause. Third = who it affects and how. Fourth = what comes next / what to watch.
- Write like The Economist meets Morning Brew: authoritative but readable. No jargon without a plain-English explanation immediately after.
- Numbers always: prices, percentages, dates, dollar amounts. Never say "rising prices" — say "up 12% over the past 3 weeks."
- Never use these phrases: "keep an eye on", "stay informed", "be vigilant", "monitor X", "quiet day", "no major news", "nothing significant today", "it's important to", "it's crucial to", or any variant. Every sentence must state a specific fact or action, not a vague suggestion.

STRUCTURE PER SECTION:
1. One-sentence TL;DR at the top (bold)
2. 5–8 paragraphs of deep coverage (4+ sentences each)
3. "So what for Kinnect" — exactly 3 bullets, each must:
   - Name a specific company, person, number, or event from this section
   - Explain exactly what Rene should do, decide, or prepare for
   - Never be applicable to any founder other than Rene / Kinnect specifically

ABSOLUTE RULES:
- If a section has little RSS data: use the data you have, then add 2-3 paragraphs of essential background context (history, players, mechanics) so Rene understands the full landscape — not filler, real education.
- Crypto: always include BTC price today, % change over last 7 days, key support/resistance levels, and one specific action threshold (e.g. "if BTC closes above $X this week, watch for Y").
- Public Markets: always include S&P 500 and Nasdaq levels today, what moved them, and 2-3 specific stocks with thesis and price levels.
- Healthcare/Kinnect Scout: if no orthodontic news today, cover the broader dental/DSO landscape, recent funding rounds in the space, or recruiting tech trends — always with specific company names and numbers.
- Tools & AI: evaluate each tool for Kinnect specifically — cost, setup time, whether Rene alone can implement it, yes/no verdict.

${kinnectContext}

Sections and raw content:
${sectionTexts.map((s) => `\n## ${s.title ?? "Section"}\n${(s.text ?? "").slice(0, 2500)}`).join("\n")}

Available sources per section:
${sourcesForPrompt}

OUTPUT FORMAT — valid JSON only, no markdown:
{
  "sections": [
    {
      "id": "section_id",
      "title": "exact section title from config",
      "tldr": "one bold sentence",
      "bullets": [
        "Paragraph 1 (4+ sentences: what, why, who, what next)",
        "Paragraph 2",
        "Paragraph 3",
        "Paragraph 4",
        "Paragraph 5",
        "So what for Kinnect: specific action referencing a named company/number from this section",
        "So what for Kinnect: specific decision or preparation item",
        "So what for Kinnect: specific watch item with a named trigger"
      ],
      "sources": [{"url": "exact url", "label": "what reader learns"}]
    }
  ]
}

You must output one section object for every section in the list above. No exceptions. Minimum 2,500 words total across all sections.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_tokens: 16000,
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("No LLM response for edition");

  const parsed = JSON.parse(raw) as { sections?: SectionContent[] };
  let sections = Array.isArray(parsed.sections) ? parsed.sections : [];

  // Some LLM runs occasionally add a trailing, empty "So what / Conclusions" section with just a heading.
  // Drop any section that looks like that: title/id mentions "conclusion" or "so what" and it has no real content.
  sections = sections.filter((sec) => {
    const title = (sec.title ?? "").toLowerCase();
    const id = (sec.id ?? "").toLowerCase();
    const hasContent =
      (sec.tldr && sec.tldr.trim().length > 0) ||
      (Array.isArray(sec.bullets) && sec.bullets.some((b) => String(b ?? "").trim().length > 0));
    if (!hasContent && (title.includes("conclusion") || title.includes("so what"))) {
      return false;
    }
    return true;
  });

  for (const sec of sections) {
    const meta = sectionTexts.find((m) => m.id === sec.id);
    if (sec.sources?.length) {
      // LLM provided descriptive labels; keep them (urls must match our RSS)
      sec.sources = sec.sources.filter((s) => s.url && s.label);
    }
    if (!sec.sources?.length && meta?.links?.length) sec.sources = meta.links;
  }

  const usage: any = response.usage;
  const inputTokens = usage?.input_tokens ?? 0;
  const outputTokens = usage?.output_tokens ?? 0;
  return { sections, inputTokens, outputTokens };
}

/** Format edition date as "The Reno Times – Tuesday, Feb 18, 2026". */
export function editionTitle(date: Date): string {
  const day = date.toLocaleDateString("en-US", { weekday: "long" });
  const rest = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `The Reno Times – ${day}, ${rest}`;
}
