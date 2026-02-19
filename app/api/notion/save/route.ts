import { NextResponse } from "next/server";
import { saveToNotion, getNotionCategories, appendFollowUpToPage, parseNotionPageId } from "@/lib/notion";
import { categorizeForNotion } from "@/lib/notion-categorize";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      title?: string;
      category?: string;
      area?: string;
      topicTags?: string[];
      contentType?: string;
      sourceUrl?: string;
      oneLiner?: string;
      quickTake?: string;
      summary?: string;
      bullets?: string[];
      founderTakeaways?: string[];
      keyIdeas?: { title: string; body: string }[];
      /** When set, append follow-up to this page instead of creating a new row. */
      appendToPageId?: string;
      appendAs?: "clarification" | "research";
      appendSnippet?: string;
      appendQuestion?: string;
      appendAnswer?: string;
      appendBullets?: string[];
    };

    const appendToPageId = parseNotionPageId(body.appendToPageId ?? "");
    if (appendToPageId && (body.appendAs === "clarification" || body.appendAs === "research") && body.appendAnswer) {
      const { pageId, url } = await appendFollowUpToPage({
        pageId: appendToPageId,
        type: body.appendAs,
        snippet: body.appendSnippet,
        question: body.appendQuestion,
        answer: body.appendAnswer,
        bullets: Array.isArray(body.appendBullets) ? body.appendBullets : [],
      });
      return NextResponse.json({ pageId, url, appended: true });
    }

    const title = (body.title ?? "Untitled").trim();
    const sourceUrl = (body.sourceUrl ?? "").trim();
    const oneLiner = (body.oneLiner ?? "").trim();
    const quickTake = (body.quickTake ?? "").trim();
    const summary = (body.summary ?? "").trim();
    const bullets = Array.isArray(body.bullets) ? body.bullets : [];
    const founderTakeaways = Array.isArray(body.founderTakeaways)
      ? body.founderTakeaways
      : [];
    const keyIdeas = Array.isArray(body.keyIdeas)
      ? body.keyIdeas.filter((k) => k && (k.title || k.body))
      : [];

    let area = body.area?.trim();
    let topicTags = Array.isArray(body.topicTags) ? body.topicTags : [];
    let contentType = body.contentType?.trim();

    if (!area || topicTags.length === 0 || !contentType) {
      const categorized = await categorizeForNotion({
        titleOrSourceHint: title !== "Untitled" ? title : sourceUrl || undefined,
        summary,
        bullets,
        founderTakeaways,
      });
      area = area || categorized.area;
      topicTags = topicTags.length > 0 ? topicTags : categorized.topicTags;
      contentType = contentType || categorized.contentType;
    }

    const { pageId, url } = await saveToNotion({
      title,
      area,
      topicTags,
      contentType,
      category: body.category ?? undefined,
      sourceUrl,
      oneLiner: oneLiner || undefined,
      quickTake: quickTake || undefined,
      summary,
      bullets,
      founderTakeaways,
      keyIdeas: keyIdeas.length > 0 ? keyIdeas : undefined,
    });

    return NextResponse.json({ pageId, url });
  } catch (e: unknown) {
    let message = "Failed to save to Notion";
    if (e instanceof Error) message = e.message;
    const err = e as { body?: { message?: string; code?: string }; status?: number };
    if (err?.body?.message) message = err.body.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const categories = getNotionCategories();
    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json(
      { error: "Notion not configured" },
      { status: 503 }
    );
  }
}
