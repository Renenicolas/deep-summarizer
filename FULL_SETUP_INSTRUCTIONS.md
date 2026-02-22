# Full setup: one file – Notion, Reno Times, terminal

Use this file from start to finish: **Notion AI prompts** for both databases, **env vars**, **terminal**, and how **The Reno Times** works (early run, front page + archive database).

---

# Part 1: Notion integration

1. Go to **https://www.notion.so/my-integrations**
2. Click **"+ New integration"**
3. **Name:** e.g. `DeepSummarizer`
4. **Workspace:** pick where your content will live
5. **Capabilities:** enable **Read content**, **Update content**, **Insert content**
6. Click **Submit** and **copy the Secret** (starts with `secret_`). This is your **NOTION_API_KEY**.

---

# Part 2: Create the two databases

You need **two separate databases**: **Knowledge Bank** (summaries, research, clarifications, and archived Reno Times editions) and **The Reno Times – Editions** (only the current day’s edition – the “front page”).

## Database 1: Knowledge Bank

**No Date column** – the app does not use Date for Knowledge Bank. **No "Daily Briefing" Area** – daily editions live in The Reno Times – Editions database only.

**Notion AI prompt (copy everything below into Notion AI):**

```
Create a new full-page database with these exact properties:

1. Name (Title) – keep as the first column.
2. Area (Select) – add exactly these options (no Daily Briefing):
   Kinnect
   Entrepreneurship (general)
   Crypto / Web3
   Public Markets / Equities
   Startups / VC
   Politics / Global
   Research / Q&A
   Other

3. Topic Tags (Multi-select) – add at least:
   Marketing, Strategy, Scaling, Leadership, Operations, Healthcare, Mental Models,
   Macro, DSOs, Dentistry, Startups, Crypto, Growth, Ops, GTM, Product, Sales, Other

4. Content Type (Select) – add:
   Podcast, Book, Article, News, Report, Research / Q&A, Other

5. Source URL (URL)
6. Re-read (Checkbox) – optional
7. Key Insights (Text or AI autofill) – optional; app does not set this.
8. Status (Select) – optional, e.g. To Read, Read, Archived; app does not set this.

Name the database: Knowledge Bank
```

**Or by hand:** New page → type `/table` → Full-page database. Add the columns above (names and types exactly). **Do not add a Date property** for Knowledge Bank. You can add **Key Insights** (AI autofill) and **Status** (e.g. To Read, Read) if you like; the app only fills Name, Area, Topic Tags, Content Type, and Source URL.

---

## Database 2: The Reno Times – Editions

This database holds **all editions** (current and past). Your front page is a separate page with a linked view filtered to today (the “front page”). When the next edition runs, the app creates the new one here and **app only adds new rows here; all editions stay in this database (see Part 6 for front page setup)**.

**Notion AI prompt (copy into Notion AI):**

```
Create a new full-page database with exactly these properties:

1. Name (Title) – the first column.
2. Date (Date) – the edition date.

Name the database: The Reno Times – Editions
```

**Or by hand:** New page → `/table` → Full-page database. Add **Name** (Title) and **Date** (Date). Name it **The Reno Times – Editions**.

---

# Part 3: Share databases and get IDs

1. Open **Knowledge Bank** → **•••** (top right) → **Connections** → add your integration.
2. Open **The Reno Times – Editions** → **•••** → **Connections** → add the same integration.
3. **Get Knowledge Bank ID:** Open the Knowledge Bank database as a full page. Copy the ID from the URL:
   - `https://www.notion.so/workspace/XXXXXXXX...` or `https://www.notion.so/XXXXXXXX...?v=...`
   - The **XXXXXXXX** part (32 characters, with or without hyphens) is the database ID. Save it as **NOTION_DATABASE_ID**.
4. **Get Reno Times – Editions ID:** Open The Reno Times – Editions database as full page. Copy its URL ID the same way. Save it as **NOTION_NEWSPAPER_DATABASE_ID**.

---

# Part 4: Environment variables

In the **app folder** (where `package.json` and `app` live), open or create **`.env.local`** and add:

```env
OPENAI_API_KEY=sk-your-openai-key
NOTION_API_KEY=secret_your-notion-secret
NOTION_DATABASE_ID=your-knowledge-bank-database-id
NOTION_NEWSPAPER_DATABASE_ID=your-reno-times-editions-database-id
```

- **OPENAI_API_KEY** – from https://platform.openai.com/api-keys (needed for summaries and Reno Times).
- **NOTION_API_KEY** – the integration secret from Part 1.
- **NOTION_DATABASE_ID** – Knowledge Bank database ID from Part 3.
- **NOTION_NEWSPAPER_DATABASE_ID** – The Reno Times – Editions database ID from Part 3.

Optional for daily briefing: add `CRON_SECRET=...` for the cron URL (see Part 7). Optional for front page: add `NOTION_RENO_TIMES_FRONT_PAGE_ID=your-notion-page-id` (the page that should show today’s newsletter). Each time the newspaper runs, that page is filled with a **two-column layout**: main newsletter on the left, and a small **“View all editions”** link on the right (automatic; no setup in Notion).

---

# Part 5: Terminal – run the app

1. Open **Terminal** (Mac: Spotlight → “Terminal”; Windows: Command Prompt or PowerShell).
2. Go to the app folder (replace with your path if different):
   ```bash
   cd /Users/renenicolas/Desktop/deep-summarizer
   ```
3. If you see a **`>`** on the next line after typing something, the terminal is waiting for more input. Press **Ctrl+C** once, then type the command again.
4. Install dependencies (first time only):
   ```bash
   npm install
   ```
   Wait until it finishes (no `>` at the end).
5. Start the app:
   ```bash
   npm run dev
   ```
   Wait until you see something like **Ready on http://localhost:3000**.
6. Open a browser and go to **http://localhost:3000**. You should see the Summarizer. Try **Summarize** and **Save to Notion**; the new row should appear in **Knowledge Bank**.

---

# Part 5b: Push your code to GitHub (required for Vercel)

Do this **before** deploying to Vercel. Your repo URL is `https://github.com/Renenicolas/deep-summarizer`.

1. Open **Terminal**, go to the project folder:
   ```bash
   cd /Users/renenicolas/Desktop/deep-summarizer
   ```
2. Stage and commit everything (your `.env.local` is ignored and will not be pushed):
   ```bash
   git add .
   git commit -m "Deep summarizer app with Notion and Reno Times"
   ```
3. Make sure the branch is `main`:
   ```bash
   git branch -M main
   ```
4. Add GitHub as the remote (only if you haven’t already):
   ```bash
   git remote add origin https://github.com/Renenicolas/deep-summarizer.git
   ```
   If you get “remote origin already exists”, run: `git remote remove origin` then run the `git remote add` line again.
5. Push to GitHub:
   ```bash
   git push -u origin main
   ```
   If it asks for login, use your GitHub username and a **Personal Access Token** (not your password): GitHub → Settings → Developer settings → Personal access tokens → Generate new token, then paste it when prompted for password.

When this works, **https://github.com/Renenicolas/deep-summarizer** will show your latest code.

---

# Part 6: How The Reno Times works (front page + archive)

- **"The Reno Times" page** = your front page. When you set `NOTION_RENO_TIMES_FRONT_PAGE_ID`, the app **writes today’s newsletter** to that page each time the briefing runs. The page is shown in **two columns**: main content on the left, and a small **“View all editions”** link on the right (so you can open the full Editions database). You don’t add that link by hand—the app does it every time.
- **Every time the daily briefing runs** (e.g. when you open the URL or a cron hits it):
  1. The app fetches news from the configured sources (RSS, etc.).
  2. It builds today’s edition (TL;DR style, sections with “So what” at the end of each, etc.).
  3. It **creates a new row** in **The Reno Times – Editions** and fills the **front page** with the same content in the two-column layout.
  4. **All editions stay in the Editions database.** The front page always shows the latest run’s content.

**Running on your computer (no Vercel Pro):** The briefing takes 1–2 minutes. On Vercel’s free plan it will time out. To get full summaries and the newspaper without paying, **run the app locally** and open the daily-briefing URL from your browser. See **RUN_LOCALLY.md** for step-by-step instructions.

---

# Part 7: Deploy to Vercel, then run The Reno Times (cron)

## Step 7a: Deploy the app to Vercel

1. Go to **https://vercel.com** and sign in (e.g. with GitHub).
2. Click **Add New…** → **Project**.
3. Under **Import Git Repository**, select **Renenicolas/deep-summarizer** (or paste `https://github.com/Renenicolas/deep-summarizer`). Click **Import**.
4. **If you see the red error “Project 'deep-summarizer' already exists”**:
   - **Option A (use existing project):** Close this import. In the Vercel dashboard, open your existing **deep-summarizer** project. Go to **Settings** → **Git**. Under “Connected Git Repository”, connect **Renenicolas/deep-summarizer** if it’s not already. Then go to **Deployments**, click **⋯** on the latest deployment → **Redeploy** (or push again from your machine and it will auto-deploy).
   - **Option B (new project name):** Before clicking **Deploy**, find the **Project Name** field and change it from `deep-summarizer` to e.g. **`deep-summarizer-app`** or **`reno-times`**. Then continue.
5. Add **Environment Variables** (same names and values as in your `.env.local`):  
   `OPENAI_API_KEY`, `NOTION_API_KEY`, `NOTION_DATABASE_ID`, `NOTION_NEWSPAPER_DATABASE_ID`.  
   Optional: `CRON_SECRET` (e.g. `my-secret-123`).
6. Click **Deploy**. When it finishes, copy your app URL (e.g. `https://deep-summarizer-app-xxx.vercel.app`).

## Step 7b: Run The Reno Times every morning (cron)

The daily briefing runs **once per day**. Schedule it for **5:00 or 6:00 AM** your time.

1. **Cron URL (with secret – recommended):**  
   `https://your-app-url.vercel.app/api/daily-briefing?secret=your-CRON_SECRET-value`
2. **Where to schedule:**
   - **Vercel:** In your project → **Settings** → **Cron Jobs** (if available). Add path `/api/daily-briefing`, add query `secret` = your `CRON_SECRET`, schedule e.g. `0 6 * * *` (6:00 AM).
   - **cron-job.org:** Sign up at **https://cron-job.org**. Create a new cron: URL = the URL from step 1, Schedule = Daily at 5:00 or 6:00 AM, Method = GET.

After each run: a new edition is created in **The Reno Times – Editions**; your front page (linked view filtered to today) shows only today’s edition.

---

# Part 8: Optional – embed app in Notion

In any Notion page, type **/embed**, then paste your app URL (e.g. `https://your-app.vercel.app` or `http://localhost:3000`). Resize. You can Summarize, Clarify, Research, and Save to Notion from there.

**Clarify / Research – add to same row:** When saving from Clarify or Research, paste a Notion page URL in **“Add to existing page”** to add the answer to that row (e.g. a Reno Times edition or a summary) instead of creating a new row.

---

# Quick reference

| What | Where |
|------|--------|
| Summaries, research, clarifications (new rows) | Knowledge Bank |
| All Reno Times editions (current + past) | The Reno Times – Editions database |
| Today's Reno Times edition (front page) | "The Reno Times" page (linked view filtered to today) |
| Notion AI prompts | Part 2 above |
| Env vars | Part 4 |
| Terminal | Part 5 |
| Cron for early Reno Times | Part 7 |
