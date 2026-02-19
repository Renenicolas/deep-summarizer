import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are helping a busy founder ("Rene") get quick clarification on something they highlighted—often from a news brief (e.g. The Reno Times) or any article.

You receive:
1. A snippet of text they selected (a sentence, paragraph, or bullet).
2. An optional question (e.g. "How does this affect Kinnect?" or "What does this mean for markets?"). If no question is given, explain what it means and how it could affect: their company (Kinnect), relevant markets, macro, and them personally/entrepreneurially.

Your job:
- Give a short, clear answer (sidebar-style: a few sentences or a few bullets). No long essays.
- Focus on: what this means, why it matters, and how it could affect the things they care about (Kinnect, healthcare, markets, macro, personal/financial).
- If the snippet is jargon or dense, explain it in plain English first, then add impact.
- Do not invent facts; base your answer on the snippet and general knowledge. If something is uncertain, say so.

Respond with valid JSON only, no markdown:
{
  "answer": "Your clarification: 2-6 sentences or equivalent in bullets, focused and scannable.",
  "bullets": ["Optional 2-4 short takeaways for saving to Notion.", "..."]
}`;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { snippet?: string; question?: string };
    const snippet = (body.snippet ?? "").trim();
    if (!snippet) {
      return NextResponse.json({ error: "Snippet is required (paste the text you want clarified)" }, { status: 400 });
    }

    const question = (body.question ?? "").trim();
    const userMessage = question
      ? `Snippet they highlighted:\n\n"${snippet.slice(0, 4000)}"\n\nTheir question: ${question}`
      : `Snippet they highlighted:\n\n"${snippet.slice(0, 4000)}"\n\nExplain what this means and how it could affect Kinnect, markets, macro, and them personally/entrepreneurially.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) throw new Error("No response from model");

    const parsed = JSON.parse(raw) as { answer?: string; bullets?: string[] };
    const answer = typeof parsed.answer === "string" ? parsed.answer : "";
    const bullets = Array.isArray(parsed.bullets) ? parsed.bullets : [];

    return NextResponse.json({ answer, bullets });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Clarification request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
