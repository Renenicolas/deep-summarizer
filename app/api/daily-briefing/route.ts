import { NextResponse } from "next/server";
import {
  updateRenoTimesFrontPage,
  upsertRenoTimesEdition,
} from "@/lib/notion";
import {
  buildEditionSections,
  editionTitle,
  type SectionContent,
} from "@/lib/daily-briefing";
import { recordLlmUsage } from "@/lib/usage";

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

  // "So what / Actionables": heading + bullets at the end of each section.
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
        hint: "The secret in the URL must exactly match CRON_SECRET. Locally: .env.local then restart (Ctrl+C, npm run dev). On VPS: .env then pm2 restart reno-times.",
      },
      { status: 401 }
    );
  }

  const isPreview = searchParams.get("preview") === "1";
  const newspaperId = process.env.NOTION_NEWSPAPER_DATABASE_ID;
  if (!isPreview && !newspaperId) {
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

    const { sections, inputTokens, outputTokens } = await buildEditionSections();

    if (isPreview) {
      return NextResponse.json({
        preview: true,
        title,
        date: dateStr,
        editionDateLabel: now.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        sections: sections.map((s) => ({
          id: s.id,
          title: s.title,
          tldr: s.tldr,
          bullets: s.bullets ?? [],
          sources: s.sources ?? [],
        })),
      });
    }

    if (!isPreview && (inputTokens > 0 || outputTokens > 0)) {
      recordLlmUsage(inputTokens, outputTokens, "daily_briefing");
    }

    const newspaperDbId = process.env.NOTION_NEWSPAPER_DATABASE_ID ?? "";
    const editionsUrl = newspaperDbId
      ? `https://www.notion.so/${newspaperDbId.replace(/-/g, "")}`
      : "";

    const runNowUrl = (process.env.RENO_TIMES_RUN_NOW_URL ?? "").trim();
    const appBaseUrl = runNowUrl ? runNowUrl.replace(/\?.*$/, "").replace(/\/api\/daily-briefing\/?$/, "").replace(/\/$/, "") : "";
    const clarifyUrl = appBaseUrl ? `${appBaseUrl}/clarify` : "";
    const frontPageId = (process.env.NOTION_RENO_TIMES_FRONT_PAGE_ID ?? "").trim();

  // Single line: "Generate today's edition" link only. Clarify lives in the embed at the bottom (no extra button at the top).
    const actionLinksBlock =
    runNowUrl
        ? {
            object: "block" as const,
            type: "paragraph" as const,
            paragraph: {
              rich_text: [
              {
                type: "text" as const,
                text: {
                  content: "Generate today's edition",
                  link: { url: (runNowUrl + (runNowUrl.includes("?") ? "&" : "?") + "redirect=1").slice(0, 2000) },
                },
              },
              ],
            },
          } as object
        : null;

    // Discreet "View all editions" at bottom.
    const viewAllEditionsBlock = editionsUrl
      ? {
          object: "block" as const,
          type: "paragraph" as const,
          paragraph: {
            rich_text: [
              { type: "text" as const, text: { content: "📰 " } },
              { type: "text" as const, text: { content: "View all editions", link: { url: editionsUrl } } },
            ],
          },
        } as object
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

    const sectionBlocks: object[] = [];
    for (const section of sections) {
      sectionBlocks.push(...sectionToBlocks(section));
    }

    // Edition content (no Clarify embed): used for Editions DB and as base for front page.
    const editionChildren: object[] = [];
    editionChildren.push(editionDateBlock);
    if (actionLinksBlock) editionChildren.push(actionLinksBlock);
    const dividerBlock = {
      object: "block" as const,
      type: "divider" as const,
      divider: {},
    } as object;
    editionChildren.push(dividerBlock);
    editionChildren.push(...sectionBlocks);
    if (viewAllEditionsBlock) editionChildren.push(viewAllEditionsBlock);

    // Replace today's edition (update existing row for this date or create one).
    const { url } = await upsertRenoTimesEdition({
      title,
      date: dateStr,
      children: editionChildren,
    });

    // Front page: same content + Clarify embed at bottom so they can clarify without opening a new tab.
    const frontPageChildren: object[] = [...editionChildren];
    if (clarifyUrl && frontPageId) {
      const clarifyEmbedUrl = `${clarifyUrl}?appendTo=${encodeURIComponent(frontPageId)}`;
      frontPageChildren.push({
        object: "block" as const,
        type: "heading_3" as const,
        heading_3: { rich_text: [{ type: "text" as const, text: { content: "Clarify a section" } }] },
      } as object);
      frontPageChildren.push({
        object: "block" as const,
        type: "embed" as const,
        embed: { url: clarifyEmbedUrl.slice(0, 2000) },
      } as object);
    }

    try {
      await updateRenoTimesFrontPage(frontPageChildren);
    } catch (e) {
      console.error("Front page update failed (set NOTION_RENO_TIMES_FRONT_PAGE_ID to enable):", e);
    }

    // If they opened the link in a browser with ?redirect=1, send them to Notion so they see the newspaper instead of a blank JSON page.
    const wantRedirect = searchParams.get("redirect") === "1" || searchParams.get("redirect") === "true";
    const notionFrontPageId = (process.env.NOTION_RENO_TIMES_FRONT_PAGE_ID ?? "").trim();
    if (wantRedirect && notionFrontPageId) {
      const notionPageUrl = `https://www.notion.so/${notionFrontPageId.replace(/-/g, "")}`;
      return NextResponse.redirect(notionPageUrl, 302);
    }

    return NextResponse.json({
      ok: true,
      message: "Today's Reno Times edition replaced (one edition per day). Front page and Editions updated.",
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
