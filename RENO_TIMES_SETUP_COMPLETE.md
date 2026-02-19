# The Reno Times – Complete Setup Guide

## 1. Error Fix (JSON parsing)

**Fixed:** The app now handles non-JSON error responses from Vercel (e.g., when env vars are missing). If you still see errors, check that all environment variables are set in Vercel.

---

## 2. AI Model Recommendation

**Current:** `gpt-4o-mini` (used for summaries and Reno Times)

**Recommendation:** **Stick with `gpt-4o-mini`** for cost-effectiveness, or upgrade to **`gpt-4o`** for better quality.

### Comparison:

| Model | Cost (per 1M tokens) | Quality | Best For |
|-------|---------------------|---------|----------|
| **gpt-4o-mini** | ~$0.15 input / $0.60 output | Good | Daily summaries, cost-effective |
| **gpt-4o** | ~$2.50 input / $10 output | Excellent | Deeper analysis, better reasoning |
| **Perplexity** | ~$0.20-0.50 per query | Good (real-time web) | Research, citations |
| **Claude** | ~$3-15 per 1M tokens | Excellent | Long context, nuanced analysis |

**For Reno Times (daily briefing):**
- **`gpt-4o-mini`** is fine for TL;DR + bullets (cost-effective, fast).
- **`gpt-4o`** if you want deeper analysis and better connections (16x more expensive).

**For regular summaries:**
- **`gpt-4o-mini`** works well for most content.
- Upgrade to **`gpt-4o`** only if you need deeper analysis.

**Perplexity:** Good for research with citations, but costs more per query. Not needed for daily briefing.

**Recommendation:** **Keep `gpt-4o-mini`** for now. If summaries feel shallow, upgrade to `gpt-4o` for summaries only (keep `gpt-4o-mini` for Reno Times to save costs).

---

## 3. News Sources & RSS Feeds

### Current Sources (Free RSS):
- CoinDesk (Crypto)
- MarketWatch (Public Markets)
- TechCrunch (Startups/VC)
- Product Hunt (Tools & AI)

### Sources You Have Access To:

**Free RSS (already configured):**
- ✅ CoinDesk
- ✅ MarketWatch
- ✅ TechCrunch
- ✅ Product Hunt

**Newsletters (need RSS or API):**
- **Morning Brew** – Business news (has RSS: `https://www.morningbrew.com/daily/rss`)
- **TLDR** – AI/Tech (has RSS: `https://tldr.tech/rss`)
- **Finimize Daily** – Finance (check if they have RSS in account settings)

**Premium Sources (need API keys or RSS):**
- **WSJ** – Has RSS feeds (e.g., `https://feeds.wsj.com/rss/opinion`, `https://feeds.wsj.com/rss/markets`)
- **Bloomberg** – Limited free RSS (e.g., `https://feeds.bloomberg.com/markets/news.rss`)
- **Axios Pro** – Check account for RSS/API access
- **NYT** – Has free RSS (e.g., `https://rss.nytimes.com/services/xml/rss/nyt/Business.xml`)

**Healthcare/Kinnect Sources:**
- **Becker's Healthcare** – `https://www.beckershospitalreview.com/rss.xml`
- **Modern Healthcare** – `https://www.modernhealthcare.com/rss.xml`
- **Dental Economics** – `https://www.dentaleconomics.com/rss.xml`

### Recommended Additions:

1. **Morning Brew** – Business/markets (free RSS)
2. **TLDR** – AI/Tech (free RSS)
3. **WSJ Markets** – Premium but you have access
4. **Becker's Healthcare** – DSOs/practices (free RSS)
5. **NYT Business** – Free RSS

**Note:** For premium sources (WSJ, Bloomberg, Axios Pro), you may need to:
- Check your account for RSS feed URLs (often in account settings or email preferences)
- Or use their APIs if you have API access (more complex, requires API keys)

---

## 4. Optimal Cron Time

**When news publishes:**
- **US Markets (pre-market):** 4:00–6:00 AM ET
- **International markets:** Overnight (Asia closes ~4 AM ET, Europe opens ~3 AM ET)
- **Newsletters:** 5:00–7:00 AM ET (Morning Brew, TLDR, Finimize)
- **Major news outlets:** 6:00–8:00 AM ET (WSJ, Bloomberg, NYT)

**Recommendation:** **6:00–7:00 AM ET** (your timezone)

- Catches pre-market moves
- Most newsletters are out
- Major outlets have published morning editions
- You wake up to a fresh briefing

**If you're on the West Coast:** Set for **3:00–4:00 AM PT** (6:00–7:00 AM ET).

---

## 5. Free Cron Setup (cron-job.org)

**Vercel Cron** requires Pro ($20/month). Use **cron-job.org** (free) instead.

### Step-by-Step:

1. **Go to https://cron-job.org** and create a free account (email signup).

2. **Create a new cron job:**
   - Click **"Create cronjob"** or **"Add cronjob"**
   - **Title:** `The Reno Times Daily Briefing`
   - **URL:**  
     ```
     https://YOUR-VERCEL-APP-URL.vercel.app/api/daily-briefing?secret=YOUR_CRON_SECRET
     ```
     Replace:
     - `YOUR-VERCEL-APP-URL` = your Vercel app URL (e.g., `deep-summarizer-app-xxx`)
     - `YOUR_CRON_SECRET` = the value you set for `CRON_SECRET` in Vercel env vars (e.g., `my-secret-123`)
   - **Schedule:** Choose **"Daily"** → set time to **6:00 AM** (or 7:00 AM) in your timezone
   - **Request method:** `GET`
   - **Timeout:** `300` seconds (5 minutes)
   - **Save**

3. **Test it:**
   - After saving, click **"Run now"** or **"Execute"** to test
   - Check your **The Reno Times – Editions** database in Notion – a new edition should appear

4. **Monitor:**
   - cron-job.org shows execution history (free plan: last 10 runs)
   - Check Notion daily to confirm editions are created

**Alternative free cron services:**
- **EasyCron** (free tier: 1 job, 1 execution/day)
- **Cronitor** (free tier: 5 monitors)
- **GitHub Actions** (if your repo is on GitHub, can run a scheduled workflow)

---

## 6. Update Code with Better Sources

I'll update `lib/daily-briefing-config.ts` to include Morning Brew, TLDR, Becker's Healthcare, and WSJ/NYT if you have access.

---

## 7. Next Steps

1. **Fix the error:** Already done (JSON parsing fix in `app/page.tsx`)
2. **Add sources:** Update `lib/daily-briefing-config.ts` with new RSS feeds
3. **Set up cron:** Use cron-job.org with your Vercel URL + secret
4. **Test:** Run the cron manually once to verify it works
5. **Monitor:** Check Notion daily to confirm editions are created

---

## Cost Estimate (Monthly)

**Reno Times (daily briefing):**
- ~30 editions/month
- ~$0.50–$2/month (with `gpt-4o-mini`)
- ~$8–$30/month (with `gpt-4o`)

**Regular summaries:**
- Depends on usage
- ~$0.10–$0.50 per summary (with `gpt-4o-mini`)

**Recommendation:** Use `gpt-4o-mini` for both to keep costs low (~$5–$10/month total). Upgrade to `gpt-4o` only if quality isn't sufficient.
