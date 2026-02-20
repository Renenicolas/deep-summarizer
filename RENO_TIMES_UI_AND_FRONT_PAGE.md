# Reno Times: Front Page, Icon, Links & Vercel Error

## What’s Implemented

1. **Newspaper icon** – Every new edition row in The Reno Times – Editions database is created with the newspaper emoji icon.
2. **Source links** – Each section has a “Read further:” line with blue links (e.g. CoinDesk, TechCrunch) to the source articles.
3. **Front page = today’s newsletter** – You can have one Notion page that always shows **today’s full newsletter**. The cron clears that page and writes the new edition there each day. You open that page to read; you use a separate “View all editions” link to open the database/archives.

---

## Front Page Setup (newsletter on one page)

1. **Create a Notion page**
   - In Notion, create a new page.
   - Name it e.g. **“The Reno Times”** or **“Today’s Edition”**.
   - This will be the page that shows the daily newsletter (not the database).

2. **Get the page ID**
   - Open that page.
   - Copy the URL. It looks like:  
     `https://www.notion.so/YourWorkspace/Your-Page-TITLE-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - The **32-character block at the end** (with or without hyphens) is the page ID.  
     Example: `a1b2c3d4e5f6789012345678abcdef12`.

3. **Add env var**
   - In **Vercel**: Project → **Settings** → **Environment Variables**.
   - Add:
     - **Name:** `NOTION_RENO_TIMES_FRONT_PAGE_ID`
     - **Value:** the page ID from step 2 (e.g. `a1b2c3d4e5f6789012345678abcdef12`).
   - Save and **redeploy** (Deployments → … → Redeploy).

4. **Share the page with the integration**
   - In Notion, open that page → **⋯** (top right) → **Connections** → add your DeepSummarizer (or same) integration.

5. **Add “View all editions”**
   - On that same page, type `/link` and add a link to your **The Reno Times – Editions** database.
   - Label it e.g. **“View all editions”** or **“Archives”**.

After the next cron run (or after you trigger the daily-briefing URL manually), that page will show today’s full newsletter. Each day the cron replaces the content with the new edition.

---

## Vercel Summarize Error (“An error o... is not valid JSON”)

If you still see that error when using **Summarize** on the Vercel app:

1. **Check environment variables**
   - Vercel → your project → **Settings** → **Environment Variables**.
   - Ensure **`OPENAI_API_KEY`** is set (same value as in `.env.local`).
   - No typos; no extra spaces.

2. **Redeploy**
   - **Deployments** → latest deployment → **⋯** → **Redeploy**.
   - Wait for the build to finish, then try Summarize again.

3. **If it still fails**
   - The app now returns JSON for all errors and shows a clearer message (e.g. “OPENAI_API_KEY is not set in Vercel…”).
   - If you see that, add or fix the variable and redeploy again.

---

## Cron / Feb 19 Edition

If you saw the Feb 19 newspaper in Notion, the daily-briefing API ran successfully (either from the cron or from you opening the daily-briefing URL in the browser). So the cron setup is working; you can keep it as is.

---

## Newsletter Content

The prompt for The Reno Times has been updated so that:

- Language is simple (middle-school level).
- Every point has a clear “so what” for you/Kinnect.
- Insights are specific and actionable, not generic.
- Tools/AI section includes: what it is, how you can use it, cost, setup time, integration, and whether it’s worth it.
- Conclusions give 4–6 concrete actionables (what to do, watch, or avoid).

New editions will follow this style. Existing rows in the database are unchanged; only new editions (from the next run onward) get the new format and the “Read further” links.
