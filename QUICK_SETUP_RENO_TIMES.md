# Quick Setup: Reno Times + Free Cron

## ✅ Error Fixed
The JSON parsing error is fixed. If you still see errors, check that all environment variables are set in Vercel.

---

## 🤖 AI Model: Keep `gpt-4o-mini`
- **Current:** `gpt-4o-mini` (cost-effective, good quality)
- **Cost:** ~$0.50–$2/month for daily briefing
- **Upgrade to `gpt-4o`** only if you need deeper analysis (16x more expensive)

---

## 📰 Sources Added
**Updated in code:**
- ✅ Becker's Healthcare (DSOs/practices)
- ✅ NYT World (politics/global)
- ✅ Product Hunt (tools/AI)
- ✅ CoinDesk, MarketWatch, TechCrunch (existing)

**To add manually (if you have access):**
- Morning Brew: `https://www.morningbrew.com/daily/rss`
- TLDR: `https://tldr.tech/rss`
- WSJ Markets: `https://feeds.wsj.com/rss/markets` (if you have WSJ access)
- Bloomberg: `https://feeds.bloomberg.com/markets/news.rss` (limited free)

**How to add:** Edit `lib/daily-briefing-config.ts` and add `feedUrl` to the section you want.

---

## ⏰ Optimal Time: 6:00–7:00 AM ET
- Catches pre-market moves (4–6 AM ET)
- Newsletters are out (5–7 AM ET)
- Major outlets published (6–8 AM ET)

**If you're West Coast:** Set for **3:00–4:00 AM PT** (6:00–7:00 AM ET).

---

## 🆓 Free Cron Setup (cron-job.org)

### Step 1: Create Account
1. Go to **https://cron-job.org**
2. Sign up (free)

### Step 2: Create Cron Job
1. Click **"Create cronjob"**
2. Fill in:
   - **Title:** `The Reno Times Daily Briefing`
   - **URL:**  
     ```
     https://YOUR-VERCEL-APP-URL.vercel.app/api/daily-briefing?secret=YOUR_CRON_SECRET
     ```
     Replace:
     - `YOUR-VERCEL-APP-URL` = your Vercel app URL (e.g., `deep-summarizer-app-xxx.vercel.app`)
     - `YOUR_CRON_SECRET` = the value you set for `CRON_SECRET` in Vercel env vars
   - **Schedule:** Daily at **6:00 AM** (or 7:00 AM) in your timezone
   - **Request method:** `GET`
   - **Timeout:** `300` seconds
3. **Save**

### Step 3: Test
1. Click **"Run now"** or **"Execute"** to test
2. Check your **The Reno Times – Editions** database in Notion
3. A new edition should appear

### Step 4: Monitor
- cron-job.org shows execution history (free: last 10 runs)
- Check Notion daily to confirm editions are created

---

## 📋 Checklist

- [ ] Error fixed (code updated)
- [ ] Sources added (Becker's, NYT World)
- [ ] Vercel env vars set (`OPENAI_API_KEY`, `NOTION_API_KEY`, `NOTION_DATABASE_ID`, `NOTION_NEWSPAPER_DATABASE_ID`, `CRON_SECRET`)
- [ ] cron-job.org account created
- [ ] Cron job created with your Vercel URL + secret
- [ ] Tested cron job manually
- [ ] Verified edition appears in Notion

---

## 💰 Cost Estimate

**Monthly:**
- Reno Times (30 editions): ~$0.50–$2 (with `gpt-4o-mini`)
- Regular summaries: ~$0.10–$0.50 per summary
- **Total:** ~$5–$10/month

**Upgrade to `gpt-4o`:** ~$8–$30/month for Reno Times alone.

---

## 🔧 Troubleshooting

**Cron doesn't run:**
- Check cron-job.org execution history
- Verify URL is correct (includes `?secret=...`)
- Check Vercel logs (Deployments → View Function Logs)

**No edition in Notion:**
- Check `NOTION_NEWSPAPER_DATABASE_ID` is set correctly
- Verify database is shared with your Notion integration
- Check Vercel function logs for errors

**Error "OPENAI_API_KEY is not configured":**
- Add `OPENAI_API_KEY` to Vercel environment variables
- Redeploy after adding env vars

---

## 📚 Full Details

See **RENO_TIMES_SETUP_COMPLETE.md** for:
- Detailed AI model comparison
- All available sources (with RSS URLs)
- Timing analysis
- Alternative cron services
