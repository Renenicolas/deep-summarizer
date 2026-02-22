import { NextResponse } from "next/server";

/** Returns Reno Times hub settings (Notion link). No secret exposed. */
export async function GET() {
  const id = (process.env.NOTION_RENO_TIMES_FRONT_PAGE_ID ?? "").trim();
  const notionFrontPageUrl = id
    ? `https://notion.so/${id.replace(/-/g, "")}`
    : null;
  return NextResponse.json({ notionFrontPageUrl });
}
