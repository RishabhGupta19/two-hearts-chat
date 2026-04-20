/**
 * JioSaavnProvider
 *
 * Wraps the existing JioSaavn search + audio logic into the AudioProvider
 * interface.  All original logic is preserved — this is a refactor, not a
 * rewrite.
 */
import { AudioProvider } from './AudioProvider';

const SAAVN_API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_JIOSAAVN_API_URL) ||
  'https://saavn.dev/api';

export class JioSaavnProvider extends AudioProvider {
  constructor() {
    super('jiosaavn');
  }

  // ── Search ──────────────────────────────────────────────────────────────
  async search(query) {
    const url = `${SAAVN_API_BASE}/search/songs?query=${encodeURIComponent(query)}&limit=15`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`JioSaavn API error ${res.status}`);

    const json = await res.json();
    const results = json?.data?.results || [];

    return results.map((song) => {
      // Pick best quality audio (320kbps preferred, fallback down)
      const downloads = song.downloadUrl || [];
      const audioUrl =
        downloads[4]?.url ||  // 320kbps
        downloads[3]?.url ||  // 160kbps
        downloads[2]?.url ||  // 96kbps
        downloads[1]?.url ||  // 48kbps
        downloads[0]?.url ||  // 12kbps
        '';

      // Pick best quality image
      const images = song.image || [];
      const thumbnail =
        images[2]?.url ||  // 500x500
        images[1]?.url ||  // 150x150
        images[0]?.url ||  // 50x50
        '';

      // Join artist names
      const artists =
        (song.artists?.primary || [])
          .map((a) => a.name)
          .filter(Boolean)
          .join(', ') || song.artists?.all?.[0]?.name || '';

      return {
        videoId: song.id,          // reuse "videoId" key for backend compat
        title: song.name || '',
        channelTitle: artists,
        thumbnail,
        audioUrl,
        source: 'jiosaavn',
      };
    });
  }

  // ── Audio stream ────────────────────────────────────────────────────────
  async getAudioStream(track) {
    // JioSaavn tracks already carry a direct MP3 URL from search results.
    if (track.audioUrl) return track.audioUrl;

    // If for some reason the URL is missing (e.g. library song with expired
    // link), re-fetch from the song detail endpoint.
    try {
      const res = await fetch(`${SAAVN_API_BASE}/songs/${track.videoId}`);
      if (!res.ok) throw new Error(`JioSaavn song fetch ${res.status}`);
      const json = await res.json();
      const song = json?.data?.[0] || json?.data || {};
      const downloads = song.downloadUrl || [];
      return (
        downloads[4]?.url ||
        downloads[3]?.url ||
        downloads[2]?.url ||
        downloads[1]?.url ||
        downloads[0]?.url ||
        ''
      );
    } catch (err) {
      console.warn('JioSaavnProvider.getAudioStream failed:', err.message);
      throw err;
    }
  }
}
