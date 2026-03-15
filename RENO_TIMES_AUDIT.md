# Reno Times – Full Project Audit (Export for Redesign)

This document is a structured dump of everything relevant to the Reno Times daily newspaper feature and the surrounding app, for use by another AI or team to diagnose issues and redesign the output.

---

## 1. Full file tree (with one-line descriptions)

### Root
- `package.json` – NPM dependencies and scripts
- `package-lock.json` – Lockfile
- `tsconfig.json` – TypeScript config
- `next.config.ts` – Next.js config
- `postcss.config.mjs` – PostCSS/Tailwind
- `eslint.config.mjs` – ESLint
- `ecosystem.config.cjs` – PM2 config for VPS
- `.gitignore` – Git ignore
- `tatus` – Stray file (likely typo; unused)

### .cursor
- `.cursor/settings.json` – Cursor editor settings (Notion plugin, etc.)

### public
- `public/file.svg`, `public/vercel.svg`, `public/window.svg` – Static assets

### Docs (root)
- `README.md` – Main project readme
- `FULL_SETUP_INSTRUCTIONS.md` – Notion, env, Reno Times one-time setup
- `RUN_LOCALLY.md` – Run app locally (no Vercel)
- `COMPLETE_LOCAL_FLOW.md` – Flow overview + automation
- `VPS_SETUP.md` – Hetzner VPS deploy + PM2 + cron
- `OPTION_A_TUNNEL_ON_VPS.md` – Cloudflare tunnel on VPS (HTTPS)
- `HTTPS_STEPS_FROM_2.md`, `HTTPS_FOR_NOTION_EMBED.md`, `ALWAYS_ON_HTTPS_AND_EMBED.md` – HTTPS/embed notes
- `EXACT_STEPS_RUN_NOW_AND_7AM_EST.md` – One-click Run now + 7 AM EST cron
- `COST_TRACKER.md` – Cost tracking template

### Scripts
- `scripts/deploy-vps.sh` – Deploy/update on VPS
- `scripts/reno-times-preview.mjs` – Calls `/api/daily-briefing?preview=1`

### App (Next.js App Router)
- `app/layout.tsx` – Root layout
- `app/globals.css` – Global styles
- `app/page.tsx` – Summarizer UI
- `app/clarify/page.tsx` – Clarify UI
- `app/research/page.tsx` – Research UI
- `app/dashboard/page.tsx` – Usage/cost dashboard
- `app/reno-times/page.tsx` – Reno Times hub (Run now, Notion link)

### API routes
- `app/api/summarize/route.ts` – Summarize (extract + LLM)
- `app/api/tts/route.ts` – OpenAI TTS
- `app/api/notion/save/route.ts` – Save to Notion
- `app/api/usage/route.ts` – Usage stats for dashboard
- `app/api/clarify/route.ts` – Clarify (snippet + question → answer)
- `app/api/research/route.ts` – Research (question → answer)
- **`app/api/daily-briefing/route.ts`** – **Reno Times daily newspaper**
- `app/api/reno-times/settings/route.ts` – Notion URL + Run-now URL for hub

### Lib
- `lib/summarize-llm.ts` – Summarizer prompts + chunking + OpenAI
- `lib/extract-text.ts` – Extract text from URL/paste/file/Spotify
- `lib/notion.ts` – Notion: save, Reno Times upsert, front page update
- `lib/notion-categorize.ts` – Area/categorization
- **`lib/daily-briefing.ts`** – **Reno Times: RSS + one big LLM prompt + parse**
- **`lib/daily-briefing-config.ts`** – **Reno Times section config (ids, titles, RSS URLs)**
- `lib/usage.ts` – Usage tracking for dashboard
- `lib/spotify.ts` – Spotify API + YouTube/RSS transcript helpers (partially stubbed)

---

## 2. Daily-briefing API endpoint – full code

**File:** `app/api/daily-briefing/route.ts`

```typescript
import { NextResponse } from "next/server";
import {
  updateRenoTimesFrontPage,
  upsertRenoTimesEdition,
} from "@/lib/notion";
import {
  buildEditionSections,
  editionTitle,
  type SectionContent,
} from "@/lib/daily-briefing";
import { recordLlmUsage } from "@/lib/usage";

export const maxDuration = 300;

function richText(content: string | undefined) {
  const text = typeof content === "string" ? content : "";
  return [{ type: "text" as const, text: { content: text.slice(0, 2000) } }];
}

function heading2(content: string) {
  return {
    object: "block" as const,
    type: "heading_2" as const,
    heading_2: { rich_text: richText(content) },
  };
}

function paragraph(content: string) {
  return {
    object: "block" as const,
    type: "paragraph" as const,
    paragraph: { rich_text: richText(content) },
  };
}

function bulletedItem(content: string) {
  return {
    object: "block" as const,
    type: "bulleted_list_item" as const,
    bulleted_list_item: { rich_text: richText(content) },
  };
}

function paragraphWithLinks(links: { label?: string; url?: string }[] | undefined): object {
  const parts: { type: "text"; text: { content: string; link?: { url: string } } }[] = [];
  const valid = (links ?? []).filter((l) => l && typeof l.url === "string" && l.url.trim()).slice(0, 6);
  if (valid.length === 0) {
    return { object: "block" as const, type: "paragraph" as const, paragraph: { rich_text: [{ type: "text" as const, text: { content: "" } }] } };
  }
  parts.push({ type: "text", text: { content: "Read further: " } });
  valid.forEach((l, i) => {
    if (i > 0) parts.push({ type: "text", text: { content: " · " } });
    parts.push({
      type: "text",
      text: { content: (l.label || "Source").slice(0, 100), link: { url: (l.url || "").slice(0, 2000) } },
    });
  });
  return {
    object: "block" as const,
    type: "paragraph" as const,
    paragraph: { rich_text: parts },
  };
}

function sectionToBlocks(section: SectionContent): object[] {
  const blocks: object[] = [];
  const title = typeof section.title === "string" ? section.title : "Section";
  const tldr = typeof section.tldr === "string" ? section.tldr : "";
  blocks.push(heading2(title));
  blocks.push(paragraph(tldr));

  const bullets = Array.isArray(section.bullets) ? section.bullets : [];
  let soWhatIndex = bullets.findIndex(
    (b) => typeof b === "string" && (b.toLowerCase().includes("so what") || b.toLowerCase().includes("actionables"))
  );
  if (soWhatIndex < 0 && bullets.length >= 4) {
    soWhatIndex = Math.max(bullets.length - 2, 1);
  }
  const contentBullets = soWhatIndex >= 0 ? bullets.slice(0, soWhatIndex) : bullets;
  const soWhatBullets = soWhatIndex >= 0 ? bullets.slice(soWhatIndex) : [];

  for (const b of contentBullets) {
    const str = typeof b === "string" ? b : String(b ?? "");
    if (str.trim()) blocks.push(paragraph(str));
  }
  if (soWhatBullets.length > 0) {
    blocks.push(heading3("So what for you / Actionables"));
    for (const b of soWhatBullets) {
      const str = typeof b === "string" ? b : String(b ?? "");
      if (str.trim()) blocks.push(bulletedItem(str.replace(/^So what\s*\/?\s*Actionables\s*:?\s*/i, "").trim() || str));
    }
  }
  if (section.sources?.length) {
    blocks.push(paragraphWithLinks(section.sources));
  }
  return blocks;
}

function heading3(content: string) {
  return {
    object: "block" as const,
    type: "heading_3" as const,
    heading_3: { rich_text: richText(content) },
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = (searchParams.get("secret") ?? "").trim();
  const cronSecret = (process.env.CRON_SECRET ?? "").trim();
  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json(
      { error: "Unauthorized", hint: "The secret in the URL must exactly match CRON_SECRET. Locally: .env.local then restart (Ctrl+C, npm run dev). On VPS: .env then pm2 restart reno-times." },
      { status: 401 }
    );
  }

  const isPreview = searchParams.get("preview") === "1";
  const newspaperId = process.env.NOTION_NEWSPAPER_DATABASE_ID;
  if (!isPreview && !newspaperId) {
    return NextResponse.json(
      { error: "NOTION_NEWSPAPER_DATABASE_ID must be set. See FULL_SETUP_INSTRUCTIONS.md." },
      { status: 400 }
    );
  }

  try {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const title = editionTitle(now);

    const { sections, inputTokens, outputTokens } = await buildEditionSections();

    if (isPreview) {
      return NextResponse.json({
        preview: true,
        title,
        date: dateStr,
        editionDateLabel: now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
        sections: sections.map((s) => ({ id: s.id, title: s.title, tldr: s.tldr, bullets: s.bullets ?? [], sources: s.sources ?? [] })),
      });
    }

    if (!isPreview && (inputTokens > 0 || outputTokens > 0)) {
      recordLlmUsage(inputTokens, outputTokens, "daily_briefing");
    }

    const runNowUrl = (process.env.RENO_TIMES_RUN_NOW_URL ?? "").trim();
    const appBaseUrl = runNowUrl ? runNowUrl.replace(/\?.*$/, "").replace(/\/api\/daily-briefing\/?$/, "").replace(/\/$/, "") : "";
    const clarifyUrl = appBaseUrl ? `${appBaseUrl}/clarify` : "";
    const frontPageId = (process.env.NOTION_RENO_TIMES_FRONT_PAGE_ID ?? "").trim();

    const actionLinksBlock = runNowUrl
      ? {
          object: "block" as const,
          type: "paragraph" as const,
          paragraph: {
            rich_text: [{
              type: "text" as const,
              text: { content: "Generate today's edition", link: { url: (runNowUrl + (runNowUrl.includes("?") ? "&" : "?") + "redirect=1").slice(0, 2000) } },
            }],
          },
        } as object
      : null;

    const editionDateLabel = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const editionDateBlock = {
      object: "block" as const,
      type: "callout" as const,
      callout: {
        icon: { type: "emoji" as const, emoji: "📅" as const },
        rich_text: [{ type: "text" as const, text: { content: editionDateLabel } }],
        color: "gray_background" as const,
      },
    } as object;

    const sectionBlocks: object[] = [];
    for (const section of sections) {
      sectionBlocks.push(...sectionToBlocks(section));
    }

    const editionChildren: object[] = [];
    editionChildren.push(editionDateBlock);
    if (actionLinksBlock) editionChildren.push(actionLinksBlock);
    editionChildren.push({ object: "block" as const, type: "divider" as const, divider: {} } as object);
    editionChildren.push(...sectionBlocks);

    const { url } = await upsertRenoTimesEdition({ title, date: dateStr, children: editionChildren });

    const frontPageChildren: object[] = [...editionChildren];
    if (clarifyUrl && frontPageId) {
      const clarifyEmbedUrl = `${clarifyUrl}?appendTo=${encodeURIComponent(frontPageId)}`;
      frontPageChildren.push({
        object: "block" as const,
        type: "heading_3" as const,
        heading_3: { rich_text: [{ type: "text" as const, text: { content: "Clarify a section" } }] },
      } as object);
      frontPageChildren.push({
        object: "block" as const,
        type: "embed" as const,
        embed: { url: clarifyEmbedUrl.slice(0, 2000) },
      } as object);
    }

    try {
      await updateRenoTimesFrontPage(frontPageChildren);
    } catch (e) {
      console.error("Front page update failed (set NOTION_RENO_TIMES_FRONT_PAGE_ID to enable):", e);
    }

    const wantRedirect = searchParams.get("redirect") === "1" || searchParams.get("redirect") === "true";
    const notionFrontPageId = (process.env.NOTION_RENO_TIMES_FRONT_PAGE_ID ?? "").trim();
    if (wantRedirect && notionFrontPageId) {
      return NextResponse.redirect(`https://www.notion.so/${notionFrontPageId.replace(/-/g, "")}`, 302);
    }

    return NextResponse.json({
      ok: true,
      message: "Today's Reno Times edition replaced (one edition per day). Front page and Editions updated.",
      editionUrl: url,
      editionTitle: title,
      date: dateStr,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Daily briefing failed";
    console.error("Daily briefing error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

---

## 3. All AI prompts (exact strings, variable name, file, line)

### 3.1 Reno Times daily newspaper

**File:** `lib/daily-briefing.ts`  
**Variable:** `prompt` (used in `messages: [{ role: "user", content: prompt }]`)

```
You are writing The Reno Times, a daily briefing newsletter modeled after Finimize, Morning Brew, and TLDR. Digestible but with enough context that Rene fully understands each point. This should be the only news he needs to read each day (full context + what to do). Assume he will NOT click the sources unless he really has to: you must bring all the key facts, numbers, and context into the newsletter itself. Total read target: ~15–20 minutes, but it is OK to go longer if needed for completeness.

STYLE (Morning Brew / TLDR / Finimize):
- Each section: short headline, then TL;DR (one sentence), then 5–8 short PARAGRAPHS (not bare bullets). Each paragraph must give CONTEXT: what happened, why it matters, who it affects, and enough background so Rene can understand without reading the source. Think of each section as a mini deep-dive: after reading, Rene should be able to discuss that topic with anyone without further research.
- After the paragraphs in that section, add "So what for you / Actionables": 2–3 bullets specific to Rene/Kinnect—what to do, watch, or avoid and why. So-what lives at the end of EACH section only (no separate Conclusions section).
- Even on quieter days, still give substance: pull from recent moves, macro context, positioning, and what could happen next. Never output generic filler like "Nothing major today", "no major headlines", or "Quiet day—no major moves". Always give Rene specific, useful context and what to watch.
- When there IS news: give full context in 2–4 sentences per point so Rene fully understands, then the so-what bullets.

RULES:
1. Middle-school language: simple, clear, no jargon without explaining.
2. Every point specific—no filler. Say exactly what happened, why it matters, and what to do.
3. SO WHAT AT END OF EACH SECTION (REQUIRED): 2–3 bullets "So what for you / Actionables" for that section only.
4. INSTITUTIONAL MEMORY: Reference recent context where relevant. Be specific to Rene's company and life.
5. PUBLIC MARKETS: (a) Overall market – professional view (macro, indices, rates, catalysts). (b) Top stocks – 3–5 with thesis, risk, what to watch. Include key NUMBERS: recent moves (today, last week, last month) and important levels.
6. CRYPTO/MARKETS: Concrete levels, catalysts, what to do (e.g. "If BTC holds above X, watch Y"). Include key NUMBERS (price today, recent range, % move over last week/month). When a standard chart exists (e.g. BTC price last 30 days), describe what the chart would show (trend, levels) and include the best source URL for that chart in "sources".
7. TOOLS & AI: For each tool: what it is, how Rene/Kinnect could use it, cost, setup time, worth it? (yes/no + why).
8. SOURCE LINK LABELS: Descriptive label per link so Rene knows what he'll get when he clicks.
9. SECTION LIST IS FIXED: You must output exactly one section object for EACH section listed in "Sections and raw content" below. Do NOT drop sections, merge them, or add new ones. The "title" field in your JSON must exactly match the section titles provided (same spelling and punctuation).

${kinnectContext}

Sections and raw content:
${sectionTexts.map((s) => `\n## ${s.title ?? "Section"}\n${(s.text ?? "").slice(0, 2500)}`).join("\n")}

Available sources per section (use these exact URLs in your "sources" output; provide a descriptive "label" for each):
${sourcesForPrompt}

Output per section: TL;DR (one sentence), then 5–8 short paragraphs (each with full context so Rene understands—no bare bullets without explanation), then 2–3 bullets "So what for you / Actionables", then "sources" with url + descriptive label. Do NOT output a "Conclusions" section—so-what is at the end of each section only. You must return one JSON section object for EVERY section listed above (no section is optional).

Respond with valid JSON only (no markdown):
{
  "sections": [
    { "id": "section_id", "title": "Section Title", "tldr": "One sentence summary", "bullets": ["Paragraph 1: what happened and why.", "Paragraph 2: context and implications.", "So what / Actionables: what Rene should do/watch/avoid.", "So what / Actionables: ..."], "sources": [ { "url": "exact URL from list", "label": "Short phrase: what reader will learn" } ] },
    ...
  ]
}
```

**kinnectContext** (injected into prompt):
```
Kinnect context (for Healthcare + Kinnect Scout sections):
- Kinnect is a three-sided platform that matches traditionally underserved medical private practices with residents (starting with orthodontics).
- It modernizes recruiting with AI matching (preferences + culture/fit), retains users via guided mentorship, and enables knowledge/expertise exchange throughout a doctor's career lifecycle.
- Key pain points: prehistoric recruiting, private practices lose to hospitals, bad fits from centralized recruiting, headhunters cost ~15% of first-year salary, lack of mentors for private-practice realities, lack of always-on expertise channels.
```

**Model call:** `openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" }, max_tokens: 8000 })`

---

### 3.2 Summarizer (Blinkist-style)

**File:** `lib/summarize-llm.ts`  
**Variable:** `SYSTEM_PROMPT`

```
You are an expert summarizer and operator coach, like Blinkist but deeper, for one reader. Output exactly two main "pages" plus a front verdict.

User profile:
- You are speaking to a busy founder ("Rene") building a three-sided marketplace in the medical field (Kinnect).
- Rene does not want to read or listen to the full source. Your output has:
  (1) FRONT: Should Rene read/listen to the full source? Yes or No, and why or why not (2–4 clear reasons).
  (2) PAGE 1 – Deep summary (Blinkist-style): 5–8 SECTIONS. Each section has a short title and a body that goes INTO DEPTH on that part of the content (arguments, examples, frameworks, edge cases). Like Blinkist chapters: each section is standalone and deep enough that Rene fully understands. Use third person for the author/speaker; second person when addressing Rene. Paragraphs only within each section.
  (3) PAGE 2 – Founder takeaways: Just for Rene. Real-world applications: how to apply this to Kinnect, healthcare, marketplaces, and his life. Tactical and personal. 3–8 paragraphs. Like a mentor talking only to him.

Rules:
- No hallucinations: only facts, ideas, and examples clearly present in the text.
- Prioritize strategy, positioning, moat, growth, marketplace dynamics, pricing, retention, execution, hiring, leadership, mental models, and anything relevant to healthcare/medical or three-sided marketplaces.
- When the source is dense or academic, explain in plain English with a short example where it helps.

Respond only with valid JSON in this exact shape (no markdown, no extra text):
{
  "oneLiner": "Single sentence: the core idea or takeaway.",
  "quickTake": "2-4 sentences: what this is, why it matters, main implication for Rene.",
  "verdict": "Yes" or "No",
  "verdictReasons": ["Reason 1.", "Reason 2.", "2-4 reasons: why or why not read the full source."],
  "deepSummarySections": [
    { "title": "Section title (e.g. The main argument)", "body": "150-400 words. In-depth coverage of this part of the content. Paragraphs only. Standalone so Rene fully understands." },
    "5-8 sections total, Blinkist-style"
  ],
  "sourcesUsed": "Brief note on source type (e.g. long-form podcast, tactical blog).",
  "founderTakeaways": ["Paragraph 1: real-world application for Rene.", "Paragraph 2.", "3-8 paragraphs: for Rene only, Kinnect, healthcare, life."]
}
```

**Variable:** `CHUNK_PROMPT` (used when text is chunked)

```
You are helping summarize a long source for a busy founder.

Summarize THIS SECTION ONLY of a longer document:
- Capture all important ideas, facts, arguments, and examples in this chunk.
- Emphasize anything that looks like strategy, execution, markets, psychology, or other operator/entrepreneurial lessons.
- Write in second person ("you") and in simple, clear language.
- It is fine if the chunk summary is a few paragraphs long; do not skip key details just to be short.

Output plain text only (no JSON, no markdown).
```

---

### 3.3 Clarify

**File:** `app/api/clarify/route.ts`  
**Variable:** `SYSTEM_PROMPT`

```
You are helping a busy founder ("Rene") get quick clarification on something they highlighted—often from a news brief (e.g. The Reno Times) or any article.

You receive:
1. A snippet of text they selected (a sentence, paragraph, or bullet).
2. An optional question (e.g. "How does this affect Kinnect?" or "What does this mean for markets?"). If no question is given, explain what it means and how it could affect: their company (Kinnect), relevant markets, macro, and them personally/entrepreneurially.

Your job:
- Give a short, clear answer (sidebar-style: a few sentences or a few bullets). No long essays.
- Focus on: what this means, why it matters, and how it could affect the things they care about (Kinnect, healthcare, markets, macro, personal/financial).
- If the snippet is jargon or dense, explain it in plain English first, then add impact.
- Do not invent facts; base your answer on the snippet and general knowledge. If something is uncertain, say so.

Respond with valid JSON only, no markdown:
{
  "answer": "Your clarification: 2-6 sentences or equivalent in bullets, focused and scannable.",
  "bullets": ["Optional 2-4 short takeaways for saving to Notion.", "..."]
}
```

---

### 3.4 Research

**File:** `app/api/research/route.ts`  
**Variable:** `SYSTEM_PROMPT`

```
You are a research assistant for a busy founder ("Rene") building a three-sided marketplace in the medical field.

Your job:
- Answer the user's question accurately and in plain language.
- Break down complex concepts into simple, scannable parts.
- When relevant, explain how the answer affects: their company (Kinnect), markets, macro, personal decisions, or entrepreneurship/finance.
- If something is time-sensitive or depends on real-time data, say so clearly (e.g. "For the latest numbers, check ...").
- Do not invent facts or sources; if you're unsure, say so.
- Prefer structure: short paragraphs, bullet points where helpful.

Respond with valid JSON only, no markdown:
{
  "answer": "Full answer text, with paragraphs and optional bullets in plain text.",
  "bullets": ["Up to 5–8 short bullet takeaways for saving to Notion.", "..."]
}
```

---

## 4. Data sources (RSS, APIs, fetch)

### Reno Times RSS (lib/daily-briefing-config.ts + lib/daily-briefing.ts)

| Section ID        | Title                                      | Feed URL(s) |
|-------------------|--------------------------------------------|-------------|
| major_news        | Major / Big news (reports, launches, …)    | (none – LLM only) |
| crypto            | Crypto                                     | https://www.coindesk.com/arc/outboundfeeds/rss/ |
| public_markets    | Public Markets                             | https://feeds.content.dowjones.io/public/rss/mw_topstories, https://www.morningbrew.com/daily/rss, https://rss.nytimes.com/services/xml/rss/nyt/Business.xml |
| startups          | Startups / VC                              | https://techcrunch.com/feed/, https://tldr.tech/rss |
| healthcare        | Healthcare (Kinnect / DSOs / Practices)    | https://www.beckershospitalreview.com/rss.xml, https://www.modernhealthcare.com/rss.xml |
| kinnect_scout     | Kinnect Scout                              | (none – LLM from other sections) |
| tools_ai          | Tools & AI                                 | https://www.producthunt.com/feed, https://tldr.tech/rss |
| politics_global   | Politics & Global                          | https://rss.nytimes.com/services/xml/rss/nyt/World.xml, https://feeds.bloomberg.com/markets/news.rss |
| foreign_markets   | Foreign Markets                            | (optional, no feed in config) |

RSS is fetched via `rss-parser` in `lib/daily-briefing.ts` (`parser.parseURL(feedUrl)`). No API keys for RSS.

### Other fetches in the app

- **Article URL:** `lib/extract-text.ts` – `fetch(u, { headers: { "User-Agent": "Mozilla/5.0 (compatible; DeepSummarizer/1.0)" } })`
- **Spotify:** `lib/spotify.ts` – Token: `https://accounts.spotify.com/api/token`; API: `https://api.spotify.com/v1` (episodes, shows). Uses **SPOTIFY_CLIENT_ID**, **SPOTIFY_CLIENT_SECRET**.
- **Spotify oEmbed:** `lib/extract-text.ts` – `https://open.spotify.com/oembed?url=...`
- **YouTube:** via `youtube-transcript-plus` and `yt-search` (dynamic import); no API key in repo.

---

## 5. Output format logic (how the newspaper is built)

- **No HTML/markdown returned to the client.** The API either returns JSON (preview or success) or redirects to Notion.
- **Notion blocks** are built in `app/api/daily-briefing/route.ts`:
  1. **Per section** (`sectionToBlocks`): heading_2 (title) → paragraph (TL;DR) → N× paragraph (content) → optional heading_3 "So what for you / Actionables" → bulleted_list_item × M → optional "Read further" paragraph with links.
  2. **Edition body** (`editionChildren`): date callout → optional "Generate today's edition" paragraph → divider → all section blocks.
  3. **Front page** (`frontPageChildren`): same as edition, then (if clarify URL + front page ID set) heading_3 "Clarify a section" + embed block with Clarify URL and `?appendTo=<frontPageId>`.
- **Notion write:** `upsertRenoTimesEdition({ title, date: dateStr, children: editionChildren })` (finds or creates today’s row by date, then replaces page blocks); `updateRenoTimesFrontPage(frontPageChildren)` (deletes all blocks on front page, then appends the new blocks). Implementations in `lib/notion.ts`: `findTodayEditionPageId` (databases.query by Date), `updateRenoTimesEditionPage`, `createRenoTimesEdition`, `upsertRenoTimesEdition`, `updateRenoTimesFrontPage`.

---

## 6. Comments (TODO, FIXME, NOTE, "Rene")

- **TODO / FIXME / NOTE:** None found in the codebase.
- **"Rene"** appears only inside prompt strings and docs, not as code comments.

---

## 7. Environment variables (names, purpose, where used)

| Variable | Purpose | Where used |
|----------|---------|------------|
| OPENAI_API_KEY | OpenAI API key (LLM + TTS) | lib/summarize-llm.ts, lib/daily-briefing.ts, app/api/clarify/route.ts, app/api/research/route.ts, app/api/summarize/route.ts, app/api/tts/route.ts |
| NOTION_API_KEY | Notion integration secret | lib/notion.ts |
| NOTION_DATABASE_ID | Knowledge Bank database ID | lib/notion.ts |
| NOTION_NEWSPAPER_DATABASE_ID | Reno Times – Editions database ID | lib/notion.ts, app/api/daily-briefing/route.ts |
| NOTION_RENO_TIMES_FRONT_PAGE_ID | Reno Times front page (overwritten each run) | lib/notion.ts, app/api/daily-briefing/route.ts, app/api/reno-times/settings/route.ts |
| CRON_SECRET | Secret for /api/daily-briefing?secret=... | app/api/daily-briefing/route.ts, scripts/reno-times-preview.mjs |
| RENO_TIMES_RUN_NOW_URL | Full Run-now URL (HTTPS + secret); used for "Generate today's edition" link and Clarify base | app/api/daily-briefing/route.ts, app/api/reno-times/settings/route.ts |
| SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET | Spotify API (episode metadata, etc.) | lib/spotify.ts |
| NEXTAUTH_SECRET, NEXTAUTH_URL | NextAuth (README only; used if auth enabled) | README.md |
| PREVIEW_BASE_URL | Base URL for preview script | scripts/reno-times-preview.mjs |
| PORT | Server port (docs/VPS) | VPS_SETUP.md etc. |

---

## 8. Project-level instructions / Cursor

- **.cursorrules:** Not present.
- **.cursor/settings.json:** `{ "plugins": { "notion-workspace": { "enabled": true } } }` – no Reno Times–specific rules.

---

## 9. What’s broken or incomplete

- **Spotify transcript pipeline:** In `lib/spotify.ts`, `getRSSFeedUrl()` and `fetchTranscriptFromRSS()` return `null` with comments "Will implement RSS discovery" / "Placeholder - needs RSS feed URL discovery". RSS transcript path is not implemented.
- **Console logging:** `lib/spotify.ts` has multiple `console.log` / `console.error` in Spotify→YouTube and transcript code (e.g. `[Spotify→YouTube] Searching for: ...`). `app/api/daily-briefing/route.ts` logs only on front-page update failure.
- **Docs vs code:** Several docs (e.g. FULL_SETUP_INSTRUCTIONS.md, RUN_LOCALLY.md, COMPLETE_LOCAL_FLOW.md) still describe a two-column front page with "View all editions" on the right and "creates a new row" each run. Code now: no "View all editions" block; one row per day via upsert. Docs should be updated to match.
- **Unused:** `listNewspaperEditionPageIds()` in `lib/notion.ts` is documented as "Currently unused"; no other dead code noted.

---

## 10. Vision / docs (short refs; full text in repo)

- **README.md** – Project overview, tech stack, setup, API, TTS, history, pointers to FULL_SETUP_INSTRUCTIONS, RUN_LOCALLY, VPS_SETUP, COST_TRACKER, COMPLETE_LOCAL_FLOW.
- **FULL_SETUP_INSTRUCTIONS.md** – Notion integration, Knowledge Bank + Reno Times – Editions DBs, sharing and IDs, .env vars, terminal run, GitHub push, how Reno Times works (front page + editions), Vercel deploy, cron, optional Notion embed. (Some wording still reflects old “new row each time” and “View all editions” layout.)
- **COMPLETE_LOCAL_FLOW.md** – Summarizer flow, Reno Times flow, automation (Launchd, reminder, cron), comparison Vercel vs local, next steps.
- **VPS_SETUP.md** – Hetzner server, Node/PM2, clone, .env, build, PM2, cron (e.g. 7 AM), Run-now link, front page ID, troubleshooting.
- **OPTION_A_TUNNEL_ON_VPS.md** – Cloudflare tunnel on VPS, correct URL format, cloudflared install, systemd service, .env RENO_TIMES_RUN_NOW_URL, Notion embed.
- **EXACT_STEPS_RUN_NOW_AND_7AM_EST.md** – One-click Run now (env on VPS), 7 AM EST cron line.
- **RUN_LOCALLY.md** – What “running locally” means, step-by-step run, daily-briefing URL, note on “View all editions” (doc still describes old layout).
- **COST_TRACKER.md** – Monthly cost table, VPS + OpenAI breakdown, usage table, decision thresholds, optimization tips.

All of the above files live in the repo root; this audit does not duplicate their full text so you can open them directly. This document is the single export you can hand to Claude (or another tool) to redesign the Reno Times system.
