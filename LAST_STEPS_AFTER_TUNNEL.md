# Last steps after tunnel + fix "site can't be reached"

---

## Deep Summarizer embed in Notion (HTTPS – this is the embed fix)

**Notion only loads embeds over HTTPS.** So the link for the **Deep Summarizer** embed must be your **HTTPS** tunnel URL, not `http://...`.

**Use this exact link in Notion for the Summarizer embed:**

```
https://vbulletin-simon-appeals-blank.trycloudflare.com/
```

**In Notion:** Type `/embed` → choose “Embed” or “Link to site” → paste the URL above (with the trailing `/`). Save. The Deep Summarizer should load inside the page. If it was blank or “can’t be reached” before, it was because the embed used HTTP or a wrong URL; this HTTPS link fixes that.

*(The “redirect when you click Generate” change is only for the **Reno Times** “Generate today’s edition” link—so that link opens Notion instead of a blank page. It’s separate from the Summarizer embed.)*

---

## Your working URL (use in Notion and .env)

**Base URL:** `https://vbulletin-simon-appeals-blank.trycloudflare.com`

| Use | URL |
|-----|-----|
| **Deep Summarizer (embed in Notion)** | `https://vbulletin-simon-appeals-blank.trycloudflare.com/` ← **This is the HTTPS link that fixes the embed.** |
| Reno Times (optional – app page) | `https://vbulletin-simon-appeals-blank.trycloudflare.com/reno-times` |
| Clarify (optional) | `https://vbulletin-simon-appeals-blank.trycloudflare.com/clarify` |

**On the VPS** in `~/deep-summarizer/.env` set (use your real `CRON_SECRET`):

```bash
RENO_TIMES_RUN_NOW_URL=https://vbulletin-simon-appeals-blank.trycloudflare.com/api/daily-briefing?secret=YOUR_CRON_SECRET
```

Then run `pm2 restart reno-times`. That way the “Generate today’s edition” link on your **Notion** Reno Times front page will use HTTPS and work when clicked.

**If you get “Unauthorized” / “secret must exactly match CRON_SECRET”:** The app that answers the vbulletin link is on the **VPS**. So the `?secret=` in the URL must match **CRON_SECRET** in the VPS `.env`, not your Mac’s `.env.local`. On the VPS: `cd ~/deep-summarizer`, then `nano .env`. Set `CRON_SECRET` to some value (e.g. `my-reno-times-secret-123`), and set `RENO_TIMES_RUN_NOW_URL=https://vbulletin-simon-appeals-blank.trycloudflare.com/api/daily-briefing?secret=THE_SAME_VALUE` (use the exact same value after `secret=`). No spaces or quotes. Save, then run `pm2 restart reno-times`.

**What to embed in Notion:** Yes, the main one you need is **Summarizer** (`https://vbulletin-simon-appeals-blank.trycloudflare.com/`). Reno Times the newspaper is automatic (cron + the Run-now link write the edition into Notion), so you don’t embed it to *read* the paper—you just open your Reno Times page in Notion. You can optionally embed the Reno Times *app* page if you want the in-app “Generate” button visible in Notion; otherwise the link on the Notion front page is enough.

---

## Reno Times: click Generate → what you get

If you open **Reno Times** in the app (`/reno-times`) and click **Generate today’s edition**:

- The app calls the same API that cron uses. It builds **today’s** edition and **replaces** the current newspaper (it does **not** add a second edition for the same day).
- Your **Notion** Reno Times front page is cleared and reloaded with that edition, plus the small “Generate today’s edition · Clarify a section” line and the **Clarify embed at the bottom** (so you can clarify without opening a new tab).
- So you get exactly what you should see for today, with the buttons fixed and the current edition replaced.

---

## Why "site can't be reached" happened

You used:

- `https://https://sellers-silver-abstract-doug.trycloudflare.com.trycloudflare.com/`

That has two mistakes:

1. **Two times `https://`** — use it only once.
2. **Two times `.trycloudflare.com`** — use it only once.

**Correct URL** (use this everywhere):

```
https://sellers-silver-abstract-doug.trycloudflare.com/
```

No `https://https://` and no `.trycloudflare.com.trycloudflare.com`.

---

## What your terminal output means

You ran the right commands. Here’s what they mean:

- **`systemctl status cloudflared-tunnel`**  
  - **Active: active (running)** → The tunnel is running. Good.  
  - The **ICMP proxy / ping_group_range** messages are warnings only; they don’t break the tunnel. You can ignore them.

- **`pm2 status`**  
  - **reno-times … online** → The app is running. Good.

So: tunnel = running, app = running. The only fix needed is using the **correct URL** (one `https://`, one `.trycloudflare.com`).

---

## Important: which URL to use

When you run the tunnel **as a service** (with `systemctl start cloudflared-tunnel`), it may get a **different** URL than when you ran it once by hand. So you must use the URL that the **service** printed.

**On the VPS**, run:

```bash
journalctl -u cloudflared-tunnel -n 50 --no-pager
```

In the output, find a line like:

`https://some-words.trycloudflare.com`

Use **that** URL (with one `https://` and one `.trycloudflare.com`). If you see `sellers-silver-abstract-doug` there, then your correct base URL is:

**`https://sellers-silver-abstract-doug.trycloudflare.com/`**

---

## Last steps (do these in order)

### 1. Fix the URL on the VPS (if you had it wrong)

SSH in:

```bash
ssh root@5.161.211.16
```

Edit env:

```bash
cd ~/deep-summarizer
nano .env
```

Set (use your real secret):

```bash
RENO_TIMES_RUN_NOW_URL=https://vbulletin-simon-appeals-blank.trycloudflare.com/api/daily-briefing?secret=YOUR_CRON_SECRET
```

**Do not** add a second `https://` or a second `.trycloudflare.com`. Save: **Ctrl+O**, Enter, **Ctrl+X**.

Restart the app:

```bash
pm2 restart reno-times
pm2 status
```

(You should still see `online`.)

### 2. Test in the browser (on your Mac)

Open: `https://vbulletin-simon-appeals-blank.trycloudflare.com/` (you said this one works).

- If the Summarizer page loads → go to step 3.
- If it still says "site can't be reached", double-check: only one `https://`, only one `.trycloudflare.com`, and the hostname matches what’s in `journalctl -u cloudflared-tunnel -n 50 --no-pager`.

### 3. Embed in Notion

In Notion, use the **same** correct base URL (one `https://`, one `.trycloudflare.com`):

| What       | Paste this |
|-----------|------------|
| Summarizer | `https://vbulletin-simon-appeals-blank.trycloudflare.com/` |
| Reno Times | `https://vbulletin-simon-appeals-blank.trycloudflare.com/reno-times` |
| Clarify    | `https://vbulletin-simon-appeals-blank.trycloudflare.com/clarify` |

Type `/embed`, then paste the URL. Save the page.

### 4. Optional: test "Generate today's edition"

On the Reno Times front page in Notion, click the "Generate today's edition" link. It should run and replace the newspaper.

---

## One-line reminder

**Your working base URL:** `https://vbulletin-simon-appeals-blank.trycloudflare.com/`  
**Wrong:** `https://https://...` or `....trycloudflare.com.trycloudflare.com` — use the correct form everywhere (browser, Notion, `.env`).
