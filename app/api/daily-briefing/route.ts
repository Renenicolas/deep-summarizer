import { NextResponse } from "next/server";
import {
  createRenoTimesEdition,
  updateRenoTimesFrontPage,
} from "@/lib/notion";
import {
  buildEditionSections,
  editionTitle,
  type SectionContent,
} from "@/lib/daily-briefing";

/** Allow up to 5 minutes so RSS + LLM can finish (Vercel Pro supports 300s; Hobby may cap at 10s – if you get no response, upgrade or run locally). */
export const maxDuration = 300;

function richText(content: string | undefined) {
  const text = typeof content === "string" ? content : "";
  return [{ type: "text" as const, text: { content: text.slice(0, 2000) } }];
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

function paragraphWithLinks(links: { label?: string; url?: string }[] | undefined): object {
  const parts: { type: "text"; text: { content: string; link?: { url: string } } }[] = [];
  const valid = (links ?? []).filter((l) => l && typeof l.url === "string" && l.url.trim()).slice(0, 6);
  if (valid.length === 0) {
    return { object: "block" as const, type: "paragraph" as const, paragraph: { rich_text: [{ type: "text" as const, text: { content: "" } }] } };
  }
  parts.push({ type: "text", text: { content: "Read further: " } });
  valid.forEach((l, i) => {
    if (i > 0) parts.push({ type: "text", text: { content: " · " } });
    parts.push({
      type: "text",
      text: { content: (l.label || "Source").slice(0, 100), link: { url: (l.url || "").slice(0, 2000) } },
    });
  });
  return {
    object: "block" as const,
    type: "paragraph" as const,
    paragraph: { rich_text: parts },
  };
}

function sectionToBlocks(section: SectionContent): object[] {
  const blocks: object[] = [];
  const title = typeof section.title === "string" ? section.title : "Section";
  const tldr = typeof section.tldr === "string" ? section.tldr : "";
  blocks.push(heading2(title));
  blocks.push(paragraph(tldr));
  
  const bullets = Array.isArray(section.bullets) ? section.bullets : [];
  const soWhatIndex = bullets.findIndex((b) => typeof b === "string" && (b.toLowerCase().includes("so what") || b.toLowerCase().includes("actionables")));
  const contentBullets = soWhatIndex >= 0 ? bullets.slice(0, soWhatIndex) : bullets;
  const soWhatBullets = soWhatIndex >= 0 ? bullets.slice(soWhatIndex) : [];
  
  // Content: paragraphs (thoughtful but concise, like Finimize/Morning Brew).
  for (const b of contentBullets) {
    const str = typeof b === "string" ? b : String(b ?? "");
    if (str.trim()) blocks.push(paragraph(str));
  }
  
  // "So what / Actionables": bullets.
  if (soWhatBullets.length > 0) {
    blocks.push(heading3("So what for you / Actionables"));
    for (const b of soWhatBullets) {
      const str = typeof b === "string" ? b : String(b ?? "");
      if (str.trim()) blocks.push(bulletedItem(str.replace(/^So what\s*\/?\s*Actionables\s*:?\s*/i, "").trim() || str));
    }
  }
  
  if (section.sources?.length) {
    blocks.push(paragraphWithLinks(section.sources));
  }
  return blocks;
}

function heading3(content: string) {
  return {
    object: "block" as const,
    type: "heading_3" as const,
    heading_3: { rich_text: richText(content) },
  };
}

/**
 * The Reno Times – daily briefing.
 * Runs as early as possible (cron at 5–6 AM). Creates today's edition in The Reno Times – Editions database.
 * All editions stay in the Editions database; the front page view (filtered to today) automatically shows only today's edition.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = (searchParams.get("secret") ?? "").trim();
  const cronSecret = (process.env.CRON_SECRET ?? "").trim();
  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        hint: "The secret in the URL must exactly match CRON_SECRET in .env.local. If you just changed .env.local, restart the app (Ctrl+C, then npm run dev).",
      },
      { status: 401 }
    );
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
    const newspaperDbId = process.env.NOTION_NEWSPAPER_DATABASE_ID ?? "";
    const editionsUrl = newspaperDbId
      ? `https://www.notion.so/${newspaperDbId.replace(/-/g, "")}`
      : "";

    const runNowUrl = (process.env.RENO_TIMES_RUN_NOW_URL ?? "").trim();
    const appBaseUrl = runNowUrl ? runNowUrl.replace(/\?.*$/, "").replace(/\/api\/daily-briefing\/?$/, "").replace(/\/$/, "") : "";
    const clarifyUrl = appBaseUrl ? `${appBaseUrl}/clarify` : "";

    const runNowCallout =
      runNowUrl &&
      ({
        object: "block" as const,
        type: "callout" as const,
        callout: {
          icon: { type: "emoji" as const, emoji: "🔄" as const },
          rich_text: [
            {
              type: "text" as const,
              text: {
                content: "Generate today's Reno Times",
                link: { url: runNowUrl.slice(0, 2000) },
              },
            },
          ],
          color: "blue_background" as const,
        },
      } as object);

    const clarifyCallout =
      clarifyUrl &&
      ({
        object: "block" as const,
        type: "callout" as const,
        callout: {
          icon: { type: "emoji" as const, emoji: "💬" as const },
          rich_text: [
            {
              type: "text" as const,
              text: {
                content: "Go deeper on any point (Clarify)",
                link: { url: clarifyUrl.slice(0, 2000) },
              },
            },
          ],
          color: "gray_background" as const,
        },
      } as object);

    const calloutBlock = editionsUrl
      ? {
          object: "block" as const,
          type: "callout" as const,
          callout: {
            icon: { type: "emoji" as const, emoji: "📰" as const },
            rich_text: [
              { type: "text" as const, text: { content: "View all editions", link: { url: editionsUrl } } },
            ],
            color: "gray_background" as const,
          },
        }
      : null;

    const editionDateLabel = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const editionDateBlock = {
      object: "block" as const,
      type: "callout" as const,
      callout: {
        icon: { type: "emoji" as const, emoji: "📅" as const },
        rich_text: [{ type: "text" as const, text: { content: editionDateLabel } }],
        color: "gray_background" as const,
      },
    } as object;

    const leftColumnBlocks: object[] = [editionDateBlock];
    for (const section of sections) {
      leftColumnBlocks.push(...sectionToBlocks(section));
    }

    // Order: Run now + Clarify at top, then two-column (newsletter | View all editions).
    const children: object[] = [];
    if (runNowCallout) {
      children.push(runNowCallout);
    }
    if (clarifyCallout) {
      children.push(clarifyCallout);
    }
    const dividerBlock = {
      object: "block" as const,
      type: "divider" as const,
      divider: {},
    } as object;
    children.push(dividerBlock);
    if (calloutBlock && leftColumnBlocks.length > 0) {
      children.push({
        object: "block" as const,
        type: "column_list" as const,
        column_list: {},
        children: [
          {
            object: "block" as const,
            type: "column" as const,
            column: { width_ratio: 0.82 },
            children: leftColumnBlocks,
          },
          {
            object: "block" as const,
            type: "column" as const,
            column: { width_ratio: 0.18 },
            children: [calloutBlock],
          },
        ],
      } as any);
    } else if (calloutBlock) {
      children.push(calloutBlock);
    }
    if (leftColumnBlocks.length > 0 && children.length === 0) {
      children.push(...leftColumnBlocks);
    }

    const frontPageId = (process.env.NOTION_RENO_TIMES_FRONT_PAGE_ID ?? "").trim();
    if (clarifyUrl && frontPageId) {
      children.push({
        object: "block" as const,
        type: "embed" as const,
        embed: {
          url: `${clarifyUrl}?appendTo=${encodeURIComponent(frontPageId)}`,
        },
      } as object);
    }

    const { pageId: newPageId, url } = await createRenoTimesEdition({
      title,
      date: dateStr,
      children,
    });

    try {
      await updateRenoTimesFrontPage(children);
    } catch (e) {
      console.error("Front page update failed (set NOTION_RENO_TIMES_FRONT_PAGE_ID to enable):", e);
    }

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
