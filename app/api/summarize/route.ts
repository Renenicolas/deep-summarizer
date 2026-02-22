import { NextResponse } from "next/server";
import {
  extractFromPaste,
  extractFromFile,
  extractFromUrl,
  extractFromPodcastTitle,
} from "@/lib/extract-text";
import { summarizeWithLLM } from "@/lib/summarize-llm";
import { recordSummarizeUsage } from "@/lib/usage";

export const maxDuration = 60;

function jsonResponse(data: object, status: number) {
  return NextResponse.json(data, { status, headers: { "Content-Type": "application/json" } });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { type, text, url, fileBase64, fileName, mimeType, title, customInstructions } = body as {
      type?: string;
      text?: string;
      url?: string;
      fileBase64?: string;
      fileName?: string;
      mimeType?: string;
      title?: string;
      /** Optional: e.g. "Focus on chapters 3–5" or "Break down the GTM section in more detail" */
      customInstructions?: string;
    };

    if (!type) {
      return jsonResponse({ error: "Missing type: paste | file | url | podcast_title" }, 400);
    }

    let extractResult;
    if (type === "paste") {
      extractResult = await extractFromPaste(text ?? "");
    } else if (type === "file") {
      if (!fileBase64 || !fileName) {
        return jsonResponse({ error: "Missing fileBase64 or fileName" }, 400);
      }
      extractResult = await extractFromFile(
        fileBase64,
        fileName,
        mimeType
      );
    } else if (type === "url") {
      extractResult = await extractFromUrl(url ?? "");
    } else if (type === "podcast_title") {
      extractResult = await extractFromPodcastTitle(title ?? "");
    } else {
      return jsonResponse({ error: "Invalid type. Use paste, file, url, or podcast_title." }, 400);
    }

    if (!extractResult.ok) {
      return jsonResponse(
        { error: extractResult.error, needsManualInput: extractResult.needsManualInput },
        422
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonResponse(
        { error: "OPENAI_API_KEY is not set in Vercel. Add it in Project → Settings → Environment Variables, then redeploy." },
        500
      );
    }

    const { result: summary, usage } = await summarizeWithLLM(
      extractResult.text,
      extractResult.source,
      (customInstructions ?? "").trim() || undefined
    );

    recordSummarizeUsage(usage.inputTokens, usage.outputTokens);

    return NextResponse.json({
      oneLiner: summary.oneLiner,
      quickTake: summary.quickTake,
      deepSummary: summary.deepSummary,
      deepSummarySections: summary.deepSummarySections,
      keyIdeas: summary.keyIdeas,
      bullets: summary.bullets,
      verdict: summary.verdict,
      verdictReasons: summary.verdictReasons,
      sourcesUsed: summary.sourcesUsed,
      founderTakeaways: summary.founderTakeaways ?? [],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Summarization failed";
    return jsonResponse({ error: message }, 500);
  }
}
