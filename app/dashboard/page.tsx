"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type UsageStats = {
  totalCostUsd: number;
  totalSummarizeCost: number;
  totalTtsCost: number;
  byDay: { date: string; costUsd: number; summarize: number; tts: number }[];
  recent: {
    id: string;
    timestamp: number;
    endpoint: string;
    costUsd: number;
    inputTokens?: number;
    outputTokens?: number;
    ttsCharacters?: number;
  }[];
};

export default function DashboardPage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/usage")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          if (data.error) setError(data.error);
          else setStats(data);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load usage");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <p className="text-zinc-400">Loading usage…</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <p className="text-amber-400">{error ?? "No data"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Cost dashboard</h1>
        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          ← Back to Summarizer
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
            <p className="text-zinc-500 text-sm mb-1">Total cost</p>
            <p className="text-2xl font-semibold text-white">
              ${stats.totalCostUsd.toFixed(4)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
            <p className="text-zinc-500 text-sm mb-1">Summarize</p>
            <p className="text-2xl font-semibold text-emerald-400">
              ${stats.totalSummarizeCost.toFixed(4)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
            <p className="text-zinc-500 text-sm mb-1">TTS (audio)</p>
            <p className="text-2xl font-semibold text-amber-400">
              ${stats.totalTtsCost.toFixed(4)}
            </p>
          </div>
        </section>

        {stats.byDay.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">Cost by day</h2>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-zinc-500">
                    <th className="p-3">Date</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Summarize</th>
                    <th className="p-3">TTS</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byDay.map((row) => (
                    <tr key={row.date} className="border-b border-zinc-800/50">
                      <td className="p-3 text-zinc-300">{row.date}</td>
                      <td className="p-3 font-medium">${row.costUsd.toFixed(4)}</td>
                      <td className="p-3 text-emerald-400/90">${row.summarize.toFixed(4)}</td>
                      <td className="p-3 text-amber-400/90">${row.tts.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {stats.recent.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">Recent usage</h2>
            <ul className="space-y-2">
              {stats.recent.slice(0, 20).map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm"
                >
                  <span className="text-zinc-400">
                    {new Date(e.timestamp).toLocaleString()}
                  </span>
                  <span className="text-zinc-300 capitalize">{e.endpoint}</span>
                  <span className="font-medium">${e.costUsd.toFixed(4)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {stats.recent.length === 0 && stats.byDay.length === 0 && (
          <p className="text-zinc-500 text-center py-8">
            No usage recorded yet. Summarize something to see costs here.
          </p>
        )}
      </main>
    </div>
  );
}
