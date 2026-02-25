# Option A – Cloudflare Tunnel on the VPS (step-by-step)

This guide runs the Cloudflare tunnel **on the VPS** so you have always-on HTTPS without your Mac. Do every step on the VPS unless noted.

---

## ⚠️ Use the correct URL (common mistake)

The tunnel URL must look **exactly** like this — **one** `https://` and **one** `.trycloudflare.com`:

**Correct:** `https://sellers-silver-abstract-doug.trycloudflare.com/`  
**Wrong:** `https://https://sellers-silver-abstract-doug.trycloudflare.com.trycloudflare.com/` (double `https://` and double `.trycloudflare.com` will always fail)

Use the correct form everywhere: in the browser, in Notion embeds, and in `.env` (for the Run-now link, add `/api/daily-briefing?secret=YOUR_SECRET` to that base URL).

---

## 1. SSH into the VPS

From your Mac (or any machine):

```bash
ssh root@5.161.211.16
```

Use your VPS root password if prompted. You should see a prompt like `root@reno-times:~#`.

---

## 2. Install cloudflared on the VPS

**Still on the VPS**, run:

```bash
curl -L --output /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i /tmp/cloudflared.deb
```

If `dpkg` says dependencies are missing, run:

```bash
apt-get update && apt-get install -f -y
```

Check it's installed:

```bash
cloudflared --version
```

---

## 3. Start the tunnel and get the HTTPS URL

Run the tunnel **once** so the URL is printed (you'll turn it into a service in the next step):

```bash
cloudflared tunnel --url http://127.0.0.1:3000 --protocol http2
```

- **Watch the first 5–10 lines.** A box appears with a line like:
  `https://something-random.trycloudflare.com`
- **Copy that full URL** (e.g. `https://sellers-silver-abstract-doug.trycloudflare.com`). Use it **exactly** — no extra `https://` or `.trycloudflare.com`.
- Then press **Ctrl+C** to stop this one-off run.

**If you only see "Retrying connection" and no URL:** wait 10–15 seconds or run again. Using `--protocol http2` usually avoids QUIC issues.

---

## 4. Run the tunnel as a systemd service (always-on)

So the tunnel keeps running after you disconnect and after reboot.

**4a. Create a systemd unit file:**

```bash
nano /etc/systemd/system/cloudflared-tunnel.service
```

Paste this (use `/usr/bin/cloudflared`; if that path doesn't work, run `which cloudflared` and use that path in `ExecStart=`):

```ini
[Unit]
Description=Cloudflare quick tunnel to localhost:3000
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/cloudflared tunnel --url http://127.0.0.1:3000 --protocol http2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Save and exit: **Ctrl+O**, Enter, **Ctrl+X**.

**4b. Enable and start the service:**

```bash
systemctl daemon-reload
systemctl enable cloudflared-tunnel
systemctl start cloudflared-tunnel
systemctl status cloudflared-tunnel
```

You should see **active (running)**.

**4c. Get the tunnel URL from the service (important):** When the tunnel runs as a **service**, it gets its **own** URL (which may differ from the one you saw in step 3). To see it:

```bash
journalctl -u cloudflared-tunnel -n 50 --no-pager
```

Look for a line like: `https://something-words.trycloudflare.com` (one `https://`, one `.trycloudflare.com`). **Copy that URL** and use it in step 5 and 7.

---

## 5. Set the HTTPS URL in the app's .env (on the VPS)

Edit the app environment:

```bash
cd ~/deep-summarizer
nano .env
```

Add or update (use the URL from step 4c, **no** double `https://` or double `.trycloudflare.com`):

```bash
RENO_TIMES_RUN_NOW_URL=https://YOUR-TUNNEL-URL.trycloudflare.com/api/daily-briefing?secret=YOUR_CRON_SECRET
```

Example with a real-looking hostname:

```bash
RENO_TIMES_RUN_NOW_URL=https://sellers-silver-abstract-doug.trycloudflare.com/api/daily-briefing?secret=my-reno-times-secret-123
```

Save and exit: **Ctrl+O**, Enter, **Ctrl+X**.

---

## 6. Restart the app on the VPS

```bash
pm2 restart reno-times
pm2 status
```

Confirm `reno-times` is **online**. If it's stopped or errored:

```bash
pm2 logs reno-times --lines 30
```

Fix any errors (e.g. missing env vars) and restart again.

---

## 7. Test the HTTPS URL in the browser

On your Mac (or any device), open **exactly** (one `https://`, one `.trycloudflare.com`):

```
https://YOUR-TUNNEL-URL.trycloudflare.com/
```

- If the **Summarizer** page loads, the tunnel and app are working. Go to step 8.
- If you see "site can't be reached": check you didn't double `https://` or `.trycloudflare.com`. Use the URL from `journalctl -u cloudflared-tunnel -n 50 --no-pager`.

---

## 8. Embed in Notion

In Notion use the **same** base URL (correct form, no doubles):

1. **Summarizer:** `/embed` → paste `https://YOUR-TUNNEL-URL.trycloudflare.com/`
2. **Reno Times:** `/embed` → paste `https://YOUR-TUNNEL-URL.trycloudflare.com/reno-times`
3. **Clarify:** `/embed` → paste `https://YOUR-TUNNEL-URL.trycloudflare.com/clarify`

Save the page. The embeds will work as long as the tunnel and app are running on the VPS.

---

## 9. Optional: Test "Generate today's edition"

In Notion, on the Reno Times front page, use the "Generate today's edition" link. It should replace today's edition and reload the front page.

---

## If the tunnel URL changes

**Quick tunnels** can get a **new** URL after a VPS reboot or after `systemctl restart cloudflared-tunnel`. If the old URL stops loading:

1. On the VPS: `journalctl -u cloudflared-tunnel -n 50 --no-pager` and copy the **new** `https://....trycloudflare.com` URL.
2. Update `.env`: `RENO_TIMES_RUN_NOW_URL=https://NEW-URL.trycloudflare.com/api/daily-briefing?secret=YOUR_CRON_SECRET`.
3. Run `pm2 restart reno-times`.
4. In Notion, update all embeds to use the new base URL (still only one `https://` and one `.trycloudflare.com`).

---

## Quick checklist

| Step | What to do |
|------|------------|
| 1 | `ssh root@5.161.211.16` |
| 2 | Install: `curl -L -o /tmp/cloudflared.deb ...` then `dpkg -i /tmp/cloudflared.deb` |
| 3 | Run once: `cloudflared tunnel --url http://127.0.0.1:3000 --protocol http2` → copy URL (one https://, one .trycloudflare.com) → Ctrl+C |
| 4 | Create service, `systemctl enable --now cloudflared-tunnel`, then `journalctl -u cloudflared-tunnel -n 50 --no-pager` to get the **service's** URL |
| 5 | `cd ~/deep-summarizer` → `nano .env` → set `RENO_TIMES_RUN_NOW_URL=https://...trycloudflare.com/api/daily-briefing?secret=...` (no double https or domain) |
| 6 | `pm2 restart reno-times` → `pm2 status` |
| 7 | Browser: open `https://...trycloudflare.com/` (correct URL) → should see Summarizer |
| 8 | Notion: `/embed` for `/`, `/reno-times`, `/clarify` with that HTTPS base URL |
