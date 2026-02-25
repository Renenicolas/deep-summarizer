# HTTPS setup – steps from Step 2 (no connection fix)

**Why you don’t see the URL:** The tunnel URL is printed **only once**, in the first few lines, inside a box. If the connection then fails (QUIC/network), you only see "Retrying connection" and the URL has scrolled off the top. Fix: stop the tunnel (Ctrl+C), run with `--protocol http2` (see 2a), and copy the URL from the box as soon as it appears—or scroll all the way up in the terminal to find it.

If you see "no connection" it’s usually one of these:

- **Tunnel URL doesn’t load** → The tunnel on your Mac isn’t running, or the VPS app isn’t running.
- **SSH to VPS fails** → VPS is off, wrong IP, or network/firewall.

Do the steps below in order. Keep the **tunnel running** on your Mac the whole time.

---

## Step 2 (again): Set HTTPS URL on the VPS

### 2a. Start the tunnel on your Mac (if it’s not running)

**If you only see "Retrying connection" and never see a URL:** the tunnel isn’t fully connecting (often due to QUIC/network). Do this:

1. **Stop the current tunnel:** in the terminal where cloudflared is running, press **Ctrl+C**.
2. **Start it again with HTTP/2** (more reliable than default QUIC):

```bash
cloudflared tunnel --url http://5.161.211.16:3000 --protocol http2
```

3. **Watch the first 5–10 lines.** The URL appears **only once**, right at the start, in a box like:

```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://something-random.trycloudflare.com                                                |
+--------------------------------------------------------------------------------------------+
```

4. **Copy that `https://....trycloudflare.com` URL immediately.** Use it exactly: **one** `https://` and **one** `.trycloudflare.com` (e.g. `https://sellers-silver-abstract-doug.trycloudflare.com/`). Do **not** type `https://https://` or `....trycloudflare.com.trycloudflare.com` or the site won’t load. If you scroll down or wait, the terminal fills with "Retrying connection" and the URL scrolls off the top—so copy it as soon as you see it, or scroll all the way up in the terminal to find the box.
5. If you still only get "Retrying" and no box, your network or firewall may be blocking cloudflared; try from another network or use "Skip the tunnel" below.

**Alternative (no tunnel):** You can embed and use the app in Notion over **HTTP** if you use Notion’s “Link” preview instead of “Embed”: paste `http://5.161.211.16:3000` and open the link in a new tab. Embed requires HTTPS; links can work over HTTP. For a proper HTTPS embed later, use a domain + Caddy on the VPS (see `HTTPS_FOR_NOTION_EMBED.md` Option B).

---

### 2b. SSH into the VPS

Open a **second** Terminal window (don’t close the tunnel one). Run:

```bash
ssh root@5.161.211.16
```

- If it asks for a password, use your VPS root password.
- If you get **"Connection refused"** or **"No route to host"**: the VPS may be off or the IP wrong. Check the Hetzner dashboard that the server is running and the IP is `5.161.211.16`.
- If SSH works, you’ll see something like `root@reno-times:~#`.

---

### 2c. Edit .env and restart the app

**Still on the VPS** (after `ssh root@5.161.211.16`), run:

```bash
cd ~/deep-summarizer
nano .env
```

- Find the line with `RENO_TIMES_RUN_NOW_URL` (or add it if it’s not there).
- Set it to your **HTTPS** tunnel URL and your real secret. Example (use your actual tunnel URL and secret):

```bash
RENO_TIMES_RUN_NOW_URL=https://YOUR-TUNNEL-URL.trycloudflare.com/api/daily-briefing?secret=YOUR_CRON_SECRET
```

Example with a fake URL and secret:

```bash
RENO_TIMES_RUN_NOW_URL=https://inkjet-medicine-buffer-turn.trycloudflare.com/api/daily-briefing?secret=my-reno-times-secret-123
```

- Save and exit: **Ctrl+O**, Enter, then **Ctrl+X**.

Then restart the app:

```bash
pm2 restart reno-times
pm2 status
```

You should see `reno-times` **online**. If it’s **stopped** or **errored**, run:

```bash
pm2 logs reno-times --lines 30
```

and fix any errors (e.g. missing env vars).

---

### 2d. Check the app on the VPS (optional)

From your Mac (in a **third** Terminal, or after exiting SSH with `exit`), test that the app answers on the VPS:

```bash
curl -s -o /dev/null -w "%{http_code}" http://5.161.211.16:3000/
```

You want `200` or `304`. If you get `000` or connection error, the app isn’t listening; fix it with `pm2 logs` and restart.

---

## Step 3: Test the HTTPS tunnel

**Keep the tunnel running** in the first Terminal.

In your **browser** on your Mac, open:

```
https://YOUR-TUNNEL-URL.trycloudflare.com/
```

(Use the same URL you put in `RENO_TIMES_RUN_NOW_URL`, but without `/api/daily-briefing?secret=...`.)

- If the **Summarizer** page loads → tunnel and app are fine. Go to Step 4.
- If you see **"no connection"** or **"This site can’t be reached"**:
  1. Confirm the tunnel is still running in the first Terminal (no “command not found” or exit).
  2. Confirm the URL is exactly the one from the box (no typo, include `https://`).
  3. Try again in 30 seconds (tunnel can take a moment to be reachable).
  4. If it still fails, stop the tunnel (Ctrl+C) and run the same `cloudflared tunnel ...` command again; use the **new** URL from the new box in step 2c and in the browser.

---

## Step 4: Embed in Notion

Once the tunnel URL loads in the browser:

1. **Summarizer**  
   In Notion: type `/embed` → choose “Embed” or “Link to site” → paste:
   ```
   https://YOUR-TUNNEL-URL.trycloudflare.com/
   ```

2. **Reno Times**  
   Same: `/embed` → paste:
   ```
   https://YOUR-TUNNEL-URL.trycloudflare.com/reno-times
   ```

3. **Clarify**  
   `/embed` → paste:
   ```
   https://YOUR-TUNNEL-URL.trycloudflare.com/clarify
   ```

Use the **same** `YOUR-TUNNEL-URL` everywhere. Save the Notion page. The embeds should load as long as the tunnel is running on your Mac.

---

## Step 5: Keep the tunnel running

- The tunnel only works while the first Terminal is open and `cloudflared tunnel ...` is running.
- If you close that Terminal or the process stops, the HTTPS URL will stop working until you run the command again (and you’ll get a **new** URL).
- When the URL changes, update `RENO_TIMES_RUN_NOW_URL` on the VPS again and run `pm2 restart reno-times`, and update any Notion embeds with the new URL.

---

## Quick checklist

| Step | What to do |
|------|------------|
| 2a | Mac: `cloudflared tunnel --url http://5.161.211.16:3000` → copy the `https://...trycloudflare.com` URL from the box. Leave running. |
| 2b | Mac (new terminal): `ssh root@5.161.211.16` → log in. |
| 2c | VPS: `cd ~/deep-summarizer` → `nano .env` → set `RENO_TIMES_RUN_NOW_URL=https://YOUR-URL.trycloudflare.com/api/daily-briefing?secret=YOUR_SECRET` → save → `pm2 restart reno-times` → `pm2 status`. |
| 3 | Browser: open `https://YOUR-URL.trycloudflare.com/` → should see Summarizer. |
| 4 | Notion: `/embed` → paste the same HTTPS base URL (with `/`, `/reno-times`, or `/clarify`). |

If something still says "no connection", say whether it’s: (A) SSH to the VPS, or (B) the tunnel URL in the browser/Notion, and what you see on screen.
