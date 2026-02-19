/**
 * The Reno Times – section and source config.
 * Edit here in Cursor to add/remove sections or change RSS feeds;
 * the daily-briefing API and Notion output will follow this config.
 */

export type SectionId =
  | "crypto"
  | "public_markets"
  | "startups"
  | "healthcare"
  | "kinnect_scout"
  | "tools_ai"
  | "politics_global"
  | "foreign_markets"
  | "conclusions";

export type SectionConfig = {
  id: SectionId;
  title: string;
  /** RSS feed URL or API endpoint (free sources preferred). */
  feedUrl?: string;
  /** When true, only include a blurb when something important that day. */
  optional?: boolean;
};

export const RENO_TIMES_SECTIONS: SectionConfig[] = [
  { id: "crypto", title: "Crypto", feedUrl: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { id: "public_markets", title: "Public Markets", feedUrl: "https://feeds.content.dowjones.io/public/rss/mw_topstories" },
  { id: "startups", title: "Startups / VC", feedUrl: "https://techcrunch.com/feed/" },
  { id: "healthcare", title: "Healthcare (Kinnect / DSOs / Practices)" },
  {
    id: "kinnect_scout",
    title: "Kinnect Scout (Competitors, threats, moves to watch)",
  },
  {
    id: "tools_ai",
    title: "Tools & AI (new workflows, marketing, ops upgrades)",
    feedUrl: "https://www.producthunt.com/feed",
  },
  { id: "politics_global", title: "Politics & Global (market impact)" },
  { id: "foreign_markets", title: "Foreign Markets", optional: true },
  { id: "conclusions", title: "Conclusions / So what?", optional: false },
];

/** Notion database ID for "The Reno Times – Editions" (one row per day). Set in .env as NOTION_NEWSPAPER_DATABASE_ID when you're ready. */
export const NEWSPAPER_DB_ENV_KEY = "NOTION_NEWSPAPER_DATABASE_ID";

/** Format for every section: TL;DR first (1–2 sentences), then bullets or 1–3 short paragraphs; include "So what for you" and "What could happen next." See RENO_TIMES_SPEC.md. */
export const RENO_TIMES_FORMAT =
  "Each section: start with a TL;DR (headline-style, 1–2 sentences). Then 2–5 bullets or 1–3 short paragraphs. Include what this means for the reader (Kinnect, markets, macro, personal, entrepreneur/financial) and what could happen next. No long prose unless needed to understand.";
