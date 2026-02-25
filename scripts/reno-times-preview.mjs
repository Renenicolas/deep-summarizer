#!/usr/bin/env node
/**
 * Preview the Reno Times edition in Cursor (no Notion write).
 * Run with dev server up: npm run dev (then in another terminal) npm run reno-times:preview
 * Writes RENO_TIMES_PREVIEW.md in project root so you can open it in Cursor and say exactly what to change.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnv() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) {
    console.warn("No .env.local found. Using CRON_SECRET from env or empty.");
    return process.env.CRON_SECRET || "";
  }
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*CRON_SECRET\s*=\s*(.+?)\s*$/);
    if (m) return m[1].replace(/^["']|["']$/g, "").trim();
  }
  return process.env.CRON_SECRET || "";
}

function toMarkdown(data) {
  const lines = [
    `# ${data.title}`,
    `**${data.editionDateLabel}** (preview – not sent to Notion)`,
    "",
    "---",
    "",
  ];
  for (const sec of data.sections || []) {
    lines.push(`## ${sec.title}`);
    lines.push("");
    lines.push(sec.tldr || "(no TL;DR)");
    lines.push("");
    if (sec.bullets && sec.bullets.length > 0) {
      for (const b of sec.bullets) {
        lines.push(`- ${String(b)}`);
      }
      lines.push("");
    }
    if (sec.sources && sec.sources.length > 0) {
      lines.push("**Read further:**");
      for (const s of sec.sources) {
        const label = s.label || "Link";
        const url = s.url || "#";
        lines.push(`- [${label}](${url})`);
      }
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }
  return lines.join("\n");
}

const secret = loadEnv();
if (!secret) {
  console.error("Set CRON_SECRET in .env.local (or env) to run preview.");
  process.exit(1);
}

const base = process.env.PREVIEW_BASE_URL || "http://localhost:3000";
const url = `${base}/api/daily-briefing?secret=${encodeURIComponent(secret)}&preview=1`;

console.log("Fetching preview (1–2 min)…", url.replace(secret, "***"));

const res = await fetch(url);
const data = await res.json();

if (!res.ok) {
  console.error("Preview failed:", data.error || res.statusText);
  process.exit(1);
}

if (!data.preview || !data.sections) {
  console.error("Unexpected response (no preview/sections).");
  process.exit(1);
}

const md = toMarkdown(data);
const outPath = path.join(root, "RENO_TIMES_PREVIEW.md");
fs.writeFileSync(outPath, md, "utf8");

console.log("Wrote", outPath);
console.log("Open it in Cursor and tell me exactly what to change before you deploy.");
