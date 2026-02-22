# Cost Tracker Dashboard

Track all costs for Deep Summarizer + Reno Times to decide if it's worth continuing.

---

## Monthly Costs

| Item | Cost | Notes |
|------|------|-------|
| **VPS (Hetzner recommended, or DigitalOcean)** | ~$4-6/month | Always-on server for newspaper + summarizer |
| **OpenAI API (gpt-4o-mini)** | ~$2-5/month | Depends on usage: 1 newspaper/day + summaries |
| **OpenAI API (if upgraded to gpt-4o)** | ~$20-50/month | Much deeper analysis, higher cost |
| **Domain (optional)** | $0-12/year | Only if you want a custom domain (e.g. renotimes.com) |
| **Total (current setup)** | **~$7-12/month** | VPS + API with gpt-4o-mini |
| **Total (if upgraded)** | **~$25-60/month** | VPS + API with gpt-4o |

---

## Cost Breakdown

### VPS (Server)
- **Provider:** Hetzner Cloud (recommended, ~€4/month) or DigitalOcean / Linode
- **Plan:** Smallest shared vCPU (e.g. CAX11 / CPX11 on Hetzner, ~$4-5/month)
- **What it does:** Runs your app 24/7 so newspaper works from phone even when Mac is off
- **Can cancel:** Yes, anytime

### OpenAI API
- **Current model:** `gpt-4o-mini` (cheap, good quality)
- **Cost:** ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **Newspaper:** ~$0.10-0.30 per run (depends on RSS content)
- **Summarizer:** ~$0.05-0.20 per summary (depends on length)
- **Monthly estimate:** If you run 1 newspaper/day + 10 summaries/month = ~$3-8/month

### If Upgraded to gpt-4o
- **Cost:** ~$2.50 per 1M input tokens, ~$10 per 1M output tokens
- **Newspaper:** ~$1-3 per run
- **Summarizer:** ~$0.50-2 per summary
- **Monthly estimate:** Same usage = ~$30-60/month

---

## Usage Tracking (update whenever tasks run)

Update this whenever you run the newspaper or use Summarize, so you can see costs in real time.

| Date | Newspaper Runs | Summaries | Notes |
|------|----------------|-----------|--------|
| (add rows as you go) | | | |

**Rough cost per run:** Newspaper ~$0.10–0.30, Summarize ~$0.05–0.20. Add a row each time you run either.

**OpenAI usage (exact):**
1. Go to https://platform.openai.com/usage
2. Check "Usage" for current month
3. Update the table above with real numbers when you check

---

## Decision Thresholds

- **Under $10/month:** ✅ Worth it (cheaper than most subscriptions)
- **$10-20/month:** 🤔 Consider if you use it daily
- **Over $20/month:** ⚠️ Review usage or downgrade model

---

## Cost Optimization Tips

1. **Use gpt-4o-mini** (current) instead of gpt-4o unless you really need deeper analysis
2. **Run newspaper once per day** (not multiple times)
3. **Summarize only what you need** (don't summarize everything)
4. **Monitor OpenAI dashboard** weekly to catch unexpected spikes

---

## Next Steps

1. Set up VPS (see VPS_SETUP.md)
2. Update this tracker whenever you run the newspaper or a summary
3. Review at end of month: worth continuing?
