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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, text, url, fileBase64, fileName, mimeType, title } = body as {
      type?: string;
      text?: string;
      url?: string;
      fileBase64?: string;
      fileName?: string;
      mimeType?: string;
      title?: string;
    };

    if (!type) {
      return NextResponse.json(
        { error: "Missing type: paste | file | url | podcast_title" },
        { status: 400 }
      );
    }

    let extractResult;
    if (type === "paste") {
      extractResult = await extractFromPaste(text ?? "");
    } else if (type === "file") {
      if (!fileBase64 || !fileName) {
        return NextResponse.json(
          { error: "Missing fileBase64 or fileName" },
          { status: 400 }
        );
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
      return NextResponse.json(
        { error: "Invalid type. Use paste, file, url, or podcast_title." },
        { status: 400 }
      );
    }

    if (!extractResult.ok) {
      return NextResponse.json(
        {
          error: extractResult.error,
          needsManualInput: extractResult.needsManualInput,
        },
        { status: 422 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const { result: summary, usage } = await summarizeWithLLM(
      extractResult.text,
      extractResult.source
    );

    recordSummarizeUsage(usage.inputTokens, usage.outputTokens);

    return NextResponse.json({
      deepSummary: summary.deepSummary,
      bullets: summary.bullets,
      verdict: summary.verdict,
      verdictReasons: summary.verdictReasons,
      sourcesUsed: summary.sourcesUsed,
      founderTakeaways: summary.founderTakeaways ?? [],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Summarization failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
