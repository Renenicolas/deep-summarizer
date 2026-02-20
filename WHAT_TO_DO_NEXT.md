# What You Still Need To Do – Exact Steps

Follow these in order. Everything is one-time setup except step 6 (optional test).

---

## Step 1: Push Code Changes

1. Open **Terminal**.
2. Go to your project folder:
   ```bash
   cd /Users/renenicolas/Desktop/deep-summarizer
   ```
3. Stage and commit:
   ```bash
   git add .
   git commit -m "Reno Times: descriptive links, section So what, public markets structure, front page"
   ```
4. Push to GitHub:
   ```bash
   git push
   ```
5. Wait for **Vercel** to finish deploying (or go to Vercel → Deployments and confirm the latest deploy is done).

---

## Step 2: Fix the Summarize Error on Vercel (If You Still See It)

1. Go to **https://vercel.com** and open your **deep-summarizer** (or your app) project.
2. Click **Settings** → **Environment Variables**.
3. Check that **OPENAI_API_KEY** exists and has the **exact same value** as in your `.env.local` (starts with `sk-`). Fix or add it if needed.
4. Click **Save**.
5. Go to **Deployments** → click **⋯** on the latest deployment → **Redeploy**.
6. Wait for the redeploy to finish, then open your Vercel app URL and try **Summarize** again. You should get a result or a clear JSON error message.

---

## Step 3: Create the Reno Times Front Page in Notion

1. In **Notion**, create a **new page** (not inside the database).
2. Name it e.g. **"The Reno Times"** or **"Today's Edition"**.
3. Open that page so its URL is in the address bar.
4. Copy the **page ID** from the URL:
   - URL looks like: `https://www.notion.so/YourWorkspace/The-Reno-Times-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - The **last part** (32 characters, sometimes with hyphens) is the page ID.
   - Example: `a1b2c3d4e5f6789012345678abcdef12` or `a1b2c3d4-e5f6-7890-1234-5678abcdef12`.
5. **Share the page with your integration:** On that page, click **⋯** (top right) → **Connections** → add your **DeepSummarizer** (or same) integration.
6. On the same page, add a link to your archives: type **/link**, choose **Link to page or database**, select **"The Reno Times – Editions"** database, and name the link **"View all editions"** or **"Archives"**.

---

## Step 4: Add the Front Page ID in Vercel

1. In **Vercel** → your project → **Settings** → **Environment Variables**.
2. Click **Add New** (or **Add**).
3. **Name:** `NOTION_RENO_TIMES_FRONT_PAGE_ID`
4. **Value:** the page ID you copied in Step 3 (paste it; you can use with or without hyphens).
5. **Environment:** leave **Production** (and optionally **Preview** if you use it).
6. Click **Save**.
7. **Redeploy:** Go to **Deployments** → **⋯** on the latest → **Redeploy** so the new env var is picked up.

---

## Step 5: Confirm Other Env Vars (Vercel)

In **Vercel** → **Settings** → **Environment Variables**, make sure you have:

| Name | Required | Notes |
|------|----------|--------|
| OPENAI_API_KEY | Yes | Same as in `.env.local` |
| NOTION_API_KEY | Yes | Your Notion integration secret |
| NOTION_DATABASE_ID | Yes | Knowledge Bank database ID |
| NOTION_NEWSPAPER_DATABASE_ID | Yes | The Reno Times – Editions database ID |
| CRON_SECRET | Optional | Used in the cron URL (e.g. cron-job.org) |
| NOTION_RENO_TIMES_FRONT_PAGE_ID | Optional | Front page from Step 3 (so today’s newsletter appears there) |

If any are missing, add them and **Redeploy** again.

---

## Step 6: Test the Daily Briefing (Optional)

1. In the browser, open (replace with your real URL and secret):
   ```
   https://YOUR-VERCEL-APP-URL.vercel.app/api/daily-briefing?secret=YOUR_CRON_SECRET
   ```
2. You should see JSON like: `{"ok":true,"message":"...","editionUrl":"...","editionTitle":"...","date":"..."}`.
3. In **Notion**:
   - Open **"The Reno Times – Editions"** database → you should see a **new row** with today’s edition and the newspaper icon.
   - If you set **NOTION_RENO_TIMES_FRONT_PAGE_ID**, open that **front page** → it should show the **full newsletter** (today’s content). Use **"View all editions"** to open the database/archives.

---

## Step 7: Cron (Already Set Up)

If you already set up **cron-job.org** with:
- URL: `https://YOUR-VERCEL-APP-URL.vercel.app/api/daily-briefing?secret=YOUR_CRON_SECRET`
- Schedule: **7:00 AM US Eastern**
- Timeout: **30 seconds**

then you’re done. Each day at 7 AM ET the new edition will be created and the front page (if configured) will be updated.

---

## Quick Checklist

- [ ] Step 1: Pushed code; Vercel deploy finished
- [ ] Step 2: OPENAI_API_KEY set in Vercel; redeployed; Summarize works or shows clear error
- [ ] Step 3: Notion front page created; page ID copied; page shared with integration; "View all editions" link added
- [ ] Step 4: NOTION_RENO_TIMES_FRONT_PAGE_ID added in Vercel; redeployed
- [ ] Step 5: All other env vars present in Vercel
- [ ] Step 6: Tested daily-briefing URL; new edition and (if set) front page look correct
- [ ] Step 7: Cron is scheduled for 7 AM ET (or confirmed it’s already set)

---

## What Changed in the Newspaper

- **Link labels:** Each "Read further" link now uses a **descriptive label** (what you’ll learn when you click), not just the raw article title.
- **So what at end of each section:** Every section ends with 2–4 **"So what for you / Actionables"** bullets for that topic.
- **Public markets:** That section is structured as (1) **Overall market** (professional investor view), then (2) **Top stocks / equity research** (names, why, analysis) so it’s clear and usable.

These apply to **new** editions generated after you deploy. Existing rows in Notion are unchanged.
