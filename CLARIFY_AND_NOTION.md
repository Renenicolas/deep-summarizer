# Clarify and Notion: two databases, follow-ups on the same row

## Two databases

- **Knowledge Bank** (NOTION_DATABASE_ID): Summaries (Blinkist-style), standalone research, standalone clarifications. One row per summary or per research/clarify when you don’t add to an existing page.
- **The Reno Times – Editions** (NOTION_NEWSPAPER_DATABASE_ID): Only daily newspaper editions. One row per day.

Follow-up clarifications or research should **not** create extra rows. Use **“Add to existing page”** in Clarify or Research and paste the Notion page URL; the app appends to that page.

---

# Clarify: highlight something and get AI answers (then save to Notion)

You asked for a way to click or highlight sentences in The Reno Times (or anywhere in Notion) and get AI clarification in a sidebar, and to save that.

**What’s possible today**

- **Inside Notion itself:** Notion doesn’t let embedded apps (like ours) see which text you selected on the page. So we can’t do a true “highlight in Notion → our AI answers in a Notion sidebar.”
- **Notion’s own AI:** If your Notion plan has **Notion AI**, you can select text in any page (including The Reno Times) and use **Ask AI** or **Explain** on the selection. That runs inside Notion—no embed needed.
- **Our app – “Clarify”:** You can get the same outcome (pick something → get an AI answer → save it) using our **Clarify** page:
  1. In Notion, **copy** the sentence or paragraph you want clarified (select it, Cmd+C / Ctrl+C).
  2. Open our app and go to **Clarify** (or open the app in an embed and switch to Clarify).
  3. **Paste** the text in “Paste the text you want clarified.”
  4. Optionally type a question (e.g. “How does this affect Kinnect?” or “What does this mean for rates?”). If you leave it blank, the AI will explain what it means and how it could affect you, Kinnect, and markets.
  5. Click **Get clarification.** The answer appears on the page (like a sidebar-style reply).
  6. Click **Save to Notion** to store the snippet + clarification in your Knowledge database (as Research / Q&A). You can open the link and move or link that page under your Reno Times edition if you want.

So: **copy from Notion → paste in Clarify → get answer → save to Notion.** That gives you “highlight something, get clarification, and save it” even though we can’t do a literal in-Notion sidebar.

**Where to find Clarify**

- In the app: click **Clarify** in the header (or go to **http://localhost:3000/clarify**).
- If you embedded the app in Notion, use the same embed and navigate to the Clarify page there.

**Summary**

| What you want | How to do it |
|---------------|--------------|
| Quick explanation of selected text inside Notion | Use **Notion AI** (Ask AI / Explain) on the selection, if your plan has it. |
| Explanation tailored to you/Kinnect/markets + save to your database | **Copy** the text in Notion → open **Clarify** in our app → paste → (optional) add a question → **Get clarification** → **Save to Notion**. |
