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
  bullets: string[];
  founderTakeaways: string[];
  keyIdeas?: { title: string; body: string }[];
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
  if (params.keyIdeas && params.keyIdeas.length > 0) {
    children.push(heading2Block("Key ideas"));
    params.keyIdeas.forEach((k) => {
      children.push(heading3Block(k.title), paragraphBlock(k.body));
    });
  }

  children.push(
    heading2Block("Summary"),
    ...params.summary
      .split(/\n\n+/)
      .filter(Boolean)
      .map((p) => paragraphBlock(p)),
    heading2Block("Key bullets"),
    ...params.bullets.map((b) => bulletedListItemBlock(b))
  );

  if (params.founderTakeaways.length > 0) {
    children.push(heading2Block("Founder / Rene takeaways"));
    params.founderTakeaways.forEach((t) => children.push(bulletedListItemBlock(t)));
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

/**
 * Append a "Follow-up" section (clarification or research) to an existing Notion page.
 * Use this so follow-ups stay on the same row instead of creating new ones.
 */
export async function appendFollowUpToPage(params: {
  pageId: string;
  type: "clarification" | "research";
  snippet?: string;
  question?: string;
  answer: string;
  bullets: string[];
}): Promise<{ pageId: string; url: string }> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) throw new Error("NOTION_API_KEY must be set in .env.local");

  const notion = new Client({ auth: apiKey });
  const pageId = params.pageId.replace(/-/g, "");

  const children: object[] = [];
  const headingTitle = params.type === "clarification" ? "Follow-up clarification" : "Follow-up research";

  children.push(heading2Block(headingTitle));
  if (params.snippet) {
    children.push(paragraphBlock("Snippet: " + params.snippet.slice(0, 1500)));
  }
  if (params.question) {
    children.push(paragraphBlock("Question: " + params.question));
  }
  children.push(paragraphBlock(params.answer));
  if (params.bullets.length > 0) {
    params.bullets.forEach((b) => children.push(bulletedListItemBlock(b)));
  }

  await notion.blocks.children.append({
    block_id: pageId,
    children: children as any,
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
