import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const USAGE_FILE = join(DATA_DIR, "usage.json");

export type UsageEntry = {
  id: string;
  timestamp: number;
  endpoint: "summarize" | "tts";
  inputTokens?: number;
  outputTokens?: number;
  ttsCharacters?: number;
  costUsd: number;
};

type UsageStore = { entries: UsageEntry[] };

const PRICES = {
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  ttsPer1MChars: 15,
};

async function loadStore(): Promise<UsageStore> {
  try {
    const raw = await readFile(USAGE_FILE, "utf-8");
    const data = JSON.parse(raw) as UsageStore;
    return Array.isArray(data.entries) ? data : { entries: [] };
  } catch {
    return { entries: [] };
  }
}

async function saveStore(store: UsageStore): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(USAGE_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export function recordSummarizeUsage(
  inputTokens: number,
  outputTokens: number
): number {
  const costUsd =
    (inputTokens / 1_000_000) * PRICES["gpt-4o-mini"].inputPer1M +
    (outputTokens / 1_000_000) * PRICES["gpt-4o-mini"].outputPer1M;
  const entry: UsageEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    endpoint: "summarize",
    inputTokens,
    outputTokens,
    costUsd,
  };
  loadStore()
    .then((store) => {
      store.entries.push(entry);
      return saveStore(store);
    })
    .catch(() => {});
  return costUsd;
}

export function recordTtsUsage(characterCount: number): number {
  const costUsd = (characterCount / 1_000_000) * PRICES.ttsPer1MChars;
  const entry: UsageEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    endpoint: "tts",
    ttsCharacters: characterCount,
    costUsd,
  };
  loadStore()
    .then((store) => {
      store.entries.push(entry);
      return saveStore(store);
    })
    .catch(() => {});
  return costUsd;
}

export async function getUsageStats(): Promise<{
  totalCostUsd: number;
  totalSummarizeCost: number;
  totalTtsCost: number;
  byDay: { date: string; costUsd: number; summarize: number; tts: number }[];
  recent: UsageEntry[];
}> {
  const store = await loadStore();
  const entries = store.entries;

  const totalCostUsd = entries.reduce((s, e) => s + e.costUsd, 0);
  const totalSummarizeCost = entries
    .filter((e) => e.endpoint === "summarize")
    .reduce((s, e) => s + e.costUsd, 0);
  const totalTtsCost = entries
    .filter((e) => e.endpoint === "tts")
    .reduce((s, e) => s + e.costUsd, 0);

  const byDayMap = new Map<
    string,
    { costUsd: number; summarize: number; tts: number }
  >();
  for (const e of entries) {
    const date = new Date(e.timestamp).toISOString().slice(0, 10);
    const cur = byDayMap.get(date) ?? {
      costUsd: 0,
      summarize: 0,
      tts: 0,
    };
    cur.costUsd += e.costUsd;
    if (e.endpoint === "summarize") cur.summarize += e.costUsd;
    else cur.tts += e.costUsd;
    byDayMap.set(date, cur);
  }
  const byDay = Array.from(byDayMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);

  const recent = [...entries].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);

  return {
    totalCostUsd,
    totalSummarizeCost,
    totalTtsCost,
    byDay,
    recent,
  };
}
