# Exact steps: one-click Run now + 7 AM EST automatic

Do these **on the VPS** (SSH in first). Replace `YOUR_CRON_SECRET` with your real secret (same value as in your `.env` for `CRON_SECRET`). Example: `my-reno-times-secret-123`.

---

## Part 1: One-click “Run now” (no pasting in the app)

So when you open Reno Times in the app you just see **Run now** and click it.

### Step 1. SSH into the VPS

On your Mac, open Terminal and run:

```bash
ssh root@5.161.211.16
```

Enter your VPS password when prompted.

---

### Step 2. Open the app’s .env file

On the VPS (after you see a prompt like `root@reno-times:~#`), run:

```bash
cd ~/deep-summarizer
nano .env
```

---

### Step 3. Add or edit these two lines

In nano, do the following:

1. Find the line that says `CRON_SECRET=...` (or add it if it’s not there). Set it to your secret, for example:
   ```bash
   CRON_SECRET=my-reno-times-secret-123
   ```
   (Use your own secret; no spaces, no quotes.)

2. Find the line that says `RENO_TIMES_RUN_NOW_URL=...` (or add it at the bottom). Set it to **exactly** (use your real secret in place of `my-reno-times-secret-123`):
   ```bash
   RENO_TIMES_RUN_NOW_URL=https://vbulletin-simon-appeals-blank.trycloudflare.com/api/daily-briefing?secret=my-reno-times-secret-123
   ```
   The value after `secret=` must be **exactly** the same as `CRON_SECRET`. One `https://`, one `.trycloudflare.com`.

3. Save and exit nano:
   - Press **Ctrl+O**, then **Enter**
   - Press **Ctrl+X**

---

### Step 4. Restart the app

Still on the VPS:

```bash
pm2 restart reno-times
pm2 status
```

You should see `reno-times` with status **online**.

---

### Step 5. Check in the app

On your Mac, open:

**https://vbulletin-simon-appeals-blank.trycloudflare.com/reno-times**

You should see **Run now** only (no paste box). Click it to trigger the build; a new tab will open and then redirect to Notion.

---

## Part 2: Automatic run every day at 7 AM EST

So the newspaper runs by itself at 7 AM Eastern.

### Step 1. SSH into the VPS (if you’re not already)

```bash
ssh root@5.161.211.16
```

---

### Step 2. Open the crontab editor

```bash
crontab -e
```

If it asks you to choose an editor, type `1` and Enter for nano.

---

### Step 3. Add the 7 AM EST line

At the **bottom** of the file, add this **one line** (all on one line). Replace `my-reno-times-secret-123` with your real `CRON_SECRET`:

```cron
0 12 * * * curl -s "https://vbulletin-simon-appeals-blank.trycloudflare.com/api/daily-briefing?secret=my-reno-times-secret-123" > /dev/null 2>&1
```

- `0 12 * * *` = every day at 12:00 UTC = **7:00 AM Eastern (EST)**.
- Use the same HTTPS URL and secret as in `RENO_TIMES_RUN_NOW_URL`.

Save and exit:
- **Ctrl+O**, Enter, **Ctrl+X**.

---

### Step 4. Confirm cron is set

```bash
crontab -l
```

You should see the line you added. The newspaper will run automatically every day at 7 AM EST.

---

## Quick checklist

| Part | What you did |
|------|----------------|
| **Part 1** | On VPS: `nano ~/deep-summarizer/.env` → set `CRON_SECRET` and `RENO_TIMES_RUN_NOW_URL` (same secret in both) → save → `pm2 restart reno-times`. |
| **Part 2** | On VPS: `crontab -e` → add `0 12 * * * curl -s "https://vbulletin-simon-appeals-blank.trycloudflare.com/api/daily-briefing?secret=YOUR_SECRET" > /dev/null 2>&1` → save. |

Use your **real** secret everywhere instead of `my-reno-times-secret-123` or `YOUR_SECRET`.
