# Notion databases – two separate databases

You use **two separate Notion databases**:

1. **Knowledge Bank** – Summaries (Blinkist-style), standalone research, standalone clarifications. One row per summary or per research/clarify when you don’t attach it to an existing page.
2. **The Reno Times – Editions** – Only daily newspaper editions. One row per day.

**Follow-ups stay on the same row:** When you use **Clarify** or **Research** and choose “Add to existing page” (paste a Notion page URL), the app **appends** the clarification or research to that page. It does **not** create a new row. So follow-up clarifications and research are attributed to the same Reno Times edition or summary row.

---

## Database 1: Knowledge Bank

Use this for: summaries from the Summarizer, research answers and clarifications that are **not** added to an existing page.

### Copy-paste prompt for Notion AI (or follow manually)

**Create a new full-page database with these exact properties:**

1. **Name** (Title) – default first column; keep the name **Name**.
2. **Area** (Select) – single select. Add exactly these options (no Daily Briefing – that lives in Reno Times – Editions):
   - Kinnect
   - Entrepreneurship (general)
   - Crypto / Web3
   - Public Markets / Equities
   - Startups / VC
   - Politics / Global
   - Research / Q&A
   - Other

3. **Topic Tags** (Multi-select) – add at least: Marketing, Strategy, Scaling, Leadership, Operations, Healthcare, Mental Models, Macro, DSOs, Dentistry, Startups, Crypto, Growth, Ops, GTM, Product, Sales, Other.

4. **Content Type** (Select) – Podcast, Book, Article, News, Report, Research / Q&A, Other.

5. **Source URL** (URL) – optional.

6. **Re-read** (Checkbox) – optional.

7. **Key Insights** (Text or AI autofill) – optional; the app does not set this.

8. **Status** (Select) – optional, e.g. To Read, Read, Archived; the app does not set this.

**Do not add a Date property** for Knowledge Bank; the app does not use it.

**Database name:** e.g. **Knowledge Bank** or **Knowledge & Takeaways**.

**Env:** Put this database’s ID in `.env.local` as **NOTION_DATABASE_ID**.

---

## Database 2: The Reno Times – Editions

Use this **only** for daily newspaper editions. One row per day.

### Properties (simplest setup)

- **Name** (Title) – e.g. “The Reno Times – Thursday, Feb 13, 2026”.
- **Date** (Date) – the edition date.

The page **body** holds the full newspaper content (sections). When the daily briefing is implemented, the app will create one new row here per day.

**Env:** Put this database’s ID in `.env.local` as **NOTION_NEWSPAPER_DATABASE_ID** (when you’re ready to use The Reno Times).

---

## When things go where

| Action | Where it goes |
|--------|----------------|
| Save summary from Summarizer | New row in **Knowledge Bank** |
| Save research answer (no “Add to page”) | New row in **Knowledge Bank** |
| Save clarification (no “Add to page”) | New row in **Knowledge Bank** |
| Clarify / Research with “Add to existing page” | **Appended to that page** (no new row). Use the Reno Times or a Knowledge Bank row URL. |
| Daily Reno Times edition (when implemented) | New row in **Reno Times – Editions** |

This keeps Reno Times and Knowledge Bank separate and avoids extra rows for follow-ups.
