# Cron Setup - Final Instructions

## ✅ Sources Added
I've added these RSS feeds to your code:
- **Morning Brew** (Public Markets)
- **TLDR** (Startups/VC + Tools/AI)
- **NYT Business** (Public Markets)
- **Bloomberg Markets** (Politics/Global)
- **Modern Healthcare** (Healthcare)
- **Becker's Healthcare** (Healthcare)

All feeds are now active in `lib/daily-briefing-config.ts`.

---

## ⏰ Time & Timezone

**Set time:** **7:00 AM US Eastern Time**

**Timezone setting:**
- **cron-job.org uses the timezone you select** when creating the cron job
- Even though you're in Rome right now, **select "US Eastern Time"** (or "America/New_York") when setting up the cron
- This way, when you're back in the US, it will still run at 7 AM Eastern
- **Do NOT use Rome timezone** - use US Eastern

**Why 7 AM ET:**
- Catches all pre-market moves (4-6 AM ET)
- All newsletters are out (Morning Brew, TLDR publish 5-7 AM ET)
- Major outlets have published (WSJ, Bloomberg, NYT publish 6-8 AM ET)

---

## ⚙️ Cron Settings

**Timeout:** **30 seconds** (max allowed)

**Full settings:**
- **Title:** `The Reno Times Daily Briefing`
- **URL:** `https://YOUR-VERCEL-APP-URL.vercel.app/api/daily-briefing?secret=YOUR_CRON_SECRET`
- **Schedule:** Daily at **7:00 AM**
- **Timezone:** **US Eastern Time** (America/New_York)
- **Request method:** `GET`
- **Timeout:** **30 seconds**

---

## 📋 What to Do After Setting Up Cron

### 1. Test It Immediately
- In cron-job.org, click **"Run now"** or **"Execute"** on your cron job
- Wait 30-60 seconds
- Check your **The Reno Times – Editions** database in Notion
- You should see a new edition appear

### 2. Verify It Works
- Open the edition in Notion
- Check that sections have content (Crypto, Public Markets, Startups, Healthcare, etc.)
- If sections are empty or say "No feed configured", check Vercel logs (see troubleshooting below)

### 3. Push Code Changes
- The RSS feed updates need to be deployed to Vercel
- Push to GitHub: `git add . && git commit -m "Add Morning Brew, TLDR, and other RSS feeds" && git push`
- Vercel will auto-deploy (or manually redeploy in Vercel dashboard)

### 4. Monitor Daily
- Check cron-job.org execution history (free plan shows last 10 runs)
- Check Notion daily to confirm new editions appear
- If an edition is missing, check Vercel function logs

### 5. Troubleshooting

**If cron runs but no edition appears:**
- Check Vercel → Your Project → Deployments → Latest → View Function Logs
- Look for errors related to:
  - `NOTION_NEWSPAPER_DATABASE_ID` not set
  - `OPENAI_API_KEY` not set
  - RSS feed fetch failures

**If timeout error (30 seconds):**
- The briefing might be taking too long
- Check Vercel logs to see where it's stuck
- Consider reducing number of RSS feeds or sections

**If wrong timezone:**
- Edit the cron job in cron-job.org
- Change timezone to "US Eastern Time" (America/New_York)
- Save

---

## ✅ Checklist

- [ ] Sources added to code (done)
- [ ] Cron job created on cron-job.org
- [ ] Time set to **7:00 AM**
- [ ] Timezone set to **US Eastern Time** (not Rome)
- [ ] Timeout set to **30 seconds**
- [ ] URL includes your Vercel app URL + secret
- [ ] Tested cron job manually ("Run now")
- [ ] Verified edition appears in Notion
- [ ] Pushed code changes to GitHub (so Vercel deploys updates)
- [ ] Checked Vercel logs if anything fails

---

## 🎯 Summary

1. **Set cron to 7:00 AM US Eastern Time** (not Rome time)
2. **Timeout: 30 seconds**
3. **Test immediately** with "Run now"
4. **Push code changes** to GitHub
5. **Monitor daily** in Notion

The cron will automatically run at 7 AM Eastern every day, regardless of where you are in the world.
