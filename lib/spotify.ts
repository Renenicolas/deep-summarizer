/**
 * Spotify Web API helpers - uses Client Credentials flow (no user login).
 * Fetches episode metadata including description for summarization.
 */

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

let cachedToken: { token: string; expiresAt: number } | null = null;

function getEpisodeId(url: string): string | null {
  const match = url.match(/open\.spotify\.com\/episode\/([a-zA-Z0-9]+)/i);
  return match ? match[1]! : null;
}

function getShowId(url: string): string | null {
  const match = url.match(/open\.spotify\.com\/show\/([a-zA-Z0-9]+)/i);
  return match ? match[1]! : null;
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET required");
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify token failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

export type SpotifyEpisodeInfo = {
  id: string;
  name: string;
  description: string;
  showName: string;
  durationMs: number;
};

function toEpisodeInfo(data: {
  id: string;
  name: string;
  description?: string;
  duration_ms?: number;
  show?: { name: string };
}): SpotifyEpisodeInfo {
  const description = (data.description ?? "").trim();
  return {
    id: data.id,
    name: data.name,
    description,
    showName: data.show?.name ?? "",
    durationMs: data.duration_ms ?? 0,
  };
}

export async function fetchEpisodeInfo(
  spotifyUrl: string
): Promise<SpotifyEpisodeInfo | null> {
  const episodeId = getEpisodeId(spotifyUrl);
  const showId = getShowId(spotifyUrl);

  if (!episodeId && !showId) return null;

  const token = await getAccessToken();

  if (episodeId) {
    const res = await fetch(`${API_BASE}/episodes/${episodeId}?market=US`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      id: string;
      name: string;
      description?: string;
      duration_ms?: number;
      show?: { name: string };
    };
    return toEpisodeInfo(data);
  }

  // First get show info to get the show name
  const showRes = await fetch(`${API_BASE}/shows/${showId}?market=US`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  let showName = "";
  if (showRes.ok) {
    const showData = (await showRes.json()) as { name?: string };
    showName = showData.name ?? "";
  }

  // Then get latest episode
  const episodesRes = await fetch(
    `${API_BASE}/shows/${showId}/episodes?market=US&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!episodesRes.ok) return null;
  const json = (await episodesRes.json()) as {
    items?: Array<{
      id: string;
      name: string;
      description?: string;
      duration_ms?: number;
    }>;
  };
  const first = json.items?.[0];
  if (!first) return null;
  return toEpisodeInfo({
    ...first,
    show: { name: showName },
  });
}

/**
 * Search YouTube for this podcast episode by title and show name.
 * Many podcasts cross-post to YouTube, so we can get the full transcript there.
 */
export async function searchYouTubeForEpisode(
  info: SpotifyEpisodeInfo
): Promise<string | null> {
  try {
    const ytSearchModule = await import("yt-search");
    const yts = ytSearchModule.default || ytSearchModule;
    
    const searchQuery = `${info.showName} ${info.name}`.trim();
    if (!searchQuery || searchQuery.length < 10) return null;

    console.log(`[Spotify→YouTube] Searching for: ${searchQuery}`);
    
    const searchResults = await yts({
      query: searchQuery,
      pages: 1,
    });

    if (!searchResults || !searchResults.videos || searchResults.videos.length === 0) {
      console.log("[Spotify→YouTube] No videos found");
      return null;
    }

    console.log(`[Spotify→YouTube] Found ${searchResults.videos.length} videos`);

    // Check first 5 results for a match (podcasts are typically 20+ mins)
    for (const video of searchResults.videos.slice(0, 5)) {
      if (!video || !video.videoId) continue;
      
      // Check if duration is reasonable for a podcast (at least 10 minutes)
      const durationSeconds = video.seconds || 0;
      if (durationSeconds < 600) continue; // Skip videos under 10 mins

      // Check if title includes episode name or show name
      const videoTitle = (video.title || "").toLowerCase();
      const episodeName = info.name.toLowerCase();
      const showName = info.showName.toLowerCase();
      
      // Try to match on title or show name
      const matchesEpisode = episodeName.length > 15 && 
        videoTitle.includes(episodeName.slice(0, 15));
      const matchesShow = showName.length > 0 && videoTitle.includes(showName);
      
      if (matchesEpisode || matchesShow) {
        console.log(`[Spotify→YouTube] Match found: ${video.title} (${video.videoId})`);
        return video.videoId;
      }
    }

    // If no good match, use the first long video as fallback
    const firstLong = searchResults.videos.find((v) => (v.seconds || 0) >= 600);
    if (firstLong) {
      console.log(`[Spotify→YouTube] Using first long video: ${firstLong.title}`);
      return firstLong.videoId;
    }
    
    console.log("[Spotify→YouTube] No suitable videos found");
    return null;
  } catch (e) {
    console.error("[Spotify→YouTube error]", e);
    return null;
  }
}

/**
 * Try to get RSS feed URL from Spotify show ID
 */
async function getRSSFeedUrl(showId: string): Promise<string | null> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/shows/${showId}?market=US`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    
    const data = (await res.json()) as { external_urls?: { spotify: string }; publisher?: string };
    // Spotify doesn't expose RSS directly, but we can try common patterns
    return null; // Will implement RSS discovery via other means
  } catch {
    return null;
  }
}

/**
 * Try to fetch transcript from podcast RSS feed
 */
async function fetchTranscriptFromRSS(
  info: SpotifyEpisodeInfo
): Promise<{ text: string; source: string } | null> {
  try {
    console.log(`[Spotify→RSS] Checking RSS feed for ${info.showName}`);
    
    // Try to find RSS feed via podcast index or web search
    // Search for RSS feed URL using common patterns
    const searchTerms = [
      `site:feeds.buzzsprout.com ${info.showName}`,
      `site:feeds.libsyn.com ${info.showName}`,
      `site:feeds.megaphone.fm ${info.showName}`,
      `${info.showName} podcast RSS feed XML`,
    ];
    
    // For now, we'd need to implement RSS feed discovery
    // This would require either:
    // 1. Podcast Index API (free but needs API key)
    // 2. Web scraping podcast websites
    // 3. iTunes/Apple Podcasts API
    
    return null; // Placeholder - needs RSS feed URL discovery
  } catch {
    return null;
  }
}

/**
 * Try to get full transcript from YouTube if the podcast is cross-posted there.
 */
async function fetchYouTubeTranscriptForEpisode(
  info: SpotifyEpisodeInfo
): Promise<{ text: string; source: string } | null> {
  const videoId = await searchYouTubeForEpisode(info);
  if (!videoId) return null;

  try {
    const { YoutubeTranscript } = await import("youtube-transcript-plus");
    const ytTranscript = new YoutubeTranscript();
    const items = await ytTranscript.fetchTranscript(videoId);
    
    if (!items || items.length === 0) {
      console.log(`[Spotify→YouTube] No transcript found for video ${videoId}`);
      return null;
    }

    const text = items
      .map((i: { text: string }) => i.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    
    if (!text || text.length < 500) {
      console.log(`[Spotify→YouTube] Transcript too short: ${text.length} chars`);
      return null;
    }

    console.log(`[Spotify→YouTube] ✓ Transcript extracted: ${text.length} chars`);
    return {
      text,
      source: `YouTube mirror of ${info.showName ? `${info.showName}: ` : ""}${info.name}`,
    };
  } catch (e) {
    console.error(`[Spotify→YouTube] Transcript fetch failed:`, e);
    return null;
  }
}

/**
 * Try to fetch transcript from Apple Podcasts
 */
async function fetchApplePodcastsTranscript(
  info: SpotifyEpisodeInfo
): Promise<{ text: string; source: string } | null> {
  try {
    console.log(`[Spotify→Apple] Searching Apple Podcasts for ${info.showName}`);
    // Apple Podcasts has transcripts but requires their API or web scraping
    // Would need Apple Podcasts API key or web scraping
    return null;
  } catch {
    return null;
  }
}

/**
 * Try ALL platforms to get full transcript
 * Priority: 1. YouTube, 2. RSS feed, 3. Apple Podcasts, 4. Web scraping
 */
export async function fetchTranscriptFromAllPlatforms(
  info: SpotifyEpisodeInfo
): Promise<{ text: string; source: string } | null> {
  console.log(`[Transcript Search] Checking all platforms for: ${info.name}`);
  
  // 1. Try YouTube first (fastest and most reliable)
  const ytResult = await fetchYouTubeTranscriptForEpisode(info);
  if (ytResult) return ytResult;
  
  // 2. Try RSS feed transcripts
  const rssResult = await fetchTranscriptFromRSS(info);
  if (rssResult) return rssResult;
  
  // 3. Try Apple Podcasts
  const appleResult = await fetchApplePodcastsTranscript(info);
  if (appleResult) return appleResult;
  
  console.log(`[Transcript Search] ✗ No transcript found on any platform`);
  return null;
}
