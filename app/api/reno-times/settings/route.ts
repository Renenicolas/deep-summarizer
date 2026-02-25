import { NextResponse } from "next/server";

/** Returns Reno Times hub settings (Notion link, Run-now URL if set on server). */
export async function GET() {
  const id = (process.env.NOTION_RENO_TIMES_FRONT_PAGE_ID ?? "").trim();
  const notionFrontPageUrl = id
    ? `https://notion.so/${id.replace(/-/g, "")}`
    : null;
  const runNowUrl = (process.env.RENO_TIMES_RUN_NOW_URL ?? "").trim() || null;
  return NextResponse.json({ notionFrontPageUrl, runNowUrl });
}
