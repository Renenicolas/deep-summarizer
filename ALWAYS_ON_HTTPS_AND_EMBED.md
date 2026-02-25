# Always-on HTTPS + What’s automatic vs what you embed

You want:
1. **Reno Times** to run automatically (no Mac, no tunnel on your laptop).
2. **When you open Notion**, the **Deep Summarizer** (and Clarify) to be there and usable, without running anything on your Mac.

Here’s how to get that.

---

## 1. Reno Times is already automatic

- **Cron on the VPS** runs the Run-now URL every day (e.g. 7 AM). That builds the edition and writes it to Notion.
- You **do not** embed “Reno Times” in Notion for the newspaper itself. The newspaper is **written into** your Reno Times front page and Editions database by the app. You just open Notion and read.
- The only link you need on the **Notion** front page is the small “Generate today’s edition” (and “Clarify a section”) so you can trigger a run by hand if you want. Those links must use an **HTTPS** URL if you want them to work when Notion loads the page.

So: **Reno Times = automatic.** No embedding of the Reno Times hub needed for the daily edition.

---

## 2. Always-on HTTPS so the app is “just there” in Notion

Right now the HTTPS URL (trycloudflare.com) only works while **cloudflared runs on your Mac**. To have the app **always** reachable over HTTPS (so Notion embeds work anytime, without your Mac):

- Run the tunnel (or reverse proxy) **on the VPS**, not on your Mac.

Two options:

### Option A: Cloudflare Tunnel on the VPS (no domain)

Run **cloudflared** on the VPS as a service. The tunnel stays up 24/7; you get an HTTPS URL that rarely or never changes (with a “quick” tunnel it can change after reboot; for a stable URL use a **named** tunnel and optional custom hostname).

**On the VPS:**

```bash
# Install cloudflared (Debian/Ubuntu)
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared.deb

# Run quick tunnel in background (URL will print once; note it)
cloudflared tunnel --url http://127.0.0.1:3000 --protocol http2
```

You’ll see a line like `https://something.trycloudflare.com`. To keep it running after you disconnect and across reboots, run it as a **systemd service** (see Cloudflare docs: “Run as a service”). Then:

- In **.env** on the VPS set:  
  `RENO_TIMES_RUN_NOW_URL=https://that-url.trycloudflare.com/api/daily-briefing?secret=YOUR_SECRET`
- In **Notion**, embed the **Summarizer** (and optionally **Clarify**) using that same HTTPS base URL (e.g. `https://that-url.trycloudflare.com/` and `.../clarify`).

After that, you don’t need your Mac for the tunnel. The app is always reachable over HTTPS.

### Option B: Domain + Caddy on the VPS (stable URL)

If you have a domain (e.g. `app.yourdomain.com`):

1. Point the domain’s **A record** to your VPS IP (`5.161.211.16`).
2. On the VPS, install **Caddy** and proxy to your app (see `HTTPS_FOR_NOTION_EMBED.md` Option B). Caddy gets HTTPS automatically.
3. Use `https://app.yourdomain.com` everywhere: in **.env** as `RENO_TIMES_RUN_NOW_URL`, and in **Notion** as the embed URL for Summarizer (and Clarify).

Then:

- **Reno Times** keeps running on schedule (cron + Run-now URL).
- **Summarizer** (and Clarify) are “automatically there” in Notion because the embed points at an always-on HTTPS URL.

---

## 3. What to embed in Notion

| What | Embed? | Why |
|------|--------|-----|
| **Reno Times (newspaper)** | **No** | The edition is written into Notion automatically by cron. You just open the Reno Times page in Notion. |
| **Summarizer** | **Yes** | So you can paste a URL/text and get a summary without leaving Notion. Use the always-on HTTPS URL (e.g. `https://your-app.trycloudflare.com/` or `https://app.yourdomain.com/`). |
| **Clarify** | **Optional** | Embed once (e.g. `https://.../clarify`) so you can open Clarify from Notion. Or use the “Clarify a section” link on the Reno Times front page; that link opens Clarify (in a new tab) with the right page so follow-ups go to that edition. |

So: **one embed (or two)** in Notion: **Summarizer** and, if you want, **Clarify**. Both use the **same** always-on HTTPS base URL. Reno Times you don’t embed; it’s automatic.

---

## 4. “Clarify” button for each edition

The Reno Times **front page** in Notion already has a line: **“Generate today’s edition · Clarify a section”**. The second link is the Clarify button: it opens Clarify (in a new tab) with `?appendTo=<front-page-id>` so your follow-up gets added to that page.

---

## 5. Summary

- **Reno Times:** Automatic. Cron on VPS + Run-now URL. No need to embed Reno Times in Notion.
- **Costs:** Reno Times, Clarify, and Research are now tracked; the cost dashboard will show them after you run those features again.
- **Always-on HTTPS:** Run cloudflared (or Caddy) **on the VPS** so the app has a permanent HTTPS URL. Set that URL in `.env` and in your Notion embeds.
- **In Notion:** Embed only the **Summarizer** (and optionally **Clarify**) with that HTTPS URL. Then whenever you open Notion, the Deep Summarizer is there and usable without your Mac.
