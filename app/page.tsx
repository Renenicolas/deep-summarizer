"use client";

import { useState, useCallback, useEffect } from "react";

const HISTORY_KEY = "deep-summarizer-history";
const MAX_HISTORY = 50;

type Tab = "paste" | "file" | "url" | "podcast";

type KeyIdea = { title: string; body: string };

type SummaryResult = {
  oneLiner?: string;
  quickTake?: string;
  keyIdeas?: KeyIdea[];
  deepSummary: string;
  bullets: string[];
  verdict: string;
  verdictReasons: string[];
  sourcesUsed: string;
  founderTakeaways?: string[];
};

type HistoryItem = {
  id: string;
  title: string;
  result: SummaryResult;
  createdAt: number;
};

function toMarkdown(result: SummaryResult): string {
  const lines: string[] = [];
  if (result.oneLiner) {
    lines.push("## In one sentence", "", result.oneLiner, "");
  }
  if (result.quickTake) {
    lines.push("## Quick take (30 sec)", "", result.quickTake, "");
  }
  if (result.keyIdeas && result.keyIdeas.length > 0) {
    lines.push("## Key ideas", "");
    result.keyIdeas.forEach((k) => {
      lines.push(`### ${k.title}`, "", k.body, "");
    });
  }
  lines.push(
    "## Deep Summary",
    "",
    result.deepSummary,
    "",
    "## Key Bullets",
    "",
    ...result.bullets.map((b) => `- ${b}`),
    "",
    "## Should I read the full source?",
    "",
    `**${result.verdict}**`,
    "",
    ...result.verdictReasons.map((r) => `- ${r}`),
    "",
    `*Source: ${result.sourcesUsed}*`
  );
  if (result.founderTakeaways && result.founderTakeaways.length > 0) {
    lines.push("", "## Founder takeaways", "");
    result.founderTakeaways.forEach((t) => lines.push(`- ${t}`, ""));
  }
  return lines.join("\n");
}

function isSpotifyUrl(s: string): boolean {
  return /open\.spotify\.com\/(?:episode|show)\//i.test(s.trim());
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("paste");
  const [pasteText, setPasteText] = useState("");
  const [url, setUrl] = useState("");
  const [podcastTitle, setPodcastTitle] = useState("");
  const [file, setFile] = useState<{ name: string; base64: string; mime?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [spotifyTranscript, setSpotifyTranscript] = useState("");
  const [spotifyPrompt, setSpotifyPrompt] = useState<{ message: string } | null>(null);
  const [showNotionModal, setShowNotionModal] = useState(false);
  const [notionTitle, setNotionTitle] = useState("");
  const [notionSourceUrl, setNotionSourceUrl] = useState("");
  const [notionSaving, setNotionSaving] = useState(false);
  const [notionSavedUrl, setNotionSavedUrl] = useState<string | null>(null);
  const [notionSaveError, setNotionSaveError] = useState<string | null>(null);

  const speakWithBrowser = useCallback(() => {
    if (!result) return;
    const text = result.deepSummary || result.bullets.join(" ");
    if (!text || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(0, 3000));
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }, [result]);

  const loadHistory = useCallback(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const list = raw ? (JSON.parse(raw) as HistoryItem[]) : [];
      setHistory(Array.isArray(list) ? list.slice(0, MAX_HISTORY) : []);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const saveToHistory = useCallback(
    (res: SummaryResult) => {
      const title =
        res.sourcesUsed.slice(0, 60) + (res.sourcesUsed.length > 60 ? "…" : "");
      const item: HistoryItem = {
        id: crypto.randomUUID(),
        title,
        result: res,
        createdAt: Date.now(),
      };
      const next = [item, ...history].slice(0, MAX_HISTORY);
      setHistory(next);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    },
    [history]
  );

  const summarize = async () => {
    setError(null);
    setResult(null);
    setSpotifyPrompt(null);
    setAudioUrl((u) => {
      if (u) URL.revokeObjectURL(u);
      return null;
    });

    let body: Record<string, unknown> = {};
    let effectiveTab = tab;

    if (spotifyPrompt && spotifyTranscript.trim()) {
      body = { type: "paste", text: spotifyTranscript.trim() };
      effectiveTab = "paste";
    } else if (tab === "paste") {
      body = { type: "paste", text: pasteText };
    } else if (tab === "podcast") {
      body = { type: "podcast_title", title: podcastTitle };
    } else if (tab === "url") {
      body = { type: "url", url };
    } else if (tab === "file" && file) {
      body = { type: "file", fileBase64: file.base64, fileName: file.name, mimeType: file.mime };
    } else {
      setError("Please provide text, a file, a URL, or a podcast title.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      let data: any;
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        setError(`Server error (${res.status}): ${res.statusText}. Check that OPENAI_API_KEY is set in Vercel environment variables.`);
        return;
      }
      if (!res.ok) {
        if (data.needsManualInput && isSpotifyUrl(url)) {
          setSpotifyPrompt({ message: data.error ?? "Paste the transcript below to summarize." });
          setError(null);
        } else {
          setError(data.error ?? "Summarization failed");
        }
        return;
      }
      setResult(data);
      saveToHistory(data);
      setSpotifyTranscript("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const generateAudio = async () => {
    if (!result) return;
    const text = result.deepSummary || result.bullets.join(" ");
    if (!text) return;
    setTtsLoading(true);
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 4096) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? "TTS failed. Use the audio button to try browser speech instead.");
        return;
      }
      const blob = await res.blob();
      setAudioUrl(URL.createObjectURL(blob));
    } catch {
      setError("TTS request failed. Try the browser speech fallback.");
    } finally {
      setTtsLoading(false);
    }
  };

  const openNotionModal = useCallback(() => {
    if (result) {
      setNotionTitle(result.sourcesUsed.slice(0, 80) + (result.sourcesUsed.length > 80 ? "…" : ""));
      setNotionSourceUrl("");
      setNotionSavedUrl(null);
      setNotionSaveError(null);
      setShowNotionModal(true);
    }
  }, [result]);

  const saveToNotion = async () => {
    if (!result) return;
    setNotionSaving(true);
    setError(null);
    setNotionSaveError(null);
    try {
      const res = await fetch("/api/notion/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: notionTitle || result.sourcesUsed.slice(0, 80),
          sourceUrl: notionSourceUrl || undefined,
          oneLiner: result.oneLiner,
          quickTake: result.quickTake,
          summary: result.deepSummary,
          bullets: result.bullets,
          founderTakeaways: result.founderTakeaways ?? [],
          keyIdeas: result.keyIdeas,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error ?? "Failed to save";
        setNotionSaveError(msg);
        setError(msg);
        return;
      }
      setNotionSavedUrl(data.url);
      setNotionSaveError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Notion save failed";
      setNotionSaveError(msg);
      setError(msg);
    } finally {
      setNotionSaving(false);
    }
  };

  const copyAsMarkdown = async () => {
    if (!result) return;
    const md = toMarkdown(result);
    try {
      await navigator.clipboard.writeText(md);
      setError(null);
      alert("Copied as Markdown (Notion-ready)!");
    } catch {
      setError("Could not copy to clipboard.");
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(",")[1] ?? "";
      setFile({ name: f.name, base64: b64, mime: f.type });
    };
    reader.readAsDataURL(f);
  };

  const canSummarize =
    spotifyPrompt
      ? spotifyTranscript.trim().length > 0
      : tab === "paste"
        ? pasteText.trim().length > 0
        : tab === "url"
          ? url.trim().length > 0
          : tab === "podcast"
            ? podcastTitle.trim().length > 0
            : !!file;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">DeepSummarizer</h1>
        <div className="flex gap-4">
          <a href="/clarify" className="text-sm text-zinc-400 hover:text-zinc-200">
            Clarify
          </a>
          <a href="/research" className="text-sm text-zinc-400 hover:text-zinc-200">
            Research
          </a>
          <a href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200">
            Cost dashboard
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex gap-1 p-1 rounded-lg bg-zinc-900 border border-zinc-800 w-fit">
          {(["paste", "file", "url", "podcast"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setSpotifyPrompt(null);
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                tab === t && !spotifyPrompt
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t === "paste"
                ? "Paste Text"
                : t === "file"
                  ? "Upload File"
                  : t === "url"
                    ? "URL"
                    : "Podcast Title"}
            </button>
          ))}
        </div>

        {spotifyPrompt ? (
          <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-4 space-y-3">
            <p className="text-emerald-200 text-sm">{spotifyPrompt.message}</p>
            <textarea
              value={spotifyTranscript}
              onChange={(e) => setSpotifyTranscript(e.target.value)}
              placeholder="Paste the podcast transcript here…"
              rows={8}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={summarize}
                disabled={loading || !spotifyTranscript.trim()}
                className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-medium"
              >
                {loading ? "Summarizing…" : "Summarize transcript"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSpotifyPrompt(null);
                  setSpotifyTranscript("");
                }}
                className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {tab === "paste" && (
                <div className="space-y-2">
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste text, transcript, or article content…"
                    rows={6}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                  />
                  <p className="text-zinc-500 text-xs">
                    Books: paste text from Kindle, Apple Books, or any source. For PDFs, use Upload File.
                  </p>
                </div>
              )}
              {tab === "file" && (
                <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-6 border-dashed">
                  <input
                    type="file"
                    accept=".pdf,.txt,application/pdf,text/plain"
                    onChange={onFileChange}
                    className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-zinc-700 file:text-zinc-200 file:cursor-pointer"
                  />
                  {file && (
                    <p className="mt-2 text-sm text-zinc-500">Selected: {file.name}</p>
                  )}
                  <p className="mt-2 text-zinc-500 text-xs">
                    Books: upload a PDF or paste text from Kindle, Apple Books, etc. in the Paste Text tab.
                  </p>
                </div>
              )}
              {tab === "url" && (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="YouTube, article, or Spotify podcast link"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                  />
                  <p className="text-zinc-500 text-xs">
                    Spotify/podcasts: automatically searches YouTube, RSS feeds, and other platforms for full transcripts. If not found, paste manually.
                  </p>
                </div>
              )}
              {tab === "podcast" && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={podcastTitle}
                    onChange={(e) => setPodcastTitle(e.target.value)}
                    placeholder="Podcast episode title (optionally with show/host, e.g. 'Huberman Lab – Science of Love')"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                  />
                  <p className="text-zinc-500 text-xs">
                    We&apos;ll search YouTube and podcast platforms by title to find the full episode transcript, then generate an in-depth summary.
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={summarize}
              disabled={loading || !canSummarize}
              className="w-full sm:w-auto px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-white transition-colors"
            >
              {loading ? "Summarizing…" : "Summarize"}
            </button>
          </>
        )}

        {error && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-amber-200 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className="text-lg font-semibold text-zinc-200">Summary</h2>

            {result.oneLiner && (
              <section className="rounded-lg border border-emerald-800/50 bg-emerald-950/30 p-4">
                <h3 className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-1">In one sentence</h3>
                <p className="text-zinc-100 font-medium">{result.oneLiner}</p>
              </section>
            )}

            {result.quickTake && (
              <section className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
                <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Quick take (30 sec)</h3>
                <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">{result.quickTake}</p>
              </section>
            )}

            {result.keyIdeas && result.keyIdeas.length > 0 && (
              <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <h3 className="text-sm font-medium text-zinc-400 mb-3">Key ideas</h3>
                <ul className="space-y-4">
                  {result.keyIdeas.map((k, i) => (
                    <li key={i} className="border-l-2 border-zinc-600 pl-3">
                      <p className="text-zinc-100 font-medium text-sm mb-1">{k.title}</p>
                      <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{k.body}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <h3 className="text-sm font-medium text-zinc-400 mb-2">Deep Summary</h3>
              <div className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">
                {result.deepSummary}
              </div>
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <h3 className="text-sm font-medium text-zinc-400 mb-2">Key Bullets</h3>
              <ul className="list-disc list-inside space-y-1 text-zinc-200 text-sm">
                {result.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <h3 className="text-sm font-medium text-zinc-400 mb-2">
                Should I read the full source?
              </h3>
              <p className="font-medium text-zinc-100 mb-2">{result.verdict}</p>
              <ul className="list-disc list-inside space-y-1 text-zinc-300 text-sm">
                {result.verdictReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </section>

            {result.founderTakeaways && result.founderTakeaways.length > 0 && (
              <section className="rounded-lg border border-emerald-700/60 bg-emerald-900/20 p-4">
                <h3 className="text-sm font-medium text-emerald-300 mb-2">
                  Founder / Rene Takeaways
                </h3>
                <ul className="list-disc list-inside space-y-2 text-emerald-100 text-sm">
                  {result.founderTakeaways.map((t, i) => (
                    <li key={i} className="whitespace-pre-wrap">
                      {t}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={generateAudio}
                disabled={ttsLoading}
                className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-sm font-medium"
              >
                {ttsLoading ? "Generating…" : "Generate Audio"}
              </button>
              <button
                type="button"
                onClick={speakWithBrowser}
                disabled={speaking}
                className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-sm font-medium"
              >
                {speaking ? "Speaking…" : "Speak (browser)"}
              </button>
              <button
                type="button"
                onClick={copyAsMarkdown}
                className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm font-medium"
              >
                Copy as Markdown (Notion-ready)
              </button>
              <button
                type="button"
                onClick={openNotionModal}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium"
              >
                Save to Notion
              </button>
            </div>

            {showNotionModal && result && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
                  <h3 className="text-lg font-semibold text-zinc-100">Save to Notion</h3>
                  <p className="text-zinc-500 text-sm">
                    Saves summary, bullets, and founder takeaways. Area, topic tags, and content type are set automatically from the content.
                  </p>
                  <div>
                    <label className="block text-zinc-400 text-sm mb-1">Title</label>
                    <input
                      type="text"
                      value={notionTitle}
                      onChange={(e) => setNotionTitle(e.target.value)}
                      placeholder="Page title in Notion"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-sm mb-1">Source URL (optional)</label>
                    <input
                      type="url"
                      value={notionSourceUrl}
                      onChange={(e) => setNotionSourceUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 text-sm"
                    />
                  </div>
                  {notionSaveError ? (
                    <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-amber-200 text-sm">
                      {notionSaveError}
                    </div>
                  ) : null}
                  {notionSavedUrl ? (
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 text-sm">Saved.</span>
                      <a
                        href={notionSavedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-400 hover:underline"
                      >
                        Open in Notion →
                      </a>
                    </div>
                  ) : null}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={saveToNotion}
                      disabled={notionSaving}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-medium"
                    >
                      {notionSaving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNotionModal(false)}
                      className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {audioUrl && (
              <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
                <p className="text-sm text-zinc-400 mb-2">Audio</p>
                <audio controls src={audioUrl} className="w-full max-w-md" />
              </div>
            )}
          </div>
        )}

        {history.length > 0 && (
          <section className="border-t border-zinc-800 pt-6">
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">History</h2>
            <ul className="space-y-2">
              {history.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setResult(item.result)}
                    className="w-full text-left rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 hover:bg-zinc-800/50 transition-colors"
                  >
                    <span className="text-zinc-300 text-sm block truncate">
                      {item.title}
                    </span>
                    <span className="text-zinc-500 text-xs">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
