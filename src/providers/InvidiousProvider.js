/**
 * InvidiousProvider
 *
 * Uses public Invidious instances to resolve YouTube audio streams.
 * Only implements getAudioStream — search is handled by JioSaavn for now.
 *
 * Flow:
 *   1. Takes a track with track.videoId = YouTube videoId
 *   2. Tries each Invidious instance until one succeeds
 *   3. Calls /api/v1/videos/{videoId}
 *   4. Filters adaptiveFormats for audio/*
 *   5. Sorts by bitrate DESC → returns best audio URL
 */
import { AudioProvider } from './AudioProvider';

const INVIDIOUS_INSTANCES = [
  'https://invidious.nerdvpn.de',
  'https://invidious.privacydev.net',
  'https://yt.cdaut.de',
  'https://invidious.fdn.fr',
];

const TIMEOUT_MS = 5000;

export class InvidiousProvider extends AudioProvider {
  constructor() {
    super('invidious');
  }

  // ── Search (not implemented — uses JioSaavn for now) ────────────────────
  // async search(query) { ... }  // TODO: merge Invidious search later

  // ── Audio stream ────────────────────────────────────────────────────────
  async getAudioStream(track) {
    const videoId = track.videoId;
    if (!videoId) throw new Error('InvidiousProvider: no videoId on track');

    // Only attempt for tracks that came from YouTube/Invidious, or as a
    // fallback when explicitly requested.  Skip silently for JioSaavn-native
    // tracks to avoid wasting time on guaranteed failures.
    if (track.source === 'jiosaavn') {
      throw new Error('InvidiousProvider: skipping JioSaavn-native track');
    }

    for (const instance of INVIDIOUS_INSTANCES) {
      try {
        const url = `${instance}/api/v1/videos/${videoId}?fields=adaptiveFormats`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);

        if (!res.ok) continue;

        const json = await res.json();
        const formats = json.adaptiveFormats || [];

        // Filter audio-only formats and sort by bitrate (highest first)
        const audioFormats = formats
          .filter((f) => f.type?.startsWith('audio/'))
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

        if (audioFormats.length === 0) continue;

        const bestUrl = audioFormats[0].url;
        if (bestUrl) return bestUrl;
      } catch {
        // Instance failed — try next one silently
        continue;
      }
    }

    throw new Error('InvidiousProvider: all instances failed');
  }
}
