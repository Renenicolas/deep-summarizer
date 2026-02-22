# Complete Local Flow (No Vercel) + Automation

This doc explains the **complete flow** now that we're running everything locally, and how to **automate** the newspaper to run at the same time every day (like Vercel cron did).

---

## Complete Flow Overview

### 1. **Summarizer** (whenever you want)

**What it does:**
- You paste text, upload a file, or paste a URL (YouTube, article, Spotify).
- The app summarizes it in **three parts**:
  - **FRONT**: "Should I read the full source?" (Yes/No + why or why not)
  - **PAGE 1**: Deep Summary (Blinkist-style sections, each with title + in-depth body)
  - **PAGE 2**: Founder Takeaways & Real-World Applications (for Rene only)
- You can save to Notion (Knowledge Bank database).

**How to use:**
1. Run the app: `npm run dev` (Terminal).
2. Open http://localhost:3000 in your browser.
3. Paste/upload/URL → Click "Summarize".
4. Click "Save to Notion" when done.

**No automation needed** — you trigger it manually when you want a summary.

---

### 2. **Reno Times Newspaper** (daily briefing)

**What it does:**
- Fetches news from RSS feeds (Crypto, Public Markets, Startups, Healthcare, etc.).
- Builds one edition (like Finimize/Morning Brew/TLDR style: thoughtful but concise, readable in under 15 minutes).
- Each section has: TL;DR, 2–4 short paragraphs (content), "So what for you / Actionables" (bullets), and "Read further" links.
- Creates a new row in **The Reno Times – Editions** database.
- Updates the **front page** (if `NOTION_RENO_TIMES_FRONT_PAGE_ID` is set) with a two-column layout: main newsletter left, "View all editions" button right.

**How to use manually:**
1. Run the app: `npm run dev` (Terminal).
2. Open: `http://localhost:3000/api/daily-briefing?secret=my-reno-times-secret-123`  
   (Use the same secret as `CRON_SECRET` in `.env.local`.)
3. Wait 1–2 minutes. The new edition appears in Notion.

**Automation (run at same time every day):**

#### Option A: Mac Launchd (built-in, runs even when you're not logged in)

1. Create a file: `~/Library/LaunchAgents/com.renotimes.daily-briefing.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.renotimes.daily-briefing</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/curl</string>
    <string>http://localhost:3000/api/daily-briefing?secret=my-reno-times-secret-123</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>6</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
```

2. **Important:** Replace `my-reno-times-secret-123` with your actual `CRON_SECRET` from `.env.local`.
3. **Important:** This only works if:
   - Your Mac is **on** at 6:00 AM.
   - The app is **running** (`npm run dev` in Terminal).
   - If you close Terminal or restart your Mac, you need to start the app again.

4. Load it:
   ```bash
   launchctl load ~/Library/LaunchAgents/com.renotimes.daily-briefing.plist
   ```

5. To stop it:
   ```bash
   launchctl unload ~/Library/LaunchAgents/com.renotimes.daily-briefing.plist
   ```

**Limitation:** Your Mac must be on and the app running. If you want it to run even when your Mac is off, you'd need a cloud service (e.g. Vercel Pro, or a small VPS).

#### Option B: Keep Terminal open + simple reminder

- Leave `npm run dev` running in Terminal.
- Set a daily reminder (Calendar, Reminders app) at 6:00 AM: "Open daily-briefing URL".
- When you wake up, open the URL once.

#### Option C: Use a cloud cron service (free tier)

- Services like **cron-job.org** (free) can hit your local URL, but only if your Mac is on and the app is running. They can't reach `localhost` from the internet unless you set up port forwarding (not recommended for security).

**Best option for "set it and forget it":** Keep the app running on your Mac (or a small VPS/server) and use Launchd (Option A) or a cloud cron that hits a public URL (requires port forwarding or a tunnel like ngrok, which adds complexity).

---

## What You Get vs. Vercel

| Feature | Vercel (free) | Local (your Mac) |
|---------|---------------|------------------|
| **Summarizer** | 504 timeout (10s limit) | ✅ Works (no timeout) |
| **Newspaper** | 504 timeout (10s limit) | ✅ Works (no timeout) |
| **Automation** | ✅ Cron (runs even if Mac off) | ⚠️ Requires Mac on + app running |
| **Cost** | Free (but Pro needed for long runs) | Free |
| **Access from other devices** | ✅ Yes (public URL) | ⚠️ Only on your Mac (localhost) |

**Recommendation:** Run locally for full summaries + newspaper. If you want automation that works even when your Mac is off, either:
- Upgrade to **Vercel Pro** (longer timeout, cron works).
- Or run the app on a small VPS/server (e.g. DigitalOcean, $5/month) and use Launchd or a cloud cron.

---

## Next Steps

1. **Test the summarizer:** Run `npm run dev`, open http://localhost:3000, summarize something, save to Notion. Check that it shows: Front (verdict) → Page 1 (deep summary sections) → Page 2 (founder takeaways).

2. **Test the newspaper:** Open `http://localhost:3000/api/daily-briefing?secret=YOUR_SECRET`. Wait 1–2 minutes. Check Notion: new edition in database, front page updated (if `NOTION_RENO_TIMES_FRONT_PAGE_ID` is set).

3. **Set up automation (optional):** Use Option A (Launchd) if you want it to run automatically at 6 AM every day (requires Mac on + app running).

4. **If you want "wake up and it's done" without your Mac on:** Consider Vercel Pro or a small VPS/server.
