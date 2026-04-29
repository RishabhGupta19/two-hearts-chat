/**
 * musicLibrary.js
 *
 * All library reads/writes go to the Django + MongoDB backend.
 * localStorage is used only as:
 *   - a search-result cache (to reduce redundant network calls)
 *   - an optimistic offline mirror (so the UI never blocks)
 */

import api from '@/api/index';

const SEARCH_CACHE_KEY = 'solace_music_search_cache';
const MAX_CACHE_AGE_MS = 1000 * 60 * 60 * 6; // 6 hours

// ─────────────────────────────────────────────────────────────────────────────
// Remote library  (MongoDB via Django API)
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch the full library from the server */
export const fetchLibrary = async () => {
  const { data } = await api.get('/music/library');
  return data.songs;
};

/** Save a song to the server. Returns the saved song object. */
export const saveToLibrary = async (song) => {
  const { data } = await api.post('/music/library', {
    videoId:      song.videoId,
    title:        song.title,
    channelTitle: song.channelTitle || '',
    thumbnail:    song.thumbnail    || '',
    audioUrl:     song.audioUrl     || '', // direct CDN URL for background playback
  });
  return data; // the serialised song (or existing one if duplicate)
};

/** Remove a song by its ID */
export const removeFromLibrary = async (videoId) => {
  await api.delete(`/music/library/${videoId}`);
};

// ─────────────────────────────────────────────────────────────────────────────
// Search cache  (localStorage — avoids redundant API calls)
// ─────────────────────────────────────────────────────────────────────────────

export const getCachedSearch = (query) => {
  try {
    const raw = localStorage.getItem(SEARCH_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    const key   = query.trim().toLowerCase();
    const entry = cache[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > MAX_CACHE_AGE_MS) return null;
    return entry.results;
  } catch {
    return null;
  }
};

export const setCachedSearch = (query, results) => {
  try {
    const raw   = localStorage.getItem(SEARCH_CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    const key   = query.trim().toLowerCase();
    cache[key]  = { results, timestamp: Date.now() };
    // Keep at most 30 entries
    const keys = Object.keys(cache);
    if (keys.length > 30) {
      const oldest = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp)[0];
      delete cache[oldest];
    }
    localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(cache));
  } catch { /* silently ignore quota errors */ }
};
