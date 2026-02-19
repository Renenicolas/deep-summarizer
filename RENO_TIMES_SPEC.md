# The Reno Times – daily newspaper spec

This document describes how **The Reno Times** (your personal daily briefing) should work and how to extend it from the codebase.

---

## Goal

- **One Notion page** ("The Reno Times") that always shows **today's** edition of The Reno Times via a linked database view filtered to today.
- Each morning, a **new edition** is created with **day + date** in the title (e.g. *The Reno Times – Thursday, Feb 13, 2026*) in **"The Reno Times – Editions"** database.
- All editions stay in the Editions database; the front page view automatically shows only today's. Click **"View all editions"** to browse past editions.
- Run **as early as possible** (e.g. 5–6 AM), as soon as key sources publish.

---

## Format: TL;DR newspaper style

**Every section must be structured for speed first, detail only when needed.**

- **Lead with a TL;DR** – One headline-style sentence (or 1–2 short sentences) that captures the main point. You should get the important takeaway in under 10 seconds.
- **Then bullets or very short paragraphs** – 2–5 bullets or 1–3 short paragraphs with only the detail needed to understand and act. No long prose unless it's necessary to explain a connection or a nuance.
- **Always include** – What this could mean for: Kinnect, markets you care about, macro, your personal life, entrepreneurship, or finances. When relevant, add **What could happen next** (how this might play out or affect those areas in the future).
- **Connections** – Briefly tie any piece to other sections or to things Rene cares about (e.g. "This could tighten funding for DSOs" or "Worth watching for your portfolio").

Use full paragraphs only when the idea is complex and a quick bullet wouldn't be enough to really understand it. Otherwise: TL;DR first, then scannable bullets, then "So what for you" and "What could happen next."

---

## Sections (with conclusions and impact)

Every section should help you **draw conclusions**: what will this news do, and how could it affect:

- Your company (Kinnect)
- Markets (crypto, public markets, macro)
- Your personal life
- Entrepreneurship and financial decisions

Planned sections (each in TL;DR + bullets/short detail format above):

1. **Crypto** – major moves, narratives, regulation, onchain. TL;DR → bullets → impact/future.
2. **Public markets** – equities, macro, rates, tech, healthcare stocks, "crazy movers." TL;DR → bullets → impact/future.
3. **Startups / VC** – funding, trends, operator-relevant news. TL;DR → bullets → impact/future.
4. **Healthcare** – Kinnect-relevant: private practices, DSOs, dentistry, reimbursement, practice M&A, competition, tailwinds. TL;DR → bullets → impact/future.
5. **Kinnect Scout** – competitors, threats, market opportunities specific to Kinnect's value offering to its three user types. TL;DR → bullets → impact/future.
6. **Tools & AI** – new tools (AI developments, workflow tools, marketing, leads) relevant to Kinnect's operations, efficiency, and performance, with clear explanations of *how they can help*. TL;DR → bullets → impact/future.
7. **Politics / global** – enough to stay informed and see **market impact** (e.g. elections, trade, rates, fiscal policy). TL;DR → bullets → what it means for markets and for you.
8. **Foreign markets** – short blurb when something important that day (e.g. Asia/Europe moves that affect US or your positions). TL;DR only + 1–3 bullets if needed.
9. **Conclusions / So what?** – 3–5 bullets only: impact on Rene, Kinnect, macro, personal, entrepreneur/financial, and what to watch next.

---

**Example section (Crypto):**

**TL;DR:** Bitcoin held above $X as ETF flows turned positive; SEC delayed decision on [X]. Risk-on for the week.

- ETF net inflows $Y over 5 days; [fund name] led.  
- [Company] announced [thing]; stock +Z%.  
- **So what for you:** [One line on portfolio/macro/Kinnect if relevant.]  
- **What could happen next:** [1–2 sentences: e.g. "If flows hold, we could see …" or "Watch [event] for …".]

---

## News sources

- Prefer **free** sources (RSS, free tiers, public APIs).
- If a **paid** source is essential for what you care about, we'll call it out so you can subscribe or reroute to email; we won't assume paid APIs without telling you.

Examples of free sources we can use:

- **Crypto:** CoinDesk, CoinTelegraph (RSS), onchain data summaries.
- **Markets:** Yahoo Finance, Reuters, Bloomberg (free headlines/RSS where available).
- **Startups:** TechCrunch, The Information (if you have access), VC newsletters (free tiers).
- **Healthcare:** industry RSS, press releases, trade headlines.
- **Politics / global:** Reuters, BBC, NPR (RSS).

Exact feeds and APIs will be configured in code (see below) so you can add/remove in Cursor and redeploy.

---

## Notion structure

**Structure: Front page + Editions database**

1. **"The Reno Times – Editions" database** – holds **all editions** (current and past). Each row = one day's edition (title: *The Reno Times – [Day], [Date]*). Body = full newspaper content (sections as blocks).

2. **"The Reno Times" page** (your front page) – a separate Notion PAGE that shows **only today's edition**:
   - On this page, add a **linked database view** of "The Reno Times – Editions".
   - Filter the view: **Date = Today** (or sort by Date descending, limit to 1 row).
   - Below the linked view, add a link: **"View all editions"** → links to the full "The Reno Times – Editions" database.

3. **How it works:**
   - When the cron runs, it creates a **new row** in the Editions database for today.
   - Your front page automatically shows only today's edition because the linked view is filtered to today.
   - All past editions remain in the Editions database; click **"View all editions"** to browse them.

Result: **"The Reno Times"** page = today's edition only (front page). **"The Reno Times – Editions"** database = full archive accessible via the "View all editions" link.

---

## Timing (cron)

- Run **once per day**, as early as sources allow (e.g. **5–6 AM** your time).  
- Use **Vercel Cron** (if deployed on Vercel) or an external cron (e.g. cron-job.org) that hits a protected route like `GET/POST /api/daily-briefing?secret=...`.
- The route will:
  1. Fetch from configured RSS/APIs.
  2. Summarize and write "conclusions / impact" per section (and for "So what?").
  3. Create one new Notion page in **The Reno Times – Editions** database with title *The Reno Times – [Day], [Date]* and body = sections.
  4. All editions stay in the Editions database; the front page view (filtered to today) automatically shows only today's edition.

---

## Making it adjustable from Cursor

- **Sections:** Keep a **config** (e.g. `lib/daily-briefing-config.ts` or `app/api/daily-briefing/config.ts`) that lists section names, RSS/API endpoints, and prompts. Add/remove sections or sources there; the daily-briefing route reads this config.
- **Notion:** One database ID for "Editions" (e.g. `NOTION_NEWSPAPER_DATABASE_ID`). Property names (e.g. Name, Date, Body) stay in sync with what the API writes (document in this file).
- **Conclusions:** The summarization prompt for each section and for "So what?" is in code; change the prompt in Cursor to emphasize markets, Kinnect, macro, personal, entrepreneur/financial impact, and the app will reflect that in Notion and in the response.

When you think of new sections or sources, add them in Cursor in the config and (if needed) in the Notion database; no need to change Notion by hand every time if we keep property names stable.

---

## Implementation status

- **Spec (this file):** Done.  
- **Cron + fetcher + Notion writer:** Implemented. Daily briefing creates new editions in the Editions database; all editions stay there. Front page shows only today's via filtered linked view.

---

## Books: how to add content

Right now you can add **books** in two ways:

1. **PDF upload** – use the **Upload File** tab and select a PDF.  
2. **Paste text** – use the **Paste Text** tab and paste from Kindle, Apple Books, or any other source.

Other formats (e.g. EPUB) can be added later if you want; the app would need an EPUB parser and then the same summarization pipeline.
