import { NextResponse } from "next/server";
import OpenAI from "openai";
import { recordLlmUsage } from "@/lib/usage";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are a research assistant for a busy founder ("Rene") building a three-sided marketplace in the medical field.

Your job:
- Answer the user's question accurately and in plain language.
- Break down complex concepts into simple, scannable parts.
- When relevant, explain how the answer affects: their company (Kinnect), markets, macro, personal decisions, or entrepreneurship/finance.
- If something is time-sensitive or depends on real-time data, say so clearly (e.g. "For the latest numbers, check ...").
- Do not invent facts or sources; if you're unsure, say so.
- Prefer structure: short paragraphs, bullet points where helpful.

Respond with valid JSON only, no markdown:
{
  "answer": "Full answer text, with paragraphs and optional bullets in plain text.",
  "bullets": ["Up to 5–8 short bullet takeaways for saving to Notion.", "..."]
}`;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { question?: string };
    const question = (body.question ?? "").trim();
    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: question },
      ],
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) throw new Error("No response from model");

    const usage = response.usage;
    if (usage?.input_tokens != null && usage?.output_tokens != null) {
      recordLlmUsage(usage.input_tokens, usage.output_tokens, "research");
    }

    const parsed = JSON.parse(raw) as { answer?: string; bullets?: string[] };
    const answer = typeof parsed.answer === "string" ? parsed.answer : "";
    const bullets = Array.isArray(parsed.bullets) ? parsed.bullets : [];

    return NextResponse.json({ answer, bullets });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Research request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
