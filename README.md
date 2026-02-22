# DeepSummarizer

Next.js App Router fullstack app: summarize text, PDFs, URLs (YouTube, articles, Spotify metadata), with deep summary, key bullets, “should I read?” verdict, TTS, and Notion-ready Markdown export.

## Tech

- **Next.js** (App Router), **Tailwind CSS**, **NextAuth** (Spotify)
- **Backend:** `/api/summarize` (extraction + chunking + OpenAI), `/api/tts` (OpenAI TTS)
- **Inputs:** Paste text, upload PDF/TXT, or paste URL (YouTube, article, Spotify)
- **Output:** Deep summary, key bullets, verdict + reasons, Generate Audio (OpenAI TTS + browser fallback), Copy as Markdown
- **History:** Stored in browser `localStorage` (JSON)

## Setup

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Environment variables**

   Copy `.env.example` to `.env.local` and fill in:

   - **OPENAI_API_KEY** — Required for summarization and TTS. Get from [OpenAI API keys](https://platform.openai.com/api-keys).
   - **NEXTAUTH_SECRET** — Random string for session encryption (e.g. `openssl rand -base64 32`).
   - **NEXTAUTH_URL** — Must be `http://127.0.0.1:3000` for Spotify auth to work.
   - **SPOTIFY_CLIENT_ID** and **SPOTIFY_CLIENT_SECRET** — From [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). Add these Redirect URIs in your app settings:
     - `http://127.0.0.1:3000/api/auth/callback/spotify`
     - `http://localhost:3000/api/auth/callback/spotify` (if you use localhost)

3. **Run**

   ```bash
   npm run dev
   ```

   **Important:** Open [http://127.0.0.1:3000](http://127.0.0.1:3000) — not localhost. Your `NEXTAUTH_URL` and Spotify redirect URI must match.

## Input handling

- **Paste text:** Summarized as-is.
- **Upload file:** PDF (via `pdf-parse`) or TXT; text is extracted then summarized.
- **URL:**
  - **YouTube:** Transcript/captions fetched with `youtube-transcript`; if unavailable, a clear error is shown.
  - **Article/blog:** HTML fetched and main content extracted with Cheerio.
  - **Spotify:** Only metadata (episode title, show) via Spotify oEmbed. No audio is ever ripped. If no transcript is available, the app asks the user to paste a transcript or upload a file.

## API

- **POST /api/summarize**  
  Body: `{ type: "paste" | "file" | "url", text?, url?, fileBase64?, fileName?, mimeType? }`  
  Returns: `{ deepSummary, bullets, verdict, verdictReasons, sourcesUsed }`.

- **POST /api/tts**  
  Body: `{ text: string }`  
  Returns: `audio/mpeg` (OpenAI TTS).

## TTS

- **Generate Audio:** Uses OpenAI TTS when `OPENAI_API_KEY` is set.
- **Speak (browser):** Fallback using the browser’s Speech Synthesis API.

## History

Past summaries are stored in `localStorage` under the key `deep-summarizer-history` (JSON array). Click an item in the History list to load that summary again.

## Docs (setup and running)

- **FULL_SETUP_INSTRUCTIONS.md** – Notion, env vars, Vercel, Reno Times (one-time setup).
- **RUN_LOCALLY.md** – Run the app on your computer so full summaries and the daily newspaper work without Vercel Pro (step-by-step, simple language).
- **VPS_SETUP.md** – Deploy to VPS so newspaper works from phone even when Mac is off (step-by-step, ~$5/month).
- **COST_TRACKER.md** – Track all costs (VPS + OpenAI API) to decide if it's worth continuing.
- **COMPLETE_LOCAL_FLOW.md** – Complete flow overview + automation options.
