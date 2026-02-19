import { YoutubeTranscript } from "youtube-transcript-plus";
import * as cheerio from "cheerio";

const CHUNK_CHARS = 12000;
const OVERLAP_CHARS = 400;

export type ExtractResult =
  | { ok: true; text: string; source: string }
  | { ok: false; error: string; source?: string; needsManualInput?: boolean };

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)/i.test(url);
}

function getYouTubeVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1]! : null;
}

function isSpotifyUrl(url: string): boolean {
  return /open\.spotify\.com\/(?:episode|show)\//i.test(url);
}

export async function extractFromPaste(text: string): Promise<ExtractResult> {
  const t = (text ?? "").trim();
  if (!t) return { ok: false, error: "No text provided", source: "paste" };
  return { ok: true, text: t, source: "Pasted text" };
}

export async function extractFromFile(
  base64: string,
  fileName: string,
  mimeType?: string
): Promise<ExtractResult> {
  const name = (fileName ?? "").toLowerCase();
  const isPdf = name.endsWith(".pdf") || mimeType === "application/pdf";
  const isTxt = name.endsWith(".txt") || mimeType === "text/plain";

  if (isTxt) {
    try {
      const decoded = Buffer.from(base64, "base64").toString("utf-8");
      const text = decoded.trim();
      if (!text) return { ok: false, error: "File is empty", source: fileName };
      return { ok: true, text, source: `File: ${fileName}` };
    } catch (e) {
      return { ok: false, error: "Could not read text file", source: fileName };
    }
  }

  if (isPdf) {
    try {
      const buffer = Buffer.from(base64, "base64");
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      await parser.destroy();
      const text = (result?.text ?? "").trim();
      if (!text) return { ok: false, error: "No text could be extracted from PDF", source: fileName };
      return { ok: true, text, source: `PDF: ${fileName}` };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "PDF parse failed";
      return { ok: false, error: msg, source: fileName };
    }
  }

  return { ok: false, error: "Unsupported file type. Use PDF or TXT.", source: fileName };
}

export async function extractFromUrl(url: string): Promise<ExtractResult> {
  const u = (url ?? "").trim();
  if (!u) return { ok: false, error: "No URL provided", source: "url" };

  if (isYouTubeUrl(u)) {
    const videoId = getYouTubeVideoId(u);
    if (!videoId) return { ok: false, error: "Invalid YouTube URL", source: u };
    try {
      const ytTranscript = new YoutubeTranscript();
      const items = await ytTranscript.fetchTranscript(videoId);
      const text = items.map((i: { text: string }) => i.text).join(" ").replace(/\s+/g, " ").trim();
      if (!text) return { ok: false, error: "No transcript available for this video", source: u };
      return { ok: true, text, source: `YouTube: ${u}` };
    } catch (e: unknown) {
      const err = e as { message?: string; name?: string };
      const msg =
        err?.message ?? (err?.name === "YoutubeTranscriptDisabledError" ? "Transcript is disabled for this video" : "Could not fetch transcript");
      return { ok: false, error: msg, source: u };
    }
  }

  if (isSpotifyUrl(u)) {
    try {
      const { fetchEpisodeInfo, fetchTranscriptFromAllPlatforms } = await import(
        "@/lib/spotify"
      );
      const episodeInfo = await fetchEpisodeInfo(u);

      if (episodeInfo) {
        const transcript = await fetchTranscriptFromAllPlatforms(episodeInfo);
        if (transcript) {
          return {
            ok: true,
            text: transcript.text,
            source: transcript.source,
          };
        }
      }

      let title = episodeInfo?.name ?? "Spotify episode";
      let showName = episodeInfo?.showName ?? "";
      if (!episodeInfo) {
        try {
          const oembedRes = await fetch(
            `https://open.spotify.com/oembed?url=${encodeURIComponent(u)}`,
            { headers: { "User-Agent": "DeepSummarizer/1.0" } }
          );
          if (oembedRes.ok) {
            const data = (await oembedRes.json()) as {
              title?: string;
              author_name?: string;
            };
            title = data.title ?? title;
            showName = data.author_name ?? "";
          }
        } catch {
          /* fallback to generic message */
        }
      }
      return {
        ok: false,
        error: `"${title}"${showName ? ` from ${showName}` : ""} - Full transcript not found on YouTube, RSS feeds, or other platforms. Please paste the transcript below to summarize.`,
        source: u,
        needsManualInput: true,
      };
    } catch {
      return {
        ok: false,
        error: "Could not load Spotify episode. Please paste the transcript or upload a file to summarize.",
        source: u,
        needsManualInput: true,
      };
    }
  }

  // Article / blog: fetch HTML and extract main text
  try {
    const res = await fetch(u, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DeepSummarizer/1.0)" },
    });
    if (!res.ok) {
      return { ok: false, error: `Failed to fetch URL (${res.status})`, source: u };
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, nav, header, footer, aside, form, iframe, noscript").remove();
    const main =
      $("article").first().text() ||
      $("[role='main']").first().text() ||
      $("main").first().text() ||
      $(".post-content, .article-body, .content, .entry-content").first().text() ||
      $("body").text();
    const text = main.replace(/\s+/g, " ").trim();
    if (!text || text.length < 100) {
      return { ok: false, error: "Could not extract enough readable text from this URL", source: u };
    }
    return { ok: true, text, source: `URL: ${u}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed";
    return { ok: false, error: msg, source: u };
  }
}

export async function extractFromPodcastTitle(title: string): Promise<ExtractResult> {
  const q = (title ?? "").trim();
  if (!q) return { ok: false, error: "No title provided", source: "podcast_title" };

  try {
    const ytSearchModule = await import("yt-search");
    const yts = (ytSearchModule as any).default || ytSearchModule;

    const searchResults = await yts({
      query: q,
      pages: 1,
    });

    const videos = searchResults?.videos ?? [];
    if (!videos.length) {
      return {
        ok: false,
        error: "Could not find a matching episode on YouTube for that title.",
        source: q,
      };
    }

    // Prefer long-form episodes (>= 10 minutes)
    let chosen =
      videos.find((v: any) => (v.seconds || 0) >= 1800) || // 30+ mins
      videos.find((v: any) => (v.seconds || 0) >= 600) || // 10+ mins
      videos[0];

    if (!chosen || !chosen.videoId) {
      return {
        ok: false,
        error: "Found potential matches but could not identify a valid video.",
        source: q,
      };
    }

    const videoId: string = chosen.videoId;
    const ytTranscript = new YoutubeTranscript();
    const items = await ytTranscript.fetchTranscript(videoId);
    const text = items
      .map((i: { text: string }) => i.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!text || text.length < 500) {
      return {
        ok: false,
        error: "Found a video for that title but it has no usable transcript.",
        source: `YouTube search: ${q}`,
      };
    }

    return {
      ok: true,
      text,
      source: `YouTube (search by title): ${chosen.title || q}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Podcast title search failed.";
    return {
      ok: false,
      error: msg,
      source: q,
    };
  }
}

export function chunkText(text: string): string[] {
  if (!text || text.length <= CHUNK_CHARS) return [text].filter(Boolean);
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start + CHUNK_CHARS;
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(" ", end);
      if (lastSpace > start) end = lastSpace;
    }
    chunks.push(text.slice(start, end));
    start = end - (end < text.length ? OVERLAP_CHARS : 0);
  }
  return chunks;
}
