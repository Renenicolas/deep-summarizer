# Set up DeepSummarizer – simple step-by-step (no technical knowledge needed)

Follow these steps in order. You’ll need: a **Notion account** (free at notion.so), this **app** (the folder on your computer), and about **15 minutes**.

---

## What you’re going to do

1. Create a **Notion integration** (so the app can talk to Notion).
2. Create **one database** in Notion (your “knowledge bank”).
3. **Connect** that database to the integration.
4. **Copy two IDs** (like passwords) into a file called `.env.local` in the app folder.
5. **Run the app** and use “Save to Notion.”

You'll use **two separate databases**: **Knowledge Bank** (required) for summaries and research; **The Reno Times – Editions** (optional, later) for daily newspaper only. Follow-ups from Clarify/Research can be added to the same row so you don't get extra rows—see Step 7.

---

## Step 1: Create a Notion integration

1. Open your browser and go to: **https://www.notion.so/my-integrations**
2. Click the button **“+ New integration”**.
3. **Name:** type something like `DeepSummarizer` (or any name you like).
4. **Workspace:** choose the Notion workspace where you want your summaries to live.
5. Under **Capabilities**, make sure **“Read content”** and **“Update content”** and **“Insert content”** are allowed (or at least **Insert content**).
6. Click **“Submit”**.
7. On the next screen you’ll see a **“Secret”** that starts with `secret_`.  
   **Copy that whole secret** and paste it into a temporary note (Notepad, Notes, etc.). You’ll need it in Step 5.  
   This is your **NOTION_API_KEY**.

---

## Step 2: Create the database in Notion (your knowledge bank)

You want **one** database that will hold all your summaries. You can create it in two ways.

### Option A – Let Notion AI create it (easiest)

1. In Notion, create a **new page** (e.g. “My Summaries” or “Knowledge bank”).
2. Open the file **NOTION_DATABASE_SPEC.md** in this app folder (e.g. in Cursor or any text editor).
3. Find the section **“Copy-paste prompt for Notion AI.”**
4. Copy the **whole prompt** (the block that starts with “Create a new full-page database…”).
5. In your new Notion page, type **/ai** or use Notion’s AI (if you have it) and paste that prompt.  
   If your Notion doesn’t have that, use **Option B** below.
6. Notion will create a database with the right columns. Name the database something like **“Knowledge & Takeaways”** or **“Rene Bank.”**

### Option B – Create the database by hand

1. In Notion, create a **new page**.
2. Type **/table** and choose **“Table – Full page.”**
3. Name the database (e.g. **“Knowledge & Takeaways”**).
4. Add these **columns** (the names must be **exactly** as written):

   - **Name** (this is usually already there as the first column) – type: **Title**
   - **Area** – type: **Select** → add options: Entrepreneurship / Kinnect, Crypto / Web3, Public Markets / Equities, Startups / VC, Healthcare – Private Practices / DSOs, Politics / Global, General Mental Models, Daily Briefing, Research / Q&A, Other
   - **Topic Tags** – type: **Multi-select** → add options (you can start with: Marketing, Strategy, Scaling, Leadership, Healthcare, Mental Models, Other; you can add more later from NOTION_DATABASE_SPEC.md)
   - **Content Type** – type: **Select** → add options: Podcast, Book, Article, News, Report, Research / Q&A, Other
   - **Source URL** – type: **URL**
   - **Date** – type: **Date**
   - **Re-read** – type: **Checkbox** (optional)

5. Save the page.

---

## Step 3: Connect the database to your integration

1. **Open the database** you just created (click it so it’s the main thing on the screen).
2. Click the **“•••”** menu (top right).
3. Click **“Connections”** or **“Add connections.”**
4. Choose the integration you created in Step 1 (e.g. **DeepSummarizer**).
5. Confirm. The database is now linked to the app.

---

## Step 4: Get the database ID

1. With the database **open as a full page**, look at the **address bar** of your browser.
2. The URL will look like:  
   `https://www.notion.so/workspace/abc123def456...`  
   or  
   `https://www.notion.so/abc123def456...?v=...`
3. The **database ID** is the long string of letters and numbers (and sometimes hyphens) that comes after `notion.so/` and before `?` if there is one.  
   It’s usually **32 characters**.  
   Example: if the URL is `https://www.notion.so/abc123def456789012345678901234ab?v=...`, then the database ID is `abc123def456789012345678901234ab`.
4. **Copy that ID** and paste it into your temporary note. You’ll use it as **NOTION_DATABASE_ID** in the next step.

---

## Step 5: Put the two “passwords” into the app

1. Open the **app folder** on your computer (the one that contains this file and things like `package.json`, `app`, `lib`).
2. Find the file named **`.env.local`**.  
   - If it **doesn’t exist**, create a new file and name it **exactly** `.env.local` (with the dot at the start, no .txt at the end).
3. Open `.env.local` in a text editor (Notepad, Cursor, etc.).
4. Add these two lines (replace the fake values with your real ones):

```text
NOTION_API_KEY=secret_paste_your_integration_secret_here
NOTION_DATABASE_ID=paste_your_database_id_here
```

- **NOTION_API_KEY** = the secret you copied in Step 1 (starts with `secret_`).
- **NOTION_DATABASE_ID** = the database ID you copied in Step 4 (no spaces, no quotes).

5. Save the file and close it.

You also need **OPENAI_API_KEY** in the same file for summaries to work. If you don’t have it yet:

- Go to https://platform.openai.com/api-keys and create an API key.
- Add a line: `OPENAI_API_KEY=sk-...` (paste your key).

So your `.env.local` might look like:

```text
OPENAI_API_KEY=sk-your-openai-key-here
NOTION_API_KEY=secret_your-notion-secret-here
NOTION_DATABASE_ID=your-database-id-here
```

---

## Step 6: Run the app

1. Open **Terminal** (on Mac: search “Terminal” in Spotlight; on Windows: search “Command Prompt” or “PowerShell”).
2. Go to the app folder. Type (replace with your real folder path):

   **On Mac/Linux:**

   ```bash
   cd /Users/renenicolas/Desktop/deep-summarizer
   ```

   **On Windows:**

   ```cmd
   cd C:\Users\YourName\Desktop\deep-summarizer
   ```

3. Install dependencies (only needed the first time):

   ```bash
   npm install
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

5. When you see something like “Ready on http://localhost:3000”, open your browser and go to: **http://localhost:3000**

**If you see a `>` prompt after typing a command:** The terminal is waiting for more input. Press **Ctrl+C** once to cancel, then type the command again (e.g. `npm install` or `npm run dev`) and press Enter. Wait for the command to finish before typing the next one.

---

## Step 7: Use the app and save to Notion

1. On the app page, paste some text, or add a URL, or upload a PDF (or use a podcast title).
2. Click **“Summarize.”**
3. When the summary is ready, click **“Save to Notion.”**
4. In the small window: edit the **Title** if you want, add a **Source URL** if you have one, then click **“Save.”**
5. The app will create a new row in your **Knowledge Bank** database and **fill in Area, Topic Tags, Content Type, and Date automatically.** You can open the link to see it in Notion.

**Clarify & Research – keep follow-ups on the same row:** When you use **Clarify** or **Research**, you can paste a Notion page URL in **"Add to existing page"** (e.g. a Reno Times edition or a summary you already saved). The app will **add** the clarification or research to that page instead of creating a new row, so you don’t get unnecessary extra rows.

---

## Optional: Put the app inside a Notion page (embed)

1. In Notion, open any page where you want the summarizer to appear.
2. Type **/embed** and press Enter.
3. Paste your app address:  
   - If you’re only testing on your computer: `http://localhost:3000`  
   - If you put the app on the internet (e.g. Vercel): use that URL, e.g. `https://your-app.vercel.app`
4. Resize the embed. Now you can summarize and save to Notion without leaving Notion.

---

## If something doesn’t work

- **“Notion save failed” or “403”**  
  Make sure you did **Step 3**: the database must be **connected** to your integration (••• → Connections → your integration).

- **“Could not find database” or “404”**  
  Check that you copied the **database** ID (from the database’s own URL when it’s open full page), not a different page’s ID.

- **Summaries don’t work**  
  Check that **OPENAI_API_KEY** is in `.env.local` and correct. Restart the app after changing `.env.local` (stop with Ctrl+C, then run `npm run dev` again).

- **Categories or tags are wrong in Notion**  
  The app guesses them from the content. You can change them by hand in Notion after saving. If options are missing, add them to the **Area** and **Topic Tags** columns in Notion (see NOTION_DATABASE_SPEC.md for the full list).

---

You’re done. From now on: summarize anything in the app → click **Save to Notion** → it appears in your database with everything filled in.
