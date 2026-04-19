import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Loader2,
  Music2,
  Heart,
  Play,
  BookMarked,
  Trash2,
  X,
  WifiOff,
  RefreshCw,
} from 'lucide-react';

import { toast } from 'sonner';
import {
  fetchLibrary,
  saveToLibrary,
  removeFromLibrary,
  getCachedSearch,
  setCachedSearch,
} from '@/utils/musicLibrary';
import { useApp } from '@/context/AppContext';

// ─────────────────────────────────────────────────────────────────────────────
// YouTube Data API v3 search
// ─────────────────────────────────────────────────────────────────────────────
const YT_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || '';

const searchYouTube = async (query) => {
  const normalizedKey = (YT_API_KEY || '').trim();
  if (!normalizedKey || normalizedKey === 'YOUR_YOUTUBE_API_KEY_HERE') {
    throw new Error('VITE_YOUTUBE_API_KEY is not set');
  }
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=15&q=${encodeURIComponent(query)}&key=${YT_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `YouTube API error ${res.status}`);
  }
  const data = await res.json();
  return (data.items || []).map((item) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnail:
      item.snippet.thumbnails?.high?.url ||
      item.snippet.thumbnails?.medium?.url ||
      item.snippet.thumbnails?.default?.url,
  }));
};

// ─────────────────────────────────────────────────────────────────────────────
// SongCard
// ─────────────────────────────────────────────────────────────────────────────
const SongCard = ({ song, onPlay, onSave, onRemove, inLibrary, isActive, saving }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer group"
    style={{
      background: isActive
        ? 'linear-gradient(135deg, rgba(200,120,80,0.18) 0%, rgba(180,80,60,0.12) 100%)'
        : 'hsl(var(--card))',
      border: isActive
        ? '1px solid rgba(200,120,80,0.35)'
        : '1px solid hsl(var(--border))',
    }}
    onClick={() => onPlay(song)}
  >
    {/* Thumbnail */}
    <div className="relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden">
      <img
        src={song.thumbnail}
        alt={song.title}
        className="w-full h-full object-cover transition-transform group-hover:scale-105"
      />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg">
        <Play className="w-5 h-5 text-white fill-white" />
      </div>
      {isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
            <Music2 className="w-5 h-5 text-white" />
          </motion.div>
        </div>
      )}
    </div>

    {/* Info */}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground truncate leading-snug">{song.title}</p>
      <p className="text-xs text-muted-foreground truncate mt-0.5">{song.channelTitle}</p>
    </div>

    {/* Actions */}
    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
      {!inLibrary && onSave && (
        <button
          onClick={() => onSave(song)}
          disabled={saving}
          title="Save to library"
          className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
        </button>
      )}
      {inLibrary && onRemove && (
        <button
          onClick={() => onRemove(song.videoId)}
          disabled={saving}
          title="Remove from library"
          className="p-2 rounded-lg text-primary hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      )}
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Music Page
// ─────────────────────────────────────────────────────────────────────────────
const Music = () => {
  const navigate = useNavigate();
  const { currentSong, startMusicPlayback, closeMusicPlayer } = useApp();

  const [tab, setTab] = useState('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [apiKeyError, setApiKeyError] = useState(false);

  const [library, setLibrary] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState('');
  // Track per-song loading states
  const [savingIds, setSavingIds] = useState(new Set());

  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // ── Load library on mount ────────────────────────────────────────────────
  const loadLibrary = useCallback(async () => {
    setLibraryLoading(true);
    setLibraryError('');
    try {
      const songs = await fetchLibrary();
      setLibrary(songs);
    } catch (err) {
      console.error('Failed to load library:', err);
      setLibraryError('Could not load library. Check your connection.');
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  useEffect(() => { loadLibrary(); }, [loadLibrary]);

  // ── Search ───────────────────────────────────────────────────────────────
  const doSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      setSearchError('');
      setApiKeyError(false);
      return;
    }

    const cached = getCachedSearch(q);
    if (cached) { setResults(cached); return; }

    setSearching(true);
    setSearchError('');
    try {
      const hits = await searchYouTube(q);
      setResults(hits);
      setCachedSearch(q, hits);
    } catch (err) {
      console.error('YouTube search failed:', err);
      const msg = err.message || '';
      if (msg.includes('not set') || msg.includes('not valid') || msg.includes('API key')) {
        // Key missing or placeholder — show the setup card
        setApiKeyError(true);
      } else if (msg.includes('quotaExceeded')) {
        setSearchError('Daily search limit reached (~100 searches/day). Try again tomorrow or browse your saved library.');
      } else {
        setSearchError('Search failed. Please check your internet connection.');
      }
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);

    if (!val.trim()) {
      setResults([]);
      setSearchError('');
      setApiKeyError(false);
      return;
    }

    debounceRef.current = setTimeout(() => doSearch(val), 600);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    clearTimeout(debounceRef.current);
    doSearch(query);
  };

  // ── Playback ─────────────────────────────────────────────────────────────
  const playSong = (song) => {
    const queue = tab === 'library' ? library : results;
    startMusicPlayback(song, queue);
  };

  // ── Library save ─────────────────────────────────────────────────────────
  const handleSave = async (song) => {
    setSavingIds((prev) => new Set([...prev, song.videoId]));
    try {
      const saved = await saveToLibrary(song);
      // Prepend only if not already present
      setLibrary((prev) => {
        if (prev.some((s) => s.videoId === saved.videoId)) return prev;
        return [saved, ...prev];
      });
      toast.success('Saved to your library 🎵');
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('Could not save song. Try again.');
    } finally {
      setSavingIds((prev) => { const n = new Set(prev); n.delete(song.videoId); return n; });
    }
  };

  // ── Library remove ───────────────────────────────────────────────────────
  const handleRemove = async (videoId) => {
    setSavingIds((prev) => new Set([...prev, videoId]));
    // Optimistic removal
    setLibrary((prev) => prev.filter((s) => s.videoId !== videoId));
    if (currentSong?.videoId === videoId) closeMusicPlayer();
    try {
      await removeFromLibrary(videoId);
      toast('Removed from library');
    } catch (err) {
      console.error('Remove failed:', err);
      toast.error('Could not remove song. Refreshing…');
      loadLibrary(); // restore state on failure
    } finally {
      setSavingIds((prev) => { const n = new Set(prev); n.delete(videoId); return n; });
    }
  };

  const libraryIds = new Set(library.map((s) => s.videoId));

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(160deg, hsl(30,40%,96%) 0%, hsl(20,50%,92%) 60%, hsl(10,35%,88%) 100%)' }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />

        </button>

        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, hsl(25,65%,55%), hsl(6,63%,46%))' }}
          >
            <Music2 className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-heading text-lg font-semibold text-foreground">Our Music</h1>
        </div>

        <div className="w-16" />
      </header>

      {/* ── Search bar ──────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          {searching && (
            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
          )}
          {query && !searching && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setSearchError('');
                setApiKeyError(false);
                inputRef.current?.focus();
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={handleQueryChange}
            onFocus={() => setTab('search')}
            placeholder="Search for a song, artist, or album…"
            className="w-full pl-10 pr-10 py-3 rounded-2xl text-sm outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              color: 'hsl(var(--foreground))',
            }}
          />
        </form>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex px-4 gap-2 mb-3 flex-shrink-0">
        {[
          { key: 'search', label: 'Search', icon: Search },
          { key: 'library', label: `Library (${library.length})`, icon: BookMarked },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all"
            style={
              tab === key
                ? { background: 'linear-gradient(135deg, hsl(25,65%,55%), hsl(6,63%,46%))', color: 'white', boxShadow: '0 4px 12px rgba(200,80,40,0.3)' }
                : { background: 'rgba(255,255,255,0.7)', color: 'hsl(var(--muted-foreground))', border: '1px solid rgba(0,0,0,0.06)' }
            }
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4"
        style={{ paddingBottom: currentSong ? '110px' : '16px' }}
      >
        <AnimatePresence mode="wait">

          {/* ── Search tab ────────────────────────────────────────────── */}
          {tab === 'search' && (
            <motion.div key="search-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* ── Search unavailable (API key missing/invalid) ───────── */}
              {apiKeyError && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center text-center py-16 px-6"
                >
                  {/* Sad face SVG — no emoji */}
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 64 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="mb-5 opacity-40"
                  >
                    <circle cx="32" cy="32" r="30" stroke="hsl(var(--muted-foreground))" strokeWidth="2.5" />
                    <circle cx="22" cy="26" r="3" fill="hsl(var(--muted-foreground))" />
                    <circle cx="42" cy="26" r="3" fill="hsl(var(--muted-foreground))" />
                    {/* Sad mouth */}
                    <path
                      d="M21 44 Q32 36 43 44"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                    {/* Tear drop */}
                    <path
                      d="M22 32 Q21 36 23 37 Q25 36 24 32"
                      fill="hsl(var(--muted-foreground))"
                      opacity="0.5"
                    />
                  </svg>

                  <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                    Something went wrong on our side
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                    Search is not available right now. Please try again later.
                  </p>
                </motion.div>
              )}

              {/* ── Generic search error ───────────────────────────────── */}
              {searchError && !apiKeyError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 rounded-xl mb-4"
                  style={{ background: 'rgba(220,80,60,0.08)', border: '1px solid rgba(220,80,60,0.2)' }}
                >
                  <WifiOff className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-destructive leading-relaxed">{searchError}</p>
                </motion.div>
              )}

              {results.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium px-1 mb-2">
                    {results.length} results for &ldquo;{query}&rdquo;
                  </p>
                  <AnimatePresence>
                    {results.map((song) => (
                      <SongCard
                        key={song.videoId}
                        song={song}
                        onPlay={playSong}
                        onSave={handleSave}
                        inLibrary={libraryIds.has(song.videoId)}
                        isActive={currentSong?.videoId === song.videoId}
                        saving={savingIds.has(song.videoId)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {!searching && !searchError && !apiKeyError && results.length === 0 && !query.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-20"
                >
                  <div
                    className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg"
                    style={{ background: 'linear-gradient(135deg, hsl(25,65%,55%), hsl(6,63%,46%))' }}
                  >
                    <Music2 className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                    Find your song
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Search for songs you both love and save them to your shared library
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center mt-5">
                    {['Ed Sheeran', 'Perfect', 'love songs', 'Arijit Singh'].map((s) => (
                      <button
                        key={s}
                        onClick={() => { setQuery(s); doSearch(s); setTab('search'); }}
                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                        style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.08)', color: 'hsl(var(--foreground))' }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── No results found ─────────────────────────────────────── */}
              {!searching && !searchError && !apiKeyError && results.length === 0 && query.trim() !== '' && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-20 px-6"
                >
                  <Search className="w-10 h-10 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No results found for "{query}". <br />Try a different search term.
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── Library tab ───────────────────────────────────────────── */}
          {tab === 'library' && (
            <motion.div key="library-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Loading */}
              {libraryLoading && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading your library…</p>
                </div>
              )}

              {/* Error */}
              {!libraryLoading && libraryError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl"
                  style={{ background: 'rgba(220,80,60,0.08)', border: '1px solid rgba(220,80,60,0.2)' }}
                >
                  <WifiOff className="w-6 h-6 text-destructive" />
                  <p className="text-sm text-destructive text-center">{libraryError}</p>
                  <button
                    onClick={loadLibrary}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white"
                    style={{ background: 'linear-gradient(135deg, hsl(25,65%,55%), hsl(6,63%,46%))' }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                  </button>
                </motion.div>
              )}

              {/* Songs */}
              {!libraryLoading && !libraryError && library.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium px-1 mb-2">
                    {library.length} saved {library.length === 1 ? 'song' : 'songs'}
                  </p>
                  <AnimatePresence>
                    {library.map((song) => (
                      <SongCard
                        key={song.videoId}
                        song={song}
                        onPlay={playSong}
                        onRemove={handleRemove}
                        inLibrary
                        isActive={currentSong?.videoId === song.videoId}
                        saving={savingIds.has(song.videoId)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Empty */}
              {!libraryLoading && !libraryError && library.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-20"
                >
                  <div
                    className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg"
                    style={{ background: 'linear-gradient(135deg, hsl(25,45%,70%), hsl(6,40%,60%))' }}
                  >
                    <Heart className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                    No saved songs yet
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Search for songs and tap <Heart className="inline w-3.5 h-3.5 text-primary" /> to save them here
                  </p>
                  <button
                    onClick={() => setTab('search')}
                    className="mt-5 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, hsl(25,65%,55%), hsl(6,63%,46%))' }}
                  >
                    Search Songs
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
};

export default Music;
