import { Client } from "@notionhq/client";
import { AREAS } from "./notion-categorize";

export type NotionCategory = (typeof AREAS)[number];

export function getNotionCategories(): string[] {
  return [...AREAS];
}

function richText(content: string): { type: "text"; text: { content: string } }[] {
  return [{ type: "text" as const, text: { content } }];
}

function paragraphBlock(content: string) {
  return {
    object: "block" as const,
    type: "paragraph" as const,
    paragraph: { rich_text: richText(content) },
  };
}

function heading2Block(content: string) {
  return {
    object: "block" as const,
    type: "heading_2" as const,
    heading_2: { rich_text: richText(content) },
  };
}

function bulletedListItemBlock(content: string) {
  return {
    object: "block" as const,
    type: "bulleted_list_item" as const,
    bulleted_list_item: { rich_text: richText(content) },
  };
}

function heading3Block(content: string) {
  return {
    object: "block" as const,
    type: "heading_3" as const,
    heading_3: { rich_text: [{ type: "text" as const, text: { content } }] },
  };
}

export async function saveToNotion(params: {
  title: string;
  area?: string;
  topicTags?: string[];
  contentType?: string;
  category?: string;
  sourceUrl: string;
  oneLiner?: string;
  quickTake?: string;
  summary: string;
  bullets?: string[];
  founderTakeaways: string[];
  keyIdeas?: { title: string; body: string }[];
  deepSummarySections?: { title: string; body: string }[];
  verdict?: string;
  verdictReasons?: string[];
}): Promise<{ pageId: string; url: string }> {
  const apiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!apiKey || !databaseId) {
    throw new Error("NOTION_API_KEY and NOTION_DATABASE_ID must be set in .env.local");
  }

  const notion = new Client({ auth: apiKey });

  const areas = getNotionCategories();
  const areaName =
    params.area && areas.includes(params.area) ? params.area : params.category && areas.includes(params.category) ? params.category : "Other";
  const topicTags = Array.isArray(params.topicTags) ? params.topicTags.slice(0, 10) : [];
  const contentType = params.contentType ?? "Other";

  const children: object[] = [];

  if (params.oneLiner) {
    children.push(heading2Block("In one sentence"), paragraphBlock(params.oneLiner));
  }
  if (params.quickTake) {
    children.push(heading2Block("Quick take"), ...params.quickTake.split(/\n\n+/).filter(Boolean).map((p) => paragraphBlock(p)));
  }

  // FRONT: Should I read the full source?
  if (params.verdict) {
    children.push(heading2Block("Should you read or listen to the full source?"));
    children.push(paragraphBlock(params.verdict));
    if (params.verdictReasons && params.verdictReasons.length > 0) {
      params.verdictReasons.forEach((r) => children.push(paragraphBlock(r)));
    }
  }

  // PAGE 1: Deep Summary (Blinkist-style sections)
  if (params.deepSummarySections && params.deepSummarySections.length > 0) {
    children.push(heading2Block("Deep Summary (Blinkist-style)"));
    params.deepSummarySections.forEach((s) => {
      children.push(heading3Block(s.title), paragraphBlock(s.body));
    });
  } else {
    children.push(heading2Block("Deep Summary"));
    const summaryParas = params.summary.split(/\n\n+/).filter(Boolean);
    if (summaryParas.length > 0) {
      summaryParas.forEach((p) => children.push(paragraphBlock(p)));
    } else {
      children.push(paragraphBlock(params.summary || "(No summary.)"));
    }
  }

  // PAGE 2: Founder Takeaways & Real-World Applications
  if (params.founderTakeaways.length > 0) {
    children.push(heading2Block("Founder Takeaways & Real-World Applications"));
    params.founderTakeaways.forEach((t) => children.push(paragraphBlock(t)));
  }

  const properties: Record<string, unknown> = {
    Name: {
      title: [{ type: "text", text: { content: params.title.slice(0, 2000) } }],
    },
    Area: { select: { name: areaName } },
    "Content Type": { select: { name: contentType } },
    "Source URL": params.sourceUrl ? { url: params.sourceUrl } : { url: null },
  };
  if (topicTags.length > 0) {
    (properties as any)["Topic Tags"] = {
      multi_select: topicTags.map((name) => ({ name })),
    };
  }

  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: properties as any,
    children: children as any,
  });

  const pageId = (response as { id: string }).id;
  const url = (response as { url?: string }).url ?? `https://notion.so/${pageId.replace(/-/g, "")}`;
  return { pageId, url };
}

/** Extract Notion page ID from a URL or raw ID (32-char hex, with or without hyphens). */
export function parseNotionPageId(input: string): string | null {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return null;
  if (/^[a-f0-9-]{32,36}$/i.test(trimmed)) return trimmed.replace(/-/g, "");
  try {
    if (trimmed.includes("notion.so")) {
      const path = new URL(trimmed.startsWith("http") ? trimmed : "https://notion.so/" + trimmed).pathname;
      const segment = path.split("/").filter(Boolean).pop() ?? "";
      const id = segment.split("?")[0];
      if (/^[a-f0-9-]{32,36}$/i.test(id)) return id.replace(/-/g, "");
      if (id.length >= 32) {
        const hex = id.replace(/-/g, "").slice(-32);
        if (/^[a-f0-9]{32}$/i.test(hex)) return hex;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function toggleBlock(title: string, children: object[]) {
  return {
    object: "block" as const,
    type: "toggle" as const,
    toggle: {
      rich_text: [{ type: "text" as const, text: { content: title.slice(0, 2000) } }],
      color: "default" as const,
      children: children as any,
    },
  };
}

/** Get plain text from a Notion rich_text array. */
function getBlockPlainText(block: any): string {
  const rt = block?.heading_2?.rich_text ?? block?.heading_1?.rich_text ?? block?.paragraph?.rich_text ?? [];
  return (Array.isArray(rt) ? rt : [])
    .map((r: any) => r?.plain_text ?? "")
    .join("")
    .trim();
}

/**
 * Find a heading_2 block on the page whose text contains or equals sectionTitle.
 * Returns the block id or null.
 */
async function findSectionHeadingBlockId(
  notion: Client,
  pageId: string,
  sectionTitle: string
): Promise<string | null> {
  const normalized = sectionTitle.trim().toLowerCase();
  if (!normalized) return null;
  let cursor: string | undefined;
  do {
    const list = (await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100,
      start_cursor: cursor,
    })) as { results?: any[]; next_cursor?: string };
    const blocks = list.results ?? [];
    for (const block of blocks) {
      if (block.type === "heading_2") {
        const text = getBlockPlainText(block).toLowerCase();
        if (text === normalized || text.includes(normalized) || normalized.includes(text)) {
          return block.id;
        }
      }
      if (block.type === "column_list" && block.id) {
        const colList = (await notion.blocks.children.list({
          block_id: block.id,
          page_size: 10,
        })) as { results?: any[] };
        const cols = colList.results ?? [];
        for (const col of cols) {
          if (col.type === "column" && col.id) {
            const childList = (await notion.blocks.children.list({
              block_id: col.id,
              page_size: 100,
            })) as { results?: any[] };
            const childBlocks = childList.results ?? [];
            for (const b of childBlocks) {
              if (b.type === "heading_2") {
                const text = getBlockPlainText(b).toLowerCase();
                if (text === normalized || text.includes(normalized) || normalized.includes(text)) {
                  return b.id;
                }
              }
            }
          }
        }
      }
    }
    cursor = list.next_cursor ?? undefined;
  } while (cursor);
  return null;
}

/**
 * Append a "Follow-up" section (clarification or research) to an existing Notion page as a toggle.
 * If sectionTitle is provided and the page has a heading_2 matching it, the toggle is added as a child of that section (so it appears under that section). Otherwise appended to the page.
 */
export async function appendFollowUpToPage(params: {
  pageId: string;
  type: "clarification" | "research";
  snippet?: string;
  question?: string;
  answer: string;
  bullets: string[];
  sectionTitle?: string;
}): Promise<{ pageId: string; url: string }> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) throw new Error("NOTION_API_KEY must be set in .env.local");

  const notion = new Client({ auth: apiKey });
  const pageId = params.pageId.replace(/-/g, "");

  const label = params.type === "clarification" ? "Clarification" : "Research";
  const titlePreview = params.snippet
    ? params.snippet.slice(0, 80).replace(/\n/g, " ") + (params.snippet.length > 80 ? "…" : "")
    : params.question
      ? params.question.slice(0, 80) + (params.question.length > 80 ? "…" : "")
      : label;

  const innerChildren: object[] = [];
  if (params.snippet) {
    innerChildren.push(paragraphBlock("Snippet: " + params.snippet.slice(0, 1500)));
  }
  if (params.question) {
    innerChildren.push(paragraphBlock("Question: " + params.question));
  }
  innerChildren.push(paragraphBlock(params.answer));
  if (params.bullets.length > 0) {
    params.bullets.forEach((b) => innerChildren.push(bulletedListItemBlock(b)));
  }

  const toggle = toggleBlock(`${label}: ${titlePreview}`, innerChildren);

  const sectionTitle = (params.sectionTitle ?? "").trim();
  if (sectionTitle) {
    const sectionBlockId = await findSectionHeadingBlockId(notion, pageId, sectionTitle);
    if (sectionBlockId) {
      await notion.blocks.children.append({
        block_id: sectionBlockId,
        children: [toggle] as any,
      });
      const url = `https://notion.so/${pageId}`;
      return { pageId, url };
    }
  }

  await notion.blocks.children.append({
    block_id: pageId,
    children: [toggle] as any,
  });

  const url = `https://notion.so/${pageId}`;
  return { pageId, url };
}

/** Create a new edition in The Reno Times – Editions database. */
export async function createRenoTimesEdition(params: {
  title: string;
  date: string;
  children: object[];
}): Promise<{ pageId: string; url: string }> {
  const apiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_NEWSPAPER_DATABASE_ID;
  if (!apiKey || !databaseId) throw new Error("NOTION_API_KEY and NOTION_NEWSPAPER_DATABASE_ID must be set");

  const notion = new Client({ auth: apiKey });
  const baseCreate = (props: any) =>
    notion.pages.create({
      parent: { database_id: databaseId.replace(/-/g, "") },
      properties: props,
      children: params.children as any,
      icon: { type: "emoji" as const, emoji: "📰" },
    });

  let response: any;
  try {
    response = await baseCreate({
      Name: { title: [{ type: "text", text: { content: params.title.slice(0, 2000) } }] },
      Date: { date: { start: params.date } },
    } as any);
  } catch (e: any) {
    const msg = String(e?.body?.message ?? e?.message ?? "");
    if (msg.toLowerCase().includes("date is not a property")) {
      response = await baseCreate({
        Name: { title: [{ type: "text", text: { content: params.title.slice(0, 2000) } }] },
      } as any);
    } else {
      throw e;
    }
  }
  const pageId = (response as { id: string }).id;
  const url = (response as { url?: string }).url ?? `https://notion.so/${pageId.replace(/-/g, "")}`;
  return { pageId, url };
}

/** Update the Reno Times "front page" so it shows today's newsletter content. Clears the page and appends the given blocks. Set NOTION_RENO_TIMES_FRONT_PAGE_ID in env. */
export async function updateRenoTimesFrontPage(children: object[]): Promise<void> {
  const apiKey = process.env.NOTION_API_KEY;
  const frontPageId = process.env.NOTION_RENO_TIMES_FRONT_PAGE_ID;
  if (!apiKey || !frontPageId) return;

  const notion = new Client({ auth: apiKey });
  const pageId = frontPageId.replace(/-/g, "");

  let cursor: string | undefined;
  do {
    const list = (await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100,
      start_cursor: cursor,
    })) as { results?: { id: string }[]; next_cursor?: string };
    const blocks = list.results ?? [];
    for (const block of blocks) {
      try {
        await notion.blocks.delete({ block_id: block.id });
      } catch {
        // ignore
      }
    }
    cursor = list.next_cursor ?? undefined;
  } while (cursor);

  const chunkSize = 100;
  for (let i = 0; i < children.length; i += chunkSize) {
    const chunk = children.slice(i, i + chunkSize);
    await notion.blocks.children.append({
      block_id: pageId,
      children: chunk as any,
    });
  }
}

/** List page IDs in The Reno Times – Editions database. (Currently unused; editions stay in the database.) */
export async function listNewspaperEditionPageIds(): Promise<string[]> {
  const apiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_NEWSPAPER_DATABASE_ID;
  if (!apiKey || !databaseId) return [];

  const notion = new Client({ auth: apiKey });
  const id = databaseId.replace(/-/g, "");
  try {
    const response = await notion.dataSources.query({
      data_source_id: id,
      page_size: 50,
      result_type: "page",
    });
    const results = (response as { results?: { id?: string }[] }).results ?? [];
    return results.map((p) => p.id).filter((id): id is string => Boolean(id));
  } catch {
    return [];
  }
}

/** Move a page into the Knowledge Bank database and set Area = Daily Briefing, Content Type = News. */
export async function movePageToKnowledgeBank(pageId: string): Promise<void> {
  const apiKey = process.env.NOTION_API_KEY;
  const knowledgeBankId = process.env.NOTION_DATABASE_ID;
  if (!apiKey || !knowledgeBankId) throw new Error("NOTION_API_KEY and NOTION_DATABASE_ID must be set");

  const notion = new Client({ auth: apiKey });
  const pid = pageId.replace(/-/g, "");
  const targetId = knowledgeBankId.replace(/-/g, "");

  await notion.pages.move({
    page_id: pid,
    parent: { data_source_id: targetId, type: "data_source_id" } as any,
  });

  try {
    await notion.pages.update({
      page_id: pid,
      properties: {
        Area: { select: { name: "Daily Briefing" } },
        "Content Type": { select: { name: "News" } },
      } as any,
    });
  } catch {
    // Properties may not exist on target DB; ignore
  }
}
