# VPS Setup: Step-by-Step Guide (Hetzner)

Deploy your app to a Hetzner server so the newspaper works from your phone even when your Mac is off.

**Time:** ~30 minutes  
**Cost:** ~€4–5/month (~$4–5)  
**Difficulty:** Medium (follow steps exactly)

---

## Part 1: Create Hetzner Account & Server

### Step 1: Sign up and create a project

1. Go to **https://www.hetzner.com/cloud**
2. Click **"Sign up"** (or **"Register"**). Use your email and create a password.
3. Verify your email if Hetzner asks you to.
4. Log in and you’ll see the Cloud Console.
5. If asked to create a project, click **"Create project"** and name it e.g. **reno-times**. Then open that project.

---

### Step 2: Add a server

1. In the project, click **"Add Server"** (or **"New Server"**).
2. **Location:** Choose a region close to you (e.g. **Ashburn** or **Hillsboro** for US East/West, or **Falkenstein** for Europe).
3. **Image:** Choose **Ubuntu 24.04** (or **Ubuntu 22.04**). Leave the rest as default.
4. **Type:** Under **"Shared vCPU"** (or **"Cloud"**), select the **cheapest** option, e.g.:
   - **CAX11** or **CPX11**: usually **€4.15/month** or similar (1 shared vCPU, 2 GB RAM, 40 GB disk).  
   - If you see a smaller **CX22** (2 vCPU, 4 GB) for ~€5, that’s fine too. Just pick the **lowest price** that’s at least 1 vCPU and 1 GB RAM.
5. **SSH key (optional but recommended):**
   - If you have an SSH key on your Mac: click **"Add SSH key"**, paste your public key, give it a name, then select it.
   - If you don’t: skip this. Hetzner will show a **root password** once the server is created. **Copy and save that password** somewhere safe.
6. **Name:** Type e.g. **reno-times** or **deep-summarizer**.
7. Click **"Create & Buy now"** (or **"Create server"**). You may need to add a payment method (card or PayPal) if you haven’t already.
8. Wait 1–2 minutes until the server status is **"Running"**.

---

### Step 3: Get your server IP and password

1. On the server’s page you’ll see:
   - **IPv4 address:** e.g. `95.216.123.45` — **copy this** (this is your server IP).
   - **Username:** **root** (for Hetzner Ubuntu it’s always `root`).
   - **Password:** If you didn’t add an SSH key, Hetzner shows a **root password** once. Copy it and save it; you’ll need it to log in.
2. **Save these:** IP address + root password (or use SSH key). You need them for the next part.

---

## Part 2: Connect to Server & Install Software

### Step 4: Connect via Terminal (Mac)

Open **Terminal** on your Mac:

```bash
ssh root@YOUR_IP_ADDRESS
```

Replace `YOUR_IP_ADDRESS` with your actual IP (e.g. `164.92.123.45`).

**First time:** It will ask "Are you sure?" → Type `yes` and press Enter.

**If using password:** Enter the password you set.

**If using SSH key:** It should connect automatically.

You should see something like:
```
root@reno-times:~#
```

You're now **inside your server**!

---

### Step 5: Install Node.js

On the server (in Terminal), run these commands one by one:

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installation
node --version
npm --version
```

You should see versions like `v20.x.x` and `10.x.x`.

---

### Step 6: Install Git & PM2

```bash
# Install Git
apt install -y git

# Install PM2 (keeps app running 24/7)
npm install -g pm2
```

---

## Part 3: Deploy Your App

### Step 7: Clone Your Repository

On the server:

```bash
# Go to home directory
cd ~

# Clone your repo (replace with your GitHub username if different)
git clone https://github.com/Renenicolas/deep-summarizer.git

# Go into the folder
cd deep-summarizer
```

---

### Step 8: Install Dependencies

```bash
npm install
```

Wait for it to finish (may take 1-2 minutes).

---

### Step 9: Set Up Environment Variables

On the server:

```bash
# Create .env file
nano .env
```

**Copy ALL your environment variables from `.env.local` on your Mac:**

```env
OPENAI_API_KEY=sk-proj-...
NOTION_API_KEY=ntn_...
NOTION_DATABASE_ID=...
NOTION_NEWSPAPER_DATABASE_ID=...
NOTION_RENO_TIMES_FRONT_PAGE_ID=...
CRON_SECRET=my-reno-times-secret-123
# Optional: so the front page shows a "Generate today's Reno Times" button every time (use your real IP and secret)
# RENO_TIMES_RUN_NOW_URL=http://YOUR_IP:3000/api/daily-briefing?secret=YOUR_CRON_SECRET
```

**In nano:**
- Paste your variables
- Press `Ctrl + X` to exit
- Press `Y` to save
- Press `Enter` to confirm

---

### Step 10: Build & Start App with PM2

```bash
# Build the app
npm run build

# Start with PM2 (keeps it running forever)
pm2 start npm --name "reno-times" -- start

# Make PM2 start on server reboot
pm2 startup
pm2 save

# Check status
pm2 status
```

You should see `reno-times` running (status: `online`).

---

### Step 11: Test Your App

Your app should now be running at **http://5.161.211.16:3001** (use your VPS IP and port if different).

**Test it:**
1. Open browser on your Mac
2. Go to: `http://YOUR_IP_ADDRESS:3000`
3. You should see the Deep Summarizer page!

**Test the newspaper:** Open **http://5.161.211.16:3001/api/daily-briefing?secret=my-reno-times-secret-123** in your browser (use your VPS IP and port if different). Wait 1–2 min, then check Notion.

Wait 1-2 minutes. Check Notion: new edition should appear!

---

## Part 4: Set Up Automatic 7 AM Run (Cron)

### Step 12: Create Cron Job

On the server:

```bash
# Edit crontab
crontab -e
```

**First time:** Choose editor (press `1` for nano).

**Add this line at the bottom:**

```cron
0 7 * * * curl -s "http://localhost:3001/api/daily-briefing?secret=my-reno-times-secret-123" > /dev/null 2>&1
```

Use the same secret as in your `.env` (e.g. `my-reno-times-secret-123`). Use port 3001 if your app runs on 3001.

**In nano:**
- Press `Ctrl + X` to exit
- Press `Y` to save
- Press `Enter` to confirm

**This runs the newspaper every day at 7:00 AM server time.**

**To change timezone:**
- Server timezone is usually UTC
- If you want 7 AM Eastern Time (UTC-5), use: `0 12 * * *` (12:00 UTC = 7:00 AM ET)

---

## Part 5: Notion Button (optional – for "run now" from phone)

**Automatic vs button:**
- **Automatic:** The cron job (Part 4) runs the newspaper every day at 7am. You don’t press anything.
- **Notion button:** A link on your Reno Times page that opens your daily-briefing URL. When you tap it, the newspaper runs **right then** (e.g. you want today’s edition before 7am or a second run). So once the VPS is set up, you get **automatic** 7am run **plus** the option to trigger it manually from Notion anytime.

### Your links (exact URLs – replace IP/port/secret if yours are different)

If your VPS IP is **5.161.211.16**, app runs on port **3001**, and your secret is **my-reno-times-secret-123**:

| What | Link |
|------|------|
| **Run the newspaper now** (rerun / refresh) | http://5.161.211.16:3001/api/daily-briefing?secret=my-reno-times-secret-123 |
| **Clarify** | http://5.161.211.16:3001/clarify |
| **App home** | http://5.161.211.16:3001 |

**How to rerun the newspaper:** Open the **Run the newspaper now** link in your browser. Wait 1–2 minutes. Refresh your Reno Times front page in Notion.

---

### Step 13: Get your public URL

Your app is at **http://5.161.211.16:3001** (use your VPS IP and port if different).

---

### Step 14: Add Run-now link so it shows on the front page

The app can add both links to the front page for you so they’re always there and don’t get removed when the newspaper updates.

1. **SSH into your server** (Mac Terminal): `ssh root@5.161.211.16` (use your VPS IP if different).
2. **Edit the env file:** `nano ~/deep-summarizer/.env`
3. **Add this line** at the bottom: `RENO_TIMES_RUN_NOW_URL=http://5.161.211.16:3001/api/daily-briefing?secret=my-reno-times-secret-123`
4. **Save and exit:** `Ctrl + X`, then `Y`, then `Enter`.
5. **Restart:** `pm2 restart reno-times`
6. **Run the newspaper once** (see Step 15 below) so the front page gets the buttons.

Next time the newspaper runs, the front page will show at the top: **Generate today's Reno Times**, **Go deeper (Clarify)**, then the date and newsletter; Clarify form at the bottom.

**How to rerun the newspaper:** Open **http://5.161.211.16:3001/api/daily-briefing?secret=my-reno-times-secret-123** in your browser. Wait 1–2 min, then refresh the Reno Times page in Notion.

---

### Step 15: Run the newspaper once (so the front page gets the buttons)

1. Open in a browser: **http://5.161.211.16:3001/api/daily-briefing?secret=my-reno-times-secret-123**
2. Wait 1–2 minutes.
3. Open your Reno Times front page in Notion and refresh. You should see the buttons at the top, then the date, then the newsletter. If not, run the link again and refresh.

---

### Step 16: Notion – set the front page ID

The app writes to the Notion page whose ID is in **NOTION_RENO_TIMES_FRONT_PAGE_ID**. In Notion, open the page you want as the Reno Times front page and copy the page ID from the URL. On the server: `nano ~/deep-summarizer/.env` → add or change `NOTION_RENO_TIMES_FRONT_PAGE_ID=your-page-id` → save → `pm2 restart reno-times`. Then run the Run-now link once and refresh that Notion page.

---

### Step 17: Done

- **Automatic:** 7am cron runs the newspaper; open the Reno Times page in Notion.
- **Run now:** Open **http://5.161.211.16:3001/api/daily-briefing?secret=my-reno-times-secret-123** anytime; wait 1–2 min, refresh Notion.
- **Clarify:** Use the link or the form at the bottom of the front page; pick the section so the toggle goes under the right part of the newspaper.

---

## Part 6: Optional - Custom Domain (Skip if you don't need it)

If you want a custom domain (e.g. `renotimes.yourdomain.com`):

1. Buy domain (e.g. Namecheap, ~$12/year)
2. Point DNS A record to your VPS IP
3. Set up reverse proxy (nginx) on server
4. Update Notion button URL

**This is optional** — IP address works fine.

---

## Troubleshooting

### "This site can't be reached" / ERR_CONNECTION_REFUSED (Step 15)

The app might be on **port 3000** (Next.js default), or the firewall might be blocking the port. Do this on the **server** (SSH in first):

**1. Check if the app is running**
```bash
pm2 status
```
You should see `reno-times` with status **online**. If it says **stopped** or **errored**, run:
```bash
pm2 logs reno-times --lines 30
```
Fix any errors (e.g. missing env vars), then `pm2 restart reno-times`.

**2. See which port the app uses**
```bash
grep -E "^PORT=" ~/deep-summarizer/.env || echo "PORT not set"
```
- If you see **PORT=3001**, the app is on 3001. Try opening **http://5.161.211.16:3001** in your browser. If it still refuses, go to step 3 (firewall).
- If **PORT is not set**, the app uses the default **3000**. Open **http://5.161.211.16:3000/api/daily-briefing?secret=my-reno-times-secret-123** instead. If that works, use port **3000** everywhere (Run-now link, RENO_TIMES_RUN_NOW_URL, cron).

**3. Open the port in Hetzner firewall**
- In **Hetzner Cloud Console** → your project → **Firewalls**.
- If you have a firewall attached to the server: **Add rule** → Type: **Inbound** → Port: **3001** (or **3000** if that’s what you use) → Protocol: **TCP** → Save.
- If there’s no firewall, the server may still be reachable; try from your Mac: `curl -v http://5.161.211.16:3000` and `curl -v http://5.161.211.16:3001` (one of them may connect).

**4. Quick test from the server**
```bash
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/daily-briefing?secret=my-reno-times-secret-123"
```
If you get **200** or **401**, the app is running on 3000. Then use **http://5.161.211.16:3000/...** in the browser and open port **3000** in the firewall if needed.

---

### App won't start
```bash
pm2 logs reno-times
pm2 restart reno-times
```

### Can't connect to server
- Make sure the **port** (3000 or 3001) is open in the Hetzner firewall.
- On Hetzner: **Firewalls** → add inbound rule for TCP **3000** and/or **3001**.

### Cron not running
```bash
# Check cron logs
grep CRON /var/log/syslog

# Test cron manually (use your port and secret)
curl "http://localhost:3001/api/daily-briefing?secret=my-reno-times-secret-123"
```

### App stops after disconnect
- PM2 should keep it running. If not:
```bash
pm2 startup
pm2 save
```

---

## Monthly Maintenance

**Check costs:**
- DigitalOcean dashboard → Billing
- OpenAI dashboard → Usage (https://platform.openai.com/usage)
- Update `COST_TRACKER.md`

**Update app:**
```bash
ssh root@YOUR_IP_ADDRESS
cd ~/deep-summarizer
git pull
npm install
npm run build
pm2 restart reno-times
```

---

## You're Done! 🎉

**What you have now:**
- ✅ App running 24/7 on VPS
- ✅ Automatic newspaper at 7 AM every day
- ✅ Notion button works from phone/iPad anytime
- ✅ No need for Mac to be on

**Test it:**
1. Tap the Notion button from your phone
2. Wait 1-2 minutes
3. Check Notion: new edition should appear!

**Track costs:** Update `COST_TRACKER.md` monthly to see if it's worth continuing.
