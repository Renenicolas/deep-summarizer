"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const RUN_NOW_URL_KEY = "reno-times-run-now-url";

export default function RenoTimesPage() {
  const [runNowUrl, setRunNowUrl] = useState("");
  const [savedUrl, setSavedUrl] = useState("");
  const [notionUrl, setNotionUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(RUN_NOW_URL_KEY) : null;
    if (stored) setSavedUrl(stored);
  }, []);

  useEffect(() => {
    fetch("/api/reno-times/settings")
      .then((r) => r.json())
      .then((d) => setNotionUrl(d.notionFrontPageUrl ?? null))
      .catch(() => setNotionUrl(null));
  }, []);

  const saveRunNowUrl = () => {
    const url = runNowUrl.trim();
    if (!url) return;
    try {
      localStorage.setItem(RUN_NOW_URL_KEY, url);
      setSavedUrl(url);
      setRunNowUrl("");
    } catch {}
  };

  const runNow = () => {
    if (savedUrl) {
      window.open(savedUrl, "_blank", "noopener");
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

        <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold text-zinc-200">Run today’s edition</h2>
          {savedUrl ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">
                Run-now link is saved. Click below to trigger the build (takes 1–2 min). The new edition will appear in Notion.
              </p>
              <button
                type="button"
                onClick={runNow}
                disabled={loading}
                className="px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 font-medium"
              >
                {loading ? "Opening…" : "Run now"}
              </button>
              <button
                type="button"
                onClick={() => { localStorage.removeItem(RUN_NOW_URL_KEY); setSavedUrl(""); }}
                className="block text-xs text-zinc-500 hover:text-zinc-300"
              >
                Clear saved link
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">
                Paste your Run-now URL once (from Notion or your cron). It’s stored only in this browser.
              </p>
              <input
                type="url"
                value={runNowUrl}
                onChange={(e) => setRunNowUrl(e.target.value)}
                placeholder="http://YOUR_IP:3000/api/daily-briefing?secret=..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <button
                type="button"
                onClick={saveRunNowUrl}
                disabled={!runNowUrl.trim()}
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
            <li>Notion front page: Run-now and Clarify buttons, date, full newsletter, link to all editions</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
