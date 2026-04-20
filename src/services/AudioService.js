/**
 * AudioService
 *
 * Central orchestration layer for audio providers.
 *
 * Responsibilities:
 *   - search(query)           → delegates to primary search provider (JioSaavn)
 *   - getAudioStream(track)   → tries each provider in order, with caching
 *
 * Provider order:
 *   1. InvidiousProvider  (larger catalog — YouTube)
 *   2. JioSaavnProvider   (existing, reliable fallback)
 */
import { JioSaavnProvider } from '@/providers/JioSaavnProvider';
import { InvidiousProvider } from '@/providers/InvidiousProvider';

// ── Provider instances ────────────────────────────────────────────────────
const jiosaavn  = new JioSaavnProvider();
const invidious = new InvidiousProvider();

const providers = [invidious, jiosaavn];

// ── Stream URL cache ──────────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getCached(trackId) {
  const entry = cache.get(trackId);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(trackId);
    return null;
  }
  return entry.url;
}

function setCache(trackId, url) {
  cache.set(trackId, { url, expiry: Date.now() + CACHE_TTL_MS });

  // Evict oldest entries if cache grows too large
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Search for tracks.
 * Currently delegates to JioSaavn only.  Other providers can be merged later.
 *
 * @param {string} query
 * @returns {Promise<Array>} tracks
 */
export async function search(query) {
  // Primary: JioSaavn
  return jiosaavn.search(query);

  // TODO: optionally merge Invidious/YouTube search results here
  // const [saavnResults, invidiousResults] = await Promise.allSettled([
  //   jiosaavn.search(query),
  //   invidious.search(query),
  // ]);
  // return deduplicateAndMerge(saavnResults, invidiousResults);
}

/**
 * Resolve a playable audio stream URL for a track.
 * Tries each provider in order; falls back gracefully.
 * Results are cached for 15 minutes.
 *
 * @param {object} track  — must have at least { videoId }
 * @returns {Promise<string>} playable audio URL
 * @throws {Error} if all providers fail
 */
export async function getAudioStream(track) {
  if (!track?.videoId) throw new Error('AudioService: track has no videoId');

  // Check cache first
  const cached = getCached(track.videoId);
  if (cached) return cached;

  // If the track already has a working audioUrl (from JioSaavn search),
  // use it directly — no need to hit Invidious.
  if (track.audioUrl && track.source === 'jiosaavn') {
    setCache(track.videoId, track.audioUrl);
    return track.audioUrl;
  }

  // Try each provider in order
  const errors = [];
  for (const provider of providers) {
    try {
      const url = await provider.getAudioStream(track);
      if (url) {
        setCache(track.videoId, url);
        return url;
      }
    } catch (err) {
      errors.push(`${provider.name}: ${err.message}`);
      // Continue to next provider
    }
  }

  throw new Error(
    `AudioService: all providers failed for "${track.title || track.videoId}".\n` +
    errors.join('\n')
  );
}

/**
 * Clear the stream URL cache (e.g. on logout or for debugging).
 */
export function clearCache() {
  cache.clear();
}

// Export provider instances for direct access if needed
export { jiosaavn, invidious, providers };
