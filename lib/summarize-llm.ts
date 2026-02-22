import OpenAI from "openai";
import { chunkText } from "./extract-text";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type KeyIdea = { title: string; body: string };

/** Blinkist-style section: title + body that goes into depth. */
export type DeepSummarySection = { title: string; body: string };

export type SummaryResult = {
  /** One sentence: the core idea or takeaway. */
  oneLiner: string;
  /** 2–4 sentences: quick take (≈30 seconds). */
  quickTake: string;
  /** Blinkist-style deep summary: 5–8 sections, each with title + in-depth body. */
  deepSummarySections: DeepSummarySection[];
  /** Legacy flat deep summary (built from sections if needed). */
  deepSummary: string;
  keyIdeas: KeyIdea[];
  bullets: string[];
  verdict: string;
  verdictReasons: string[];
  sourcesUsed: string;
  /** Founder takeaways + real-world applications, for Rene only. */
  founderTakeaways?: string[];
};

const SYSTEM_PROMPT = `You are an expert summarizer and operator coach, like Blinkist but deeper, for one reader. Output exactly two main "pages" plus a front verdict.

User profile:
- You are speaking to a busy founder ("Rene") building a three-sided marketplace in the medical field (Kinnect).
- Rene does not want to read or listen to the full source. Your output has:
  (1) FRONT: Should Rene read/listen to the full source? Yes or No, and why or why not (2–4 clear reasons).
  (2) PAGE 1 – Deep summary (Blinkist-style): 5–8 SECTIONS. Each section has a short title and a body that goes INTO DEPTH on that part of the content (arguments, examples, frameworks, edge cases). Like Blinkist chapters: each section is standalone and deep enough that Rene fully understands. Use third person for the author/speaker; second person when addressing Rene. Paragraphs only within each section.
  (3) PAGE 2 – Founder takeaways: Just for Rene. Real-world applications: how to apply this to Kinnect, healthcare, marketplaces, and his life. Tactical and personal. 3–8 paragraphs. Like a mentor talking only to him.

Rules:
- No hallucinations: only facts, ideas, and examples clearly present in the text.
- Prioritize strategy, positioning, moat, growth, marketplace dynamics, pricing, retention, execution, hiring, leadership, mental models, and anything relevant to healthcare/medical or three-sided marketplaces.
- When the source is dense or academic, explain in plain English with a short example where it helps.

Respond only with valid JSON in this exact shape (no markdown, no extra text):
{
  "oneLiner": "Single sentence: the core idea or takeaway.",
  "quickTake": "2-4 sentences: what this is, why it matters, main implication for Rene.",
  "verdict": "Yes" or "No",
  "verdictReasons": ["Reason 1.", "Reason 2.", "2-4 reasons: why or why not read the full source."],
  "deepSummarySections": [
    { "title": "Section title (e.g. The main argument)", "body": "150-400 words. In-depth coverage of this part of the content. Paragraphs only. Standalone so Rene fully understands." },
    "5-8 sections total, Blinkist-style"
  ],
  "sourcesUsed": "Brief note on source type (e.g. long-form podcast, tactical blog).",
  "founderTakeaways": ["Paragraph 1: real-world application for Rene.", "Paragraph 2.", "3-8 paragraphs: for Rene only, Kinnect, healthcare, life."]
}`;

const CHUNK_PROMPT = `You are helping summarize a long source for a busy founder.

Summarize THIS SECTION ONLY of a longer document:
- Capture all important ideas, facts, arguments, and examples in this chunk.
- Emphasize anything that looks like strategy, execution, markets, psychology, or other operator/entrepreneurial lessons.
- Write in second person ("you") and in simple, clear language.
- It is fine if the chunk summary is a few paragraphs long; do not skip key details just to be short.

Output plain text only (no JSON, no markdown).`;

export type SummarizeUsage = { inputTokens: number; outputTokens: number };

export async function summarizeWithLLM(
  text: string,
  sourceLabel: string,
  customInstructions?: string
): Promise<{ result: SummaryResult; usage: SummarizeUsage }> {
  const chunks = chunkText(text);
  let fullText = text;
  let totalInput = 0;
  let totalOutput = 0;

  if (chunks.length > 1) {
    const chunkSummaries: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: CHUNK_PROMPT },
          { role: "user", content: chunks[i]!.slice(0, 14000) },
        ],
        max_tokens: 2000,
      });
      const u = res.usage;
      if (u) {
        totalInput += u.prompt_tokens ?? 0;
        totalOutput += u.completion_tokens ?? 0;
      }
      const content = res.choices[0]?.message?.content?.trim();
      if (content) chunkSummaries.push(content);
    }
    fullText = chunkSummaries.join("\n\n");
  }

  let userContent = `Source: ${sourceLabel}\n\nText to summarize for the founder:\n\n${fullText.slice(
    0,
    28000
  )}`;
  if (customInstructions && customInstructions.trim()) {
    userContent += `\n\n---\nAdditional instructions for this summary (follow these as well):\n${customInstructions.trim().slice(0, 2000)}`;
  }

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    max_tokens: 6000,
    response_format: { type: "json_object" },
  });

  const u = res.usage;
  if (u) {
    totalInput += u.prompt_tokens ?? 0;
    totalOutput += u.completion_tokens ?? 0;
  }

  const raw = res.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("Empty response from OpenAI");

  const parsed = JSON.parse(raw) as Record<string, unknown>;
  
  const deepSummarySectionsRaw = parsed.deepSummarySections;
  const deepSummarySections: DeepSummarySection[] = Array.isArray(deepSummarySectionsRaw)
    ? (deepSummarySectionsRaw as Array<{ title?: string; body?: string }>)
        .filter((s) => s && (s.title || s.body))
        .map((s) => ({ title: String(s.title ?? ""), body: String(s.body ?? "") }))
    : [];
  
  // Build flat deepSummary from sections if not provided (backward compat).
  const deepSummaryFlat = String(parsed.deepSummary ?? "").trim() ||
    deepSummarySections.map((s) => `## ${s.title}\n\n${s.body}`).join("\n\n");
  
  const keyIdeasRaw = parsed.keyIdeas;
  const keyIdeas: KeyIdea[] = Array.isArray(keyIdeasRaw)
    ? (keyIdeasRaw as Array<{ title?: string; body?: string }>)
        .filter((k) => k && (k.title || k.body))
        .map((k) => ({ title: String(k.title ?? ""), body: String(k.body ?? "") }))
    : [];

  const result: SummaryResult = {
    oneLiner: String(parsed.oneLiner ?? "").trim() || String(parsed.quickTake ?? "").slice(0, 200) || "Key ideas and takeaways from the source.",
    quickTake: String(parsed.quickTake ?? "").trim() || String(parsed.deepSummary ?? "").slice(0, 500),
    deepSummarySections: deepSummarySections.length > 0 ? deepSummarySections : [],
    deepSummary: deepSummaryFlat,
    keyIdeas,
    bullets: Array.isArray(parsed.bullets)
      ? (parsed.bullets as string[])
      : [String(parsed.bullets ?? "")],
    verdict: String(parsed.verdict ?? "Yes"),
    verdictReasons: Array.isArray(parsed.verdictReasons)
      ? (parsed.verdictReasons as string[])
      : [String(parsed.verdictReasons ?? "")],
    sourcesUsed: String(parsed.sourcesUsed ?? sourceLabel),
    founderTakeaways: Array.isArray((parsed as any).founderTakeaways)
      ? ((parsed as any).founderTakeaways as string[])
      : [],
  };
  return { result, usage: { inputTokens: totalInput, outputTokens: totalOutput } };
}
