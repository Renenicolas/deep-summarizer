# HTTPS so Notion embeds work

Notion only shows embeds over **HTTPS**. Your VPS is `http://5.161.211.16:3000`, so embeds can be blocked. Use one of these so the link is HTTPS and matches what you put in Notion.

---

## Option A: Cloudflare Tunnel (no domain, ~5 min)

You get a free HTTPS URL like `https://something.trycloudflare.com` that forwards to your app.

### On your Mac (one-time install)

```bash
# Install cloudflared (Homebrew)
brew install cloudflare/cloudflare/cloudflared
```

### On the VPS (or from Mac pointing at VPS)

**If the app runs on the VPS (port 3000):**

```bash
# From your Mac, tunnel to the VPS (use --protocol http2 if you only see "Retrying" and no URL)
cloudflared tunnel --url http://5.161.211.16:3000 --protocol http2
```

The **URL appears only once**, in the first few lines, inside a box. Copy it right away. If you only see "Retrying connection", the tunnel didn’t fully connect—stop (Ctrl+C) and run the same command again, or try without `--protocol http2`. Scroll to the **very top** of the terminal to find the box if it scrolled away. Example of the box:
```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://inkjet-medicine-buffer-turn.trycloudflare.com                                     |
+--------------------------------------------------------------------------------------------+
```
Ignore the "Cannot determine default configuration path" and other INF/ERR lines below; the tunnel is running. Timeout/retry messages are normal—the URL still works.

That **https://...** URL is what you use everywhere:

1. **In Notion** – Embed block → paste `https://random-words.trycloudflare.com` (or `/clarify`, `/reno-times`, `/` for Summarizer).
2. **In .env on the VPS** – set so the newspaper links are HTTPS:
   ```bash
   RENO_TIMES_RUN_NOW_URL=https://random-words.trycloudflare.com/api/daily-briefing?secret=YOUR_CRON_SECRET
   ```
   Then `pm2 restart reno-times`.

**Note:** The free tunnel URL changes each time you restart `cloudflared`. For a **stable** HTTPS URL, use a named tunnel and a custom hostname (see Cloudflare docs) or Option B.

---

## Option B: Domain + Caddy on VPS (stable HTTPS URL)

If you have a domain (e.g. `app.yourdomain.com`):

1. Point the domain’s DNS A record to `5.161.211.16`.
2. On the VPS, install Caddy and proxy to your app:

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install caddy
```

Create `/etc/caddy/Caddyfile`:

```
app.yourdomain.com {
    reverse_proxy localhost:3000
}
```

Then:

```bash
systemctl reload caddy
```

Caddy gets a certificate automatically. Use `https://app.yourdomain.com` in Notion and in `.env`:

```bash
RENO_TIMES_RUN_NOW_URL=https://app.yourdomain.com/api/daily-briefing?secret=YOUR_CRON_SECRET
```

---

## Make sure the link is HTTPS everywhere

- **Embed in Notion:** paste the **HTTPS** URL (e.g. `https://your-tunnel.trycloudflare.com` or `https://app.yourdomain.com`).
- **RENO_TIMES_RUN_NOW_URL** in `.env` on the server must use the same **HTTPS** base URL so the “Generate” and “Clarify” links on the Notion front page are HTTPS and work when clicked.

After changing `RENO_TIMES_RUN_NOW_URL`, run:

```bash
pm2 restart reno-times
```

Then reload the Reno Times front page in Notion; the links there will be HTTPS and the embed will load correctly.
