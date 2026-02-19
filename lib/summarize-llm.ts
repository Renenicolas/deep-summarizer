import OpenAI from "openai";
import { chunkText } from "./extract-text";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type KeyIdea = { title: string; body: string };

export type SummaryResult = {
  /** One sentence: the core idea or takeaway. */
  oneLiner: string;
  /** 2–4 sentences: quick take (≈30 seconds). */
  quickTake: string;
  /** 5–8 key ideas, Blinkist-style: each body 150–300 words, standalone and memorable. */
  keyIdeas: KeyIdea[];
  deepSummary: string;
  bullets: string[];
  verdict: string;
  verdictReasons: string[];
  sourcesUsed: string;
  founderTakeaways?: string[];
};

const SYSTEM_PROMPT = `You are an expert summarizer and operator coach, like Blinkist but deeper and tailored to one reader.

User profile:
- You are speaking to a busy founder ("Rene") building a three-sided marketplace in the medical field (Kinnect).
- Rene does not want to read or listen to the full source; your job is to be their eyes and ears and give them everything that matters in a scannable, layered format.

Output layers (from fastest to deepest):
1. **One liner** – One sentence that captures the single most important idea or takeaway.
2. **Quick take** – 2–4 sentences (≈30 seconds): what this is, why it matters, and the main implication for Rene.
3. **Key ideas** – 5–8 standalone "Blinks": each has a short title and a 150–300 word body that explains one major insight so Rene could remember and use it without reading the rest. No filler; each key idea is memorable and actionable. Order by importance or narrative flow.
4. **Deep summary** – Full narrative that walks Rene through the content: overview, then section-by-section or theme-by-theme. Cover important arguments, edge cases, frameworks, and examples. Use third person for the speaker/author; use second person when addressing Rene. Only when needed for clarity, add a bit more detail so they truly understand.
5. **Bullets** – 5–15 short actionable takeaways (tactics, warnings, mental models) for a founder.
6. **Verdict** – Should Rene read/listen to the full source? Yes or No, plus 2–4 reasons.
7. **Founder takeaways** – 3–10 paragraph-style takeaways written directly to Rene: how to apply this to Kinnect, healthcare, marketplaces, and their life. Like a mentor talking to them.

Rules:
- Absolutely no hallucinations: only facts, ideas, and examples clearly present in the text.
- Prioritize strategy, positioning, moat, growth, marketplace dynamics, pricing, retention, execution, hiring, leadership, mental models, and anything relevant to healthcare/medical or three-sided marketplaces.
- When the source is dense or academic, explain in plain English and add a short example from the text where it helps.

Respond only with valid JSON in this exact shape (no markdown, no extra text):
{
  "oneLiner": "Single sentence: the core idea or takeaway.",
  "quickTake": "2-4 sentences: what this is, why it matters, main implication for Rene.",
  "keyIdeas": [
    { "title": "Short title of key idea 1", "body": "150-300 words. Standalone explanation of this insight, memorable and actionable. No filler." },
    { "title": "Short title of key idea 2", "body": "..." },
    "5-8 key ideas total"
  ],
  "deepSummary": "Full multi-paragraph narrative: Overview, then section-by-section. Third person for author/speaker, second person when talking to Rene. Include important detail where needed for real understanding.",
  "bullets": [
    "5-15 short actionable bullets for the founder.",
    "..."
  ],
  "verdict": "Yes" or "No",
  "verdictReasons": [
    "2-4 short reasons in second person.",
    "..."
  ],
  "sourcesUsed": "Brief note on what kind of source this is (e.g. long-form podcast, technical paper, tactical blog), from signals in the text.",
  "founderTakeaways": [
    "3-10 paragraph-style takeaways for Rene: how to apply to Kinnect, healthcare, marketplaces, life.",
    "..."
  ]
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
  sourceLabel: string
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

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Source: ${sourceLabel}\n\nText to summarize for the founder:\n\n${fullText.slice(
          0,
          28000
        )}`,
      },
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
  const keyIdeasRaw = parsed.keyIdeas;
  const keyIdeas: KeyIdea[] = Array.isArray(keyIdeasRaw)
    ? (keyIdeasRaw as Array<{ title?: string; body?: string }>)
        .filter((k) => k && (k.title || k.body))
        .map((k) => ({ title: String(k.title ?? ""), body: String(k.body ?? "") }))
    : [];

  const result: SummaryResult = {
    oneLiner: String(parsed.oneLiner ?? "").trim() || String(parsed.quickTake ?? "").slice(0, 200) || "Key ideas and takeaways from the source.",
    quickTake: String(parsed.quickTake ?? "").trim() || String(parsed.deepSummary ?? "").slice(0, 500),
    keyIdeas,
    deepSummary: String(parsed.deepSummary ?? ""),
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
