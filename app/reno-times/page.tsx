"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const RUN_NOW_URL_KEY = "reno-times-run-now-url";

export default function RenoTimesPage() {
  const [runNowUrlInput, setRunNowUrlInput] = useState("");
  const [serverRunNowUrl, setServerRunNowUrl] = useState<string | null>(null);
  const [savedUrl, setSavedUrl] = useState("");
  const [notionUrl, setNotionUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  /** Exact link to copy: same origin as the page, replace YOUR_CRON_SECRET with your .env secret. */
  const runNowUrlTemplate =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/daily-briefing?secret=YOUR_CRON_SECRET`
      : "https://vbulletin-simon-appeals-blank.trycloudflare.com/api/daily-briefing?secret=YOUR_CRON_SECRET";

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(RUN_NOW_URL_KEY) : null;
    if (stored) setSavedUrl(stored);
  }, []);

  useEffect(() => {
    fetch("/api/reno-times/settings")
      .then((r) => r.json())
      .then((d) => {
        setNotionUrl(d.notionFrontPageUrl ?? null);
        if (d.runNowUrl) setServerRunNowUrl(d.runNowUrl);
      })
      .catch(() => setNotionUrl(null));
  }, []);

  const saveRunNowUrl = () => {
    const url = runNowUrlInput.trim();
    if (!url) return;
    try {
      localStorage.setItem(RUN_NOW_URL_KEY, url);
      setSavedUrl(url);
      setRunNowUrlInput("");
    } catch {}
  };

  const urlToUse = serverRunNowUrl || savedUrl;

  const runNow = () => {
    if (urlToUse) {
      const urlWithRedirect = urlToUse + (urlToUse.includes("?") ? "&" : "?") + "redirect=1";
      window.open(urlWithRedirect, "_blank", "noopener");
      setLoading(true);
      setTimeout(() => setLoading(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">The Reno Times</h1>
        <div className="flex gap-4">
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
            Summarizer
          </Link>
          <Link href="/clarify" className="text-sm text-zinc-400 hover:text-zinc-200">
            Clarify
          </Link>
          <Link href="/research" className="text-sm text-zinc-400 hover:text-zinc-200">
            Research
          </Link>
          <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200">
            Cost dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <p className="text-zinc-400 text-lg">
          Your daily brief is built from RSS + AI and published to Notion. Run it once (or on a schedule), then read and clarify in Notion.
        </p>
        <p className="text-sm text-zinc-500 -mt-4">
          Automatic: cron on the VPS runs it daily (default 7 AM server time). For 7 AM EST use <code className="bg-zinc-800 px-1 rounded text-xs">0 12 * * *</code> in crontab.
        </p>

        <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold text-zinc-200">Run today’s edition</h2>
          {urlToUse ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">
                Click below to trigger the build (takes 1–2 min). The new edition will appear in Notion.
              </p>
              <button
                type="button"
                onClick={runNow}
                disabled={loading}
                className="px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 font-medium"
              >
                {loading ? "Opening…" : "Run now"}
              </button>
              {savedUrl && (
                <button
                  type="button"
                  onClick={() => { localStorage.removeItem(RUN_NOW_URL_KEY); setSavedUrl(""); }}
                  className="block text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Clear saved link
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">
                Copy the link below (replace <code className="bg-zinc-800 px-1 rounded text-xs">YOUR_CRON_SECRET</code> with your secret from .env), paste in the box, then Save. Stored in this browser only.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 p-3 rounded-lg bg-zinc-800 text-zinc-200 text-xs break-all select-all border border-zinc-700">
                  {runNowUrlTemplate}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(runNowUrlTemplate).then(() => {
                      setCopyDone(true);
                      setTimeout(() => setCopyDone(false), 2000);
                    });
                  }}
                  className="shrink-0 px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-xs font-medium"
                >
                  {copyDone ? "Copied" : "Copy"}
                </button>
              </div>
              <input
                type="url"
                value={runNowUrlInput}
                onChange={(e) => setRunNowUrlInput(e.target.value)}
                placeholder="Paste link here, then replace YOUR_CRON_SECRET with your real secret"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <p className="text-xs text-zinc-500">
                Exact pattern (copy &amp; paste):{" "}
                <code className="bg-zinc-800 px-1 rounded text-[11px]">
                  https://vbulletin-simon-appeals-blank.trycloudflare.com/api/daily-briefing?secret=my-reno-times-secret-123
                </code>
              </p>
              <button
                type="button"
                onClick={saveRunNowUrl}
                disabled={!runNowUrlInput.trim()}
                className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-sm font-medium"
              >
                Save and use Run now
              </button>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-200">Where to read & clarify</h2>
          <div className="flex flex-wrap gap-3">
            {notionUrl && (
              <a
                href={notionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium text-sm"
              >
                Open Reno Times in Notion
              </a>
            )}
            <Link
              href="/clarify"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-lg border border-zinc-600 hover:border-zinc-500 text-zinc-200 font-medium text-sm"
            >
              Clarify a section (add follow-ups to Notion)
            </Link>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            You can embed this app in Notion: use the “Embed” block and paste the Clarify or Reno Times URL. Follow-ups will be added to the page you chose.
          </p>
          {!notionUrl && (
            <p className="text-sm text-zinc-500">
              Set <code className="bg-zinc-800 px-1 rounded">NOTION_RENO_TIMES_FRONT_PAGE_ID</code> in .env to show the Notion link here.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 text-sm text-zinc-400 space-y-2">
          <h3 className="font-medium text-zinc-300">What gets built</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Major / Big news, Crypto, Public Markets, Startups, Healthcare, Kinnect Scout, Tools & AI, Politics & Global, Foreign Markets</li>
            <li>Each section: TL;DR, context, “So what for you / Actionables,” and source links</li>
            <li>Notion front page: full-width layout; date at top; small Generate · Clarify line; newsletter; “View all editions” at bottom</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
