# Run the app on your computer (cheapest way – full summaries + newspaper work)

This page explains **running locally** in simple terms and gives you **exact steps** so you get full summaries and the daily newspaper without paying for Vercel Pro.

---

## What does “running locally” mean?

**Running locally** means **your own computer** runs the app instead of Vercel’s servers.

- You open **Terminal**, type one command (`npm run dev`), and the app starts on your machine.
- You then open your browser and go to **http://localhost:3000**.
- Everything works from there: **Summarize** (including long text), **Save to Notion**, and the **daily newspaper** (Reno Times).

**Why this fixes your issues:**

- **Summarizer:** On Vercel’s free plan, the server is only allowed to work for **10 seconds**. Summarizing long text takes 1–2 minutes, so Vercel stops it and you get a 504 error. **On your computer there is no 10-second limit**, so the summarizer can finish and you get the full summary.
- **Daily briefing URL:** Same idea. The newspaper run (fetching lots of RSS + one big AI call) takes more than 10 seconds. On Vercel free it times out and returns nothing. **Run it locally** and it can run as long as it needs.

**Can you still do everything you want?**

- **Yes.** You can summarize, save to Notion, and run the daily briefing. Notion stays the same (Knowledge Bank, Reno Times – Editions, front page). You’re not losing any feature.
- **Excel:** The app saves to **Notion**, not Excel. If you need Excel, you can copy from Notion or export from Notion later. Running locally doesn’t change that.

**Do you need Vercel at all?**

- **No.** If you run everything locally, you don’t need Vercel. You can keep the app on Vercel for quick access from other devices (e.g. phone), but for **full summaries and the newspaper**, running on your computer is the **cheapest and most reliable** option. No Pro plan needed.

---

## Step-by-step: run the app locally

Do this when you want to use the app (summarizer or newspaper).

### 1. Open Terminal

- **Mac:** Press **Cmd + Space**, type **Terminal**, press Enter.
- **Windows:** Open **Command Prompt** or **PowerShell**.

### 2. Go to the app folder

Type this (use your real path if the app is somewhere else):

```bash
cd /Users/renenicolas/Desktop/deep-summarizer
```

Press Enter.

### 3. Start the app

Type:

```bash
npm run dev
```

Press Enter. Wait until you see something like **Ready on http://localhost:3000**.

### 4. Open the app in your browser

- Open your browser (Chrome, Safari, etc.).
- In the address bar type: **http://localhost:3000**
- Press Enter.

You should see the Summarizer page. You can paste text, upload a file, or use a URL, then click **Summarize**. Long text will work (no 504). You can **Save to Notion** as usual.

### 5. Run the daily newspaper (Reno Times) when you want

- With the app still running (Terminal still showing “Ready…”), open a **new browser tab**.
- Go to:  
  **http://localhost:3000/api/daily-briefing?secret=my-reno-times-secret-123**  
  (Use the **exact same** value as `CRON_SECRET` in your `.env.local`. If you don’t have `CRON_SECRET` set, you can leave off `?secret=...` and the URL will still work.)
- Press Enter. The page might take 1–2 minutes to respond. When it’s done, you’ll see a short message and the new edition will be in Notion (Editions database and, if you set it up, the front page).

**If you see `{"error":"Unauthorized"}` (401):** The `secret=` in the URL must **exactly** match `CRON_SECRET` in `.env.local` (no extra spaces). If you changed `.env.local`, **restart the app** (Ctrl+C, then `npm run dev` again).

**Important:** The app must be **running** (step 3) the whole time you use the summarizer or open the daily-briefing URL. When you close Terminal or press Ctrl+C, the app stops.

---

## “View all editions” button – does it stay every time?

**Yes.** Every time the newspaper is posted (from your computer or from a cron), the app writes the page in a **two-column layout**:

- **Left side (big):** The full newsletter.
- **Right side (small):** A gray box with **“View all editions”** that links to the Editions database.

You don’t have to do anything in Notion to get this. It’s built into the app. Each run replaces the front page content with the new edition and the same layout, so the discreet “button” on the side is always there.

---

## Optional: run the newspaper every day without opening the browser

If you want the newspaper to run every morning **without** you opening the URL:

- **Mac:** You can use **Launchd** (built-in) to run a command every day at 6 AM, e.g. `curl "http://localhost:3000/api/daily-briefing?secret=..."`. That only works if your Mac is on and the app is running at 6 AM.
- **Easier:** Leave the app running on your computer when you’re working. When you want that day’s edition, open the daily-briefing URL in a tab once. No cron needed.

If you later want a true “wake up and it’s done” setup without your computer on, you’d need either Vercel Pro (longer timeout) or another host that allows long-running requests.

---

## How the newspaper flow works (Reno Times)

1. You open the daily-briefing URL (or a cron job does) while the app is running.
2. The app fetches news from the RSS feeds, sends everything to the AI, and gets back one edition (sections: Crypto, Public Markets, Startups, Healthcare, etc., each with TL;DR, bullets, "So what for you / Actionables" at the end, and "Read further" links).
3. The app creates a new row in **The Reno Times – Editions** database with that content (and the newspaper icon).
4. If you set **NOTION_RENO_TIMES_FRONT_PAGE_ID**, the app replaces that Notion page with the same edition in a two-column layout: main newsletter on the left, "View all editions" on the right.
5. Old editions stay in the database; only the front page content is overwritten each time.

So: **Editions database** = full archive. **Front page** = latest edition (with the side button to open the archive). If the front page is empty, either the briefing has not run yet or NOTION_RENO_TIMES_FRONT_PAGE_ID is not set in .env.local.

---

## Quick reference

| Goal | What to do |
|-----|------------|
| Full summaries (no 504) | Run app locally (`npm run dev`), use http://localhost:3000 |
| Daily newspaper to Notion | Run app locally, then open http://localhost:3000/api/daily-briefing?secret=YOUR_SECRET |
| View all editions | In Notion, use the **“View all editions”** box on the right side of the front page (automatic every time) |
| Skip Vercel / save money | Use only local run; no need for Vercel Pro |

For first-time setup (Notion, databases, `.env.local`), use **FULL_SETUP_INSTRUCTIONS.md**.
