/**
 * AudioService — Dual-provider music search & streaming
 *
 * Search priority:  JioSaavn (primary) → Invidious/YouTube (fallback)
 * Stream priority:  track.audioUrl (direct CDN) → JioSaavn song detail → Invidious adaptive formats
 *
 * JioSaavn gives direct MP3 CDN links (best for background playback).
 * Invidious gives YouTube audio streams (broader catalog, but URLs expire ~6h).
 */

// ── API bases ────────────────────────────────────────────────────────────────
const SAAVN_API_BASE =
  import.meta.env?.VITE_JIOSAAVN_API_URL ||
  'https://jiosaavn-api.rishabh134we.workers.dev/api';

// Invidious instances — ordered by reliability. Only instances with API enabled.
// inv.nadeko.net has DISABLED its API as of 2026. Check https://api.invidious.io/
const INVIDIOUS_INSTANCES = [
  'https://inv.thepixora.com',         // API enabled, working
  'https://invidious.nerdvpn.de',      // German instance
  'https://invidious.jing.rocks',      // Backup
];

const INVIDIOUS_TIMEOUT_MS = 5000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickThumbnail(images = []) {
  return images[2]?.url || images[1]?.url || images[0]?.url || '';
}

/**
 * Pick the highest-quality download URL from JioSaavn's downloadUrl array.
 */
function pickDownloadUrl(downloadUrl = []) {
  if (!Array.isArray(downloadUrl) || downloadUrl.length === 0) return '';
  for (let i = downloadUrl.length - 1; i >= 0; i--) {
    const entry = downloadUrl[i];
    const url = entry?.url || entry?.link || '';
    if (url) return url;
  }
  return '';
}

function mapSaavnSong(song) {
  const artists =
    (song.artists?.primary || [])
      .map((a) => a.name)
      .filter(Boolean)
      .join(', ') ||
    song.artists?.all?.[0]?.name ||
    '';
  return {
    videoId: song.id,
    title: song.name || '',
    channelTitle: artists,
    thumbnail: pickThumbnail(song.image || []),
    audioUrl: pickDownloadUrl(song.downloadUrl || []),
    source: 'jiosaavn',
  };
}

/**
 * Pick the best thumbnail from Invidious videoThumbnails array.
 */
function pickInvidiousThumbnail(thumbs = []) {
  // Prefer medium > high > default > sddefault
  const preferred = ['medium', 'high', 'sddefault', 'default'];
  for (const q of preferred) {
    const match = thumbs.find((t) => t.quality === q);
    if (match?.url) return match.url;
  }
  return thumbs[0]?.url || '';
}

function mapInvidiousVideo(video) {
  return {
    videoId: video.videoId,
    title: video.title || '',
    channelTitle: video.author || '',
    thumbnail: pickInvidiousThumbnail(video.videoThumbnails || []),
    audioUrl: '', // resolved lazily via getAudioStream
    source: 'invidious',
    lengthSeconds: video.lengthSeconds || 0,
  };
}

// ── JioSaavn Search ──────────────────────────────────────────────────────────

async function searchJioSaavn(query) {
  const url = `${SAAVN_API_BASE}/search/songs?query=${encodeURIComponent(query)}&limit=15`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`JioSaavn search error ${res.status}`);
  const json = await res.json();
  if (!json?.success) throw new Error('JioSaavn search returned failure');
  return (json?.data?.results || []).map(mapSaavnSong);
}

// ── Invidious Search ─────────────────────────────────────────────────────────

async function searchInvidious(query) {
  const errors = [];

  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&page=1`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), INVIDIOUS_TIMEOUT_MS);

      let res;
      try {
        res = await fetch(url, { signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }

      if (!res.ok) {
        errors.push(`${instance}: HTTP ${res.status}`);
        continue;
      }

      const json = await res.json();
      if (json?.error) {
        errors.push(`${instance}: ${json.error}`);
        continue;
      }

      // Filter to only video type results, skip shorts (< 60s) and very long (> 15min)
      const videos = (Array.isArray(json) ? json : [])
        .filter((item) => item.type === 'video' && !item.liveNow)
        .filter((item) => (item.lengthSeconds || 0) >= 30 && (item.lengthSeconds || 0) <= 900)
        .slice(0, 15);

      return videos.map(mapInvidiousVideo);
    } catch (err) {
      errors.push(`${instance}: ${err.message}`);
      continue;
    }
  }

  console.warn('[AudioService] All Invidious instances failed:', errors);
  return []; // non-fatal — JioSaavn is primary
}

// ── Invidious Stream Resolution ──────────────────────────────────────────────

/**
 * Resolve a direct audio stream URL from Invidious for a YouTube videoId.
 * Tries each instance until one succeeds.
 */
async function resolveInvidiousStream(videoId) {
  const errors = [];

  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/videos/${videoId}?fields=adaptiveFormats`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), INVIDIOUS_TIMEOUT_MS);

      let res;
      try {
        res = await fetch(url, { signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }

      if (!res.ok) {
        errors.push(`${instance}: HTTP ${res.status}`);
        continue;
      }

      const json = await res.json();
      if (json?.error) {
        errors.push(`${instance}: ${json.error}`);
        continue;
      }

      const formats = json.adaptiveFormats || [];
      const audioFormats = formats
        .filter((f) => f.type?.startsWith('audio/'))
        .sort((a, b) => (parseInt(b.bitrate) || 0) - (parseInt(a.bitrate) || 0));

      if (audioFormats.length === 0) {
        errors.push(`${instance}: no audio formats`);
        continue;
      }

      const bestUrl = audioFormats[0].url;
      if (bestUrl) return bestUrl;
    } catch (err) {
      errors.push(`${instance}: ${err.message}`);
      continue;
    }
  }

  throw new Error(`Invidious stream failed for "${videoId}": ${errors.join('; ')}`);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Search for tracks. JioSaavn first, Invidious as fallback/supplement.
 * Returns a merged array with JioSaavn results first, then Invidious results
 * (deduped by title similarity).
 */
export async function search(query) {
  if (!query?.trim()) return [];

  // Run both searches in parallel — don't wait for one to finish
  const [saavnResults, invidiousResults] = await Promise.allSettled([
    searchJioSaavn(query),
    searchInvidious(query),
  ]);

  const saavn = saavnResults.status === 'fulfilled' ? saavnResults.value : [];
  const invidious = invidiousResults.status === 'fulfilled' ? invidiousResults.value : [];

  if (saavnResults.status === 'rejected') {
    console.warn('[AudioService] JioSaavn search failed:', saavnResults.reason?.message);
  }

  // If JioSaavn returned results, show them first + append unique Invidious results
  if (saavn.length > 0) {
    const saavnTitles = new Set(saavn.map((s) => s.title.toLowerCase().trim()));
    const uniqueInvidious = invidious.filter(
      (v) => !saavnTitles.has(v.title.toLowerCase().trim())
    );
    return [...saavn, ...uniqueInvidious.slice(0, 5)]; // append up to 5 YouTube results
  }

  // JioSaavn failed or returned nothing — Invidious is primary
  if (invidious.length > 0) return invidious;

  // Both failed
  throw new Error('Search failed — check your internet connection.');
}

/**
 * Resolve a playable audio URL for a given track.
 *
 * Priority:
 *   1. track.audioUrl — direct CDN link (JioSaavn tracks always have this)
 *   2. JioSaavn song detail API — for library songs missing audioUrl
 *   3. Invidious adaptive formats — for YouTube-sourced tracks
 */
export async function getAudioStream(track) {
  if (!track?.videoId) throw new Error('AudioService: track has no videoId');

  // Fast path — already have a direct URL (JioSaavn CDN)
  if (track.audioUrl) return track.audioUrl;

  // Try JioSaavn song detail first (for jiosaavn-sourced tracks)
  if (track.source === 'jiosaavn' || track.source !== 'invidious') {
    try {
      return await fetchSongStreamUrl(track.videoId);
    } catch (e) {
      console.warn('[AudioService] JioSaavn stream failed, trying Invidious:', e.message);
    }
  }

  // Fallback to Invidious (YouTube audio stream)
  return resolveInvidiousStream(track.videoId);
}

/**
 * Fetch the direct download URL for a JioSaavn song by its ID.
 */
export async function fetchSongStreamUrl(videoId) {
  if (!videoId) throw new Error('AudioService: videoId is required');

  const url = `${SAAVN_API_BASE}/songs/${encodeURIComponent(videoId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`JioSaavn song detail error ${res.status}`);

  const json = await res.json();
  const song = Array.isArray(json?.data) ? json.data[0] : json?.data;
  if (!song) throw new Error('No song data returned from JioSaavn');

  const downloadUrl = pickDownloadUrl(song.downloadUrl || []);
  if (!downloadUrl) throw new Error('No download URL in song data');
  return downloadUrl;
}

/**
 * Synchronous helper — returns a direct URL if the track already has one,
 * or null if an async fetch would be needed. Used by the prefetch system.
 */
export function getTrackUrlSync(track) {
  return track?.audioUrl || null;
}

/**
 * No-op — no client-side URL cache.
 */
export function clearCache() { }
