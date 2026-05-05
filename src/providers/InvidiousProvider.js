/**
 * InvidiousProvider
 *
 * Uses public Invidious instances to resolve YouTube audio streams.
 * Implements both search and getAudioStream for YouTube content.
 *
 * NOTE: Public Invidious instances are increasingly unstable (2025-2026).
 * Many instances have disabled their API endpoints entirely.
 * The instance list below is verified as of April 2026.
 *
 * Flow for search:
 *   1. GET /api/v1/search?q=QUERY&type=video
 *   2. Filter to video results, skip shorts and very long videos
 *   3. Return normalized track objects
 *
 * Flow for stream:
 *   1. Takes a track with track.videoId = YouTube videoId
 *   2. Tries each instance until one succeeds (skips on 4xx/5xx)
 *   3. Calls /api/v1/videos/{videoId}?fields=adaptiveFormats
 *   4. Filters audio/* formats and sorts by bitrate DESC
 *   5. Returns best audio URL
 */
import { AudioProvider } from './AudioProvider';

// Public Invidious instances — ordered by reliability (most stable first).
// IMPORTANT: inv.nadeko.net has DISABLED its API as of 2026.
// Check https://api.invidious.io/ for current instance health.
const INVIDIOUS_INSTANCES = [
  'https://inv.thepixora.com',         // API enabled, verified working
  'https://invidious.nerdvpn.de',      // German instance, API enabled
  'https://invidious.jing.rocks',      // Backup instance
];

// Short timeout — fail fast and try next instance.
const TIMEOUT_MS = 5000;

export class InvidiousProvider extends AudioProvider {
  constructor() {
    super('invidious');
  }

  // ── Search ──────────────────────────────────────────────────────────────
  async search(query) {
    if (!query?.trim()) return [];
    const errors = [];

    for (const instance of INVIDIOUS_INSTANCES) {
      try {
        const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&page=1`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

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

        // Filter to video results, skip shorts (< 30s) and very long (> 15min)
        const videos = (Array.isArray(json) ? json : [])
          .filter((item) => item.type === 'video' && !item.liveNow)
          .filter((item) => (item.lengthSeconds || 0) >= 30 && (item.lengthSeconds || 0) <= 900)
          .slice(0, 15);

        return videos.map((v) => ({
          videoId: v.videoId,
          title: v.title || '',
          channelTitle: v.author || '',
          thumbnail: this._pickThumbnail(v.videoThumbnails || []),
          audioUrl: '', // resolved lazily
          source: 'invidious',
          lengthSeconds: v.lengthSeconds || 0,
        }));
      } catch (err) {
        errors.push(`${instance}: ${err.message}`);
        continue;
      }
    }

    throw new Error(
      `InvidiousProvider: all instances failed for search "${query}".\n${errors.join('\n')}`
    );
  }

  // ── Audio stream ────────────────────────────────────────────────────────
  async getAudioStream(track) {
    const videoId = track.videoId;
    if (!videoId) throw new Error('InvidiousProvider: no videoId on track');

    // JioSaavn tracks have a direct MP3 URL already — never waste time on Invidious.
    if (track.source === 'jiosaavn' && track.audioUrl) {
      return track.audioUrl;
    }

    const errors = [];

    for (const instance of INVIDIOUS_INSTANCES) {
      try {
        const url = `${instance}/api/v1/videos/${videoId}?fields=adaptiveFormats`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

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
          errors.push(`${instance}: no audio formats found`);
          continue;
        }

        const bestUrl = audioFormats[0].url;
        if (bestUrl) return bestUrl;
      } catch (err) {
        errors.push(`${instance}: ${err.message}`);
        continue;
      }
    }

    throw new Error(
      `InvidiousProvider: all instances failed for "${videoId}".\n${errors.join('\n')}`
    );
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  _pickThumbnail(thumbs = []) {
    const preferred = ['medium', 'high', 'sddefault', 'default'];
    for (const q of preferred) {
      const match = thumbs.find((t) => t.quality === q);
      if (match?.url) return match.url;
    }
    return thumbs[0]?.url || '';
  }
}
