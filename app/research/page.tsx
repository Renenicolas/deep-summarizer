"use client";

import { useState } from "react";
import Link from "next/link";

type ResearchResult = {
  answer: string;
  bullets: string[];
};

export default function ResearchPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [notionSaving, setNotionSaving] = useState(false);
  const [notionSavedUrl, setNotionSavedUrl] = useState<string | null>(null);
  const [appendToPage, setAppendToPage] = useState("");

  const runResearch = async () => {
    if (!question.trim()) return;
    setError(null);
    setResult(null);
    setNotionSavedUrl(null);
    setLoading(true);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Research failed");
      setResult({ answer: data.answer, bullets: data.bullets ?? [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const saveToNotion = async () => {
    if (!result) return;
    const addToExisting = appendToPage.trim();
    setNotionSaving(true);
    setError(null);
    try {
      if (addToExisting) {
        const res = await fetch("/api/notion/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appendToPageId: addToExisting,
            appendAs: "research",
            appendQuestion: question.slice(0, 2000),
            appendAnswer: result.answer,
            appendBullets: result.bullets,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to add to page");
        setNotionSavedUrl(data.url);
      } else {
        const res = await fetch("/api/notion/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: question.slice(0, 200),
            sourceUrl: "",
            summary: result.answer,
            bullets: result.bullets,
            founderTakeaways: [],
            contentType: "Research / Q&A",
            area: "Research / Q&A",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to save");
        setNotionSavedUrl(data.url);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Notion save failed");
    } finally {
      setNotionSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Research</h1>
        <div className="flex gap-4">
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
            Summarizer
          </Link>
          <Link href="/clarify" className="text-sm text-zinc-400 hover:text-zinc-200">
            Clarify
          </Link>
          <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200">
            Cost dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <p className="text-zinc-400 text-sm">
          Ask a question. The AI will answer in plain language and tie it to your company, markets, and decisions. Save as a new row in Knowledge Bank, or add to an existing page so follow-ups stay on that row.
        </p>

        <div className="space-y-2">
          <label className="block text-zinc-400 text-sm">Question</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What is a DSO and how does reimbursement work for multi-site practices?"
            rows={3}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          />
        </div>

        <button
          type="button"
          onClick={runResearch}
          disabled={loading || !question.trim()}
          className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-medium"
        >
          {loading ? "Researching…" : "Get answer"}
        </button>

        {error && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-amber-200 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className="text-lg font-semibold text-zinc-200">Answer</h2>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">
              {result.answer}
            </div>
            {result.bullets.length > 0 && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <h3 className="text-sm font-medium text-zinc-400 mb-2">Takeaways</h3>
                <ul className="list-disc list-inside space-y-1 text-zinc-200 text-sm">
                  {result.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-zinc-400 text-xs">Add to existing page (optional)</label>
                <input
                  type="text"
                  value={appendToPage}
                  onChange={(e) => setAppendToPage(e.target.value)}
                  placeholder="Paste Notion page URL or ID to add this research to that row"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 text-sm placeholder-zinc-500"
                />
                <p className="text-zinc-500 text-xs">
                  Leave blank to create a new row in Knowledge Bank. Paste a Reno Times or summary page link to add this answer there instead (no extra row).
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={saveToNotion}
                  disabled={notionSaving}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-medium"
                >
                  {notionSaving ? "Saving…" : appendToPage.trim() ? "Add to page" : "Save to Notion"}
                </button>
                {notionSavedUrl && (
                  <a
                    href={notionSavedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-400 hover:underline"
                  >
                    Open in Notion →
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
