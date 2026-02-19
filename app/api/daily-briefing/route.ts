import { NextResponse } from "next/server";
import {
  createRenoTimesEdition,
} from "@/lib/notion";
import {
  buildEditionSections,
  editionTitle,
  type SectionContent,
} from "@/lib/daily-briefing";

function richText(content: string) {
  return [{ type: "text" as const, text: { content: content.slice(0, 2000) } }];
}

function heading2(content: string) {
  return {
    object: "block" as const,
    type: "heading_2" as const,
    heading_2: { rich_text: richText(content) },
  };
}

function paragraph(content: string) {
  return {
    object: "block" as const,
    type: "paragraph" as const,
    paragraph: { rich_text: richText(content) },
  };
}

function bulletedItem(content: string) {
  return {
    object: "block" as const,
    type: "bulleted_list_item" as const,
    bulleted_list_item: { rich_text: richText(content) },
  };
}

function sectionToBlocks(section: SectionContent): object[] {
  const blocks: object[] = [];
  blocks.push(heading2(section.title));
  blocks.push(paragraph(section.tldr));
  for (const b of section.bullets ?? []) {
    blocks.push(bulletedItem(b));
  }
  return blocks;
}

/**
 * The Reno Times – daily briefing.
 * Runs as early as possible (cron at 5–6 AM). Creates today's edition in The Reno Times – Editions database.
 * All editions stay in the Editions database; the front page view (filtered to today) automatically shows only today's edition.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const newspaperId = process.env.NOTION_NEWSPAPER_DATABASE_ID;
  if (!newspaperId) {
    return NextResponse.json(
      {
        error:
          "NOTION_NEWSPAPER_DATABASE_ID must be set. See FULL_SETUP_INSTRUCTIONS.md.",
      },
      { status: 400 }
    );
  }

  try {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const title = editionTitle(now);

    const sections = await buildEditionSections();
    const children: object[] = [];
    for (const section of sections) {
      children.push(...sectionToBlocks(section));
    }

    const { pageId: newPageId, url } = await createRenoTimesEdition({
      title,
      date: dateStr,
      children,
    });

    return NextResponse.json({
      ok: true,
      message: "The Reno Times edition created in Editions database. All editions stay there; your front page view shows only today's.",
      editionUrl: url,
      editionTitle: title,
      date: dateStr,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Daily briefing failed";
    console.error("Daily briefing error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
