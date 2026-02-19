# Notion setup and embed – full instructions

You use **two separate databases**:

1. **Knowledge Bank** – Summaries (Blinkist-style), research, clarifications. Required for the app.
2. **The Reno Times – Editions** – Only daily newspaper editions. Optional; add when you use The Reno Times.

**Will Save to Notion auto-organize and fill the database?**  
**Yes.** Summaries create a new row in **Knowledge Bank** with **Area**, **Topic Tags**, **Content Type**, and **Name** filled automatically (no Date – do not add a Date property to Knowledge Bank).

**Follow-ups (Clarify / Research):** To keep everything on the same row and avoid extra rows, use **“Add to existing page”**: paste the Notion page URL (e.g. a Reno Times edition or a summary you saved). The app **appends** the clarification or research to that page instead of creating a new row.

---

## 1. Create a Notion integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations).
2. Click **"+ New integration"**.
3. Name it (e.g. **DeepSummarizer**).
4. Select the workspace where you want your knowledge base.
5. Under **Capabilities**, enable **Insert content** (and **Read content** if you want to read back).
6. Click **Submit**. Copy the **Internal Integration Secret** (starts with `secret_`). This is your **NOTION_API_KEY**.

---

## 2. Create the Knowledge Bank database (required)

This is where summaries, research, and clarifications go (unless you add them to an existing page).

- Open **NOTION_DATABASE_SPEC.md** in this repo.
- Follow the **Database 1: Knowledge Bank** section: create a full-page database with Name, Area, Topic Tags, Content Type, Source URL, Re-read (property names must match exactly). Do not add Date. You can add Key Insights (AI) and Status if you like; the app does not set them.
- Name the database e.g. **Knowledge Bank** or **Knowledge & Takeaways**.

**Optional – Reno Times:** When you want daily newspaper editions, create a **second** database (Database 2 in NOTION_DATABASE_SPEC.md) with just Name and Date. That’s **The Reno Times – Editions**. Put its ID in `.env.local` as **NOTION_NEWSPAPER_DATABASE_ID** when the daily briefing is implemented.

---

## 3. Share both databases with the integration

1. Open **each** database page in Notion (Knowledge Bank, and Reno Times if you created it).
2. Click **•••** (top right) → **Connections** (or **Add connections**).
3. Select your integration (e.g. **DeepSummarizer**).

---

## 4. Get the database IDs

1. Open the **Knowledge Bank** database as a **full page**.
2. Look at the URL: `https://www.notion.so/workspace/DATABASE_ID?v=...` or `https://www.notion.so/DATABASE_ID?v=...`.
3. Copy the **32-character database ID**. That’s your **NOTION_DATABASE_ID** (required).
4. If you created The Reno Times database, open it as full page and copy its ID for **NOTION_NEWSPAPER_DATABASE_ID** (optional for now).

---

## 5. Add env vars

In the project root, in **`.env.local`**:

```env
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=your-database-id-here
```

Restart the dev server after changing env:

```bash
npm run dev
```

---

## 6. Use Save to Notion in the app

1. Run the app and generate a **summary** (URL, podcast title, file, or pasted text).
2. Click **Save to Notion**.
3. In the modal:
   - **Title**: Prefilled; edit if you want.
   - **Source URL**: Optional; paste the original link.
4. Click **Save**.

The app will:

- Infer **Area**, **Topic Tags**, and **Content Type** from the content
- Create a new row with **Name**, **Area**, **Topic Tags**, **Content Type**, **Source URL**
- Fill the page body with Summary, Key bullets, and Founder / Rene takeaways

So **saving to Notion does automatic organization** into **Knowledge Bank** and fills all fields.

**Clarify & Research – add to same row:** In **Clarify** or **Research**, when you save, you can paste a Notion page URL in **“Add to existing page”**. The app will **append** the clarification or research to that page (e.g. a Reno Times edition or a summary row). No new row is created, so follow-ups stay attributed to that page.

---

## 7. Embed the app in Notion

1. In Notion, type **/embed**.
2. Paste your app URL, e.g. `https://your-deployed-app.vercel.app` (or `http://localhost:3000` for local dev).
3. Resize the embed as needed.

You can paste a link in the embed → **Summarize** → **Save to Notion**; the new row will appear in the same database with all fields auto-filled.

---

## Troubleshooting

- **“Notion save failed” / 403**  
  Share the database with the integration (step 3). Ensure the integration has **Insert content** in [My integrations](https://www.notion.so/my-integrations).

- **“Could not find database” / 404**  
  Use the **database** ID (from the database’s own URL when opened as full page), not a page that only contains the database.

- **Property errors (e.g. “Area” invalid)**  
  Property names are case-sensitive. Use exactly: **Name**, **Area**, **Topic Tags**, **Content Type**, **Source URL** (no Date for Knowledge Bank).  
  Area, Topic Tags, and Content Type must have the **exact options** listed in **NOTION_DATABASE_SPEC.md** (you can add more options in Notion later; the app only uses the ones it knows).

- **Topic Tags not showing**  
  Ensure the **Topic Tags** property is **Multi-select** and that the options in Notion include the tags the app sends (see NOTION_DATABASE_SPEC.md).
