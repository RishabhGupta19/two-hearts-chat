import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, X, ChevronDown, ChevronUp, SkipBack, SkipForward } from 'lucide-react';
import { getAudioStream } from '@/services/AudioService';

// ── MusicPlayer component ─────────────────────────────────────────────────────
// Uses a native <audio> element with direct MP3 URLs from JioSaavn.
// Background playback works natively — no iframe hacks needed.
const MusicPlayer = ({
  song,
  queue = [],
  onClose,
  onPlayNext,
  onPlayPrev,
  canPlayNext,
  canPlayPrev,
  visible = true,
  autoPlay = true,
  initialSeekTime = 0,
  onUnlockAudio,
  onPlaybackStateChange,
}) => {
  const audioRef = useRef(null);
  const wakeLockRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const isTransitioningRef = useRef(false);

  const lastPauseReasonRef = useRef(null);
  const resumeOnVisibleRef = useRef(true);

  // Capture initial values via refs so player init doesn't re-trigger
  const autoPlayRef = useRef(autoPlay);
  const initialSeekTimeRef = useRef(initialSeekTime);
  useEffect(() => {
    autoPlayRef.current = autoPlay;
    initialSeekTimeRef.current = initialSeekTime;
  }); // run on every render so refs always reflect latest props

  // Stable prop refs — updated every render, never in dep arrays
  const onPlaybackStateChangeRef = useRef(onPlaybackStateChange);
  const onPlayNextRef = useRef(onPlayNext);
  const onPlayPrevRef = useRef(onPlayPrev);
  const onUnlockAudioRef = useRef(onUnlockAudio);
  useEffect(() => { onPlaybackStateChangeRef.current = onPlaybackStateChange; });
  useEffect(() => { onPlayNextRef.current = onPlayNext; });
  useEffect(() => { onPlayPrevRef.current = onPlayPrev; });
  useEffect(() => { onUnlockAudioRef.current = onUnlockAudio; });

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState(null);
  const streamRetryRef = useRef(0);
  const progressBarRef = useRef(null);
  const nextAudioRef = useRef(new Audio());

  const isPlayingRef = useRef(false);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };
  const preloadNextSong = useCallback(async () => {
    if (!queue?.length) return;

    const currentIndex = queue.findIndex(s => s.videoId === song.videoId);
    const nextSong = queue[currentIndex + 1];

    if (!nextSong) return;

    try {
      const url = await getAudioStream(nextSong, { forceFresh: true });

      const audio = nextAudioRef.current;
      audio.src = url;
      audio.preload = "auto";
      audio.load();

      console.log("Preloaded next:", nextSong.title);
    } catch (e) {
      console.warn("Preload failed", e);
    }
  }, [song?.videoId, queue]);
  // ── Screen Wake Lock ──────────────────────────────────────────────────────
  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      wakeLockRef.current?.addEventListener?.('release', () => { wakeLockRef.current = null; });
    } catch { }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try { await wakeLockRef.current?.release?.(); } catch { }
    finally { wakeLockRef.current = null; }
  }, []);

  // ── Audio event handlers ──────────────────────────────────────────────────
  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const ct = audio.currentTime || 0;
    const dur = audio.duration || 0;
    setCurrentTime(ct);
    setDuration(dur);
    if (dur > 0) setProgress((ct / dur) * 100);
  }, []);

  // Helper: forcefully assert our Media Session as the active one so the OS
  // doesn't hand audio focus (and earbud controls) to Spotify / YT Music.
  const assertMediaSession = useCallback(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = 'playing';
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    requestWakeLock();
    preloadNextSong();
    assertMediaSession(); // reclaim audio focus from other apps
    const audio = audioRef.current;
    if (audio) {
      onPlaybackStateChangeRef.current?.({ isPlaying: true, currentTime: audio.currentTime || 0 });
    }
  }, [requestWakeLock, assertMediaSession]);

  const handlePause = useCallback(() => {
    // During track transitions, don't signal pause to avoid OS dismissing notification
    if (isTransitioningRef.current) return;
    setIsPlaying(false);
    releaseWakeLock();
  }, [releaseWakeLock]);

  const handleEnded = useCallback(async () => {
    const nextFn = onPlayNextRef.current;
    if (!nextFn) return;

    const currentIndex = queue.findIndex(s => s.videoId === song.videoId);
    const nextSong = queue[currentIndex + 1];

    if (!nextSong) return;

    try {
      const freshUrl = await getAudioStream(nextSong, { forceFresh: true });

      const audio = audioRef.current;
      audio.src = freshUrl;
      audio.load();

      await audio.play();

      nextFn(); // update UI
    } catch (e) {
      console.error("Next song failed:", e);
      nextFn(); // fallback
    }
  }, [queue, song]);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration || 0);
    // Seek to initial position if resuming
    if ((initialSeekTimeRef.current || 0) > 0) {
      audio.currentTime = initialSeekTimeRef.current;
    }
    // Auto-play if:
    //  (a) user explicitly started playback (autoPlayRef), OR
    //  (b) we're mid-transition between tracks (isTransitioningRef)
    if (isTransitioningRef.current || autoPlayRef.current) {
      onUnlockAudioRef.current?.();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      audio.play().then(() => {
        // Clear the transition flag once the new track starts playing
        isTransitioningRef.current = false;
        requestWakeLock();
      }).catch((err) => {
        console.warn('MusicPlayer: auto-play failed', err);
        isTransitioningRef.current = false;
      });
    } else {
      isTransitioningRef.current = false;
    }
  }, []);

  // ── Resolve audio URL via AudioService when song changes ──────────────────
  useEffect(() => {
    if (!song) return;
    let cancelled = false;
    streamRetryRef.current = 0;

    const resolve = async () => {
      try {
        // getAudioStream handles provider fallback + caching
        const url = await getAudioStream(song);
        if (!cancelled) setResolvedUrl(url);
      } catch (err) {
        console.warn('AudioService: stream resolution failed, using song.audioUrl', err);
        // Fallback to whatever audioUrl the song already has
        if (!cancelled && song.audioUrl) setResolvedUrl(song.audioUrl);
      }
    };

    resolve();
    return () => { cancelled = true; };
  }, [song?.videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Set up audio element when resolved URL changes ────────────────────────
  useEffect(() => {
    if (!resolvedUrl) return;
    const audio = audioRef.current;
    if (!audio) return;

    // Reset progress state but preserve isPlaying during transitions
    // so the OS doesn't dismiss the notification
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    if (!isTransitioningRef.current) {
      setIsPlaying(false);
    }

    // Explicitly set src before calling load() — do NOT rely solely on JSX
    // attribute, because React may not have committed the new src to the DOM
    // yet when this effect runs, causing load() to reload the old URL.
    audio.src = resolvedUrl;
    audio.load();

    return () => {
      if (!isTransitioningRef.current) {
        releaseWakeLock();
      }
    };
  }, [resolvedUrl, releaseWakeLock]);

  // ── Media Session API (lock screen / notification shade controls) ─────────
  // Re-register on song AND isPlaying changes — this prevents other apps
  // from stealing the hardware media button handlers every time play state
  // toggles.
  useEffect(() => {
    if (!('mediaSession' in navigator) || !song) return;
    ['play', 'pause', 'nexttrack', 'previoustrack', 'seekto', 'stop'].forEach(action => {
      try { navigator.mediaSession.setActionHandler(action, null); } catch { }
    });
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.channelTitle,
      artwork: [
        { src: song.thumbnail, sizes: '96x96', type: 'image/jpeg' },
        { src: song.thumbnail, sizes: '256x256', type: 'image/jpeg' },
        { src: song.thumbnail, sizes: '512x512', type: 'image/jpeg' },
      ],
    });
    navigator.mediaSession.setActionHandler('play', () => {
      resumeOnVisibleRef.current = true;
      onUnlockAudioRef.current?.();
      audioRef.current?.play().catch(() => { });
      navigator.mediaSession.playbackState = 'playing';
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      lastPauseReasonRef.current = 'user';
      resumeOnVisibleRef.current = false;
      audioRef.current?.pause();
      navigator.mediaSession.playbackState = 'paused';
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => onPlayNextRef.current?.());
    navigator.mediaSession.setActionHandler('previoustrack', () => onPlayPrevRef.current?.());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime != null && audioRef.current) {
        audioRef.current.currentTime = details.seekTime;
        setCurrentTime(details.seekTime);
      }
    });
    // Stop handler — explicitly tells OS our session is active and managed
    navigator.mediaSession.setActionHandler('stop', () => {
      audioRef.current?.pause();
      setIsPlaying(false);
      navigator.mediaSession.playbackState = 'paused';
    });
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [song, isPlaying]);

  // ── Sync Media Session playback state ─────────────────────────────────────
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    // During track transitions, keep reporting 'playing' so the OS doesn't
    // dismiss the notification / lock-screen controls.
    if (isTransitioningRef.current) {
      navigator.mediaSession.playbackState = 'playing';
      return;
    }
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(currentTime, duration),
      });
    } catch { }
  }, [currentTime, duration]);

  // ── Visibility change — re-acquire wake lock on foreground ────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isPlayingRef.current) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [releaseWakeLock, requestWakeLock]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    onUnlockAudioRef.current?.();
    if (isPlayingRef.current) {
      lastPauseReasonRef.current = 'user';
      resumeOnVisibleRef.current = false;
      audio.pause();
      try {
        onPlaybackStateChangeRef.current?.({ isPlaying: false, currentTime: audio.currentTime || 0 });
      } catch { }
    } else {
      resumeOnVisibleRef.current = true;
      audio.play().catch(() => { });
      assertMediaSession(); // reclaim audio focus from other apps
    }
  };

  const seek = useCallback((e) => {
    const audio = audioRef.current;
    if (!audio || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const dur = audio.duration || 0;
    const seekTo = pct * dur;
    audio.currentTime = seekTo;
    setProgress(pct * 100);
    setCurrentTime(seekTo);
  }, []);

  if (!song) return null;

  return (
    <>
      {/* Hidden audio element — keeps playback alive across route changes */}
      <audio
        ref={audioRef}
        src={resolvedUrl || song.audioUrl}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        onError={async (e) => {
          console.warn('Audio error:', e?.target?.error, song?.videoId);
          // Try re-resolving the stream URL (e.g. expired CDN link)
          if (streamRetryRef.current < 2) {
            streamRetryRef.current += 1;
            try {
              const freshUrl = await getAudioStream(song, { forceFresh: true });
              if (freshUrl && freshUrl !== resolvedUrl) {
                setResolvedUrl(freshUrl);
                return; // will trigger re-load via the resolvedUrl effect
              }
            } catch { }
          }
          setIsPlaying(false);
        }}
        style={{ display: 'none' }}
      />

      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-3 pb-3"
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{
              pointerEvents: 'all',
              background: 'linear-gradient(135deg, hsl(25,45%,18%) 0%, hsl(0,20%,12%) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {collapsed ? (
              <div className="flex items-center gap-3 px-4 py-3">
                <img src={song.thumbnail} alt={song.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{song.title}</p>
                  <p className="text-[10px] text-white/50 truncate">{song.channelTitle}</p>
                </div>
                <button onClick={togglePlay} className="text-white/80 hover:text-white transition-colors p-1">
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button onClick={() => setCollapsed(false)} className="text-white/50 hover:text-white transition-colors p-1">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setCollapsed(true)} className="text-white/50 hover:text-white transition-colors">
                    <ChevronDown className="w-5 h-5" />
                  </button>
                  <p className="text-xs text-white/50 font-medium tracking-wider uppercase">Now Playing</p>
                  <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex justify-center mb-5">
                  <motion.div
                    animate={isPlaying ? { scale: [1, 1.02, 1], rotate: [0, 1, -1, 0] } : { scale: 1 }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-52 h-52 rounded-2xl overflow-hidden shadow-xl"
                    style={{ boxShadow: isPlaying ? '0 0 40px rgba(200,100,50,0.4)' : '0 8px 32px rgba(0,0,0,0.5)' }}
                  >
                    <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover" />
                  </motion.div>
                </div>

                <div className="text-center mb-4 px-2">
                  <p className="text-white font-semibold text-base leading-snug truncate">{song.title}</p>
                  <p className="text-white/50 text-sm mt-0.5 truncate">{song.channelTitle}</p>
                </div>

                <div className="mb-3 px-1">
                  <div ref={progressBarRef} className="relative h-1.5 bg-white/10 rounded-full cursor-pointer group" onClick={seek}>
                    <motion.div
                      className="absolute left-0 top-0 h-full rounded-full"
                      style={{ width: `${progress}%`, background: 'linear-gradient(90deg, hsl(25,70%,60%), hsl(6,63%,55%))' }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ left: `calc(${progress}% - 6px)` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-white/40 text-[10px]">{fmt(currentTime)}</span>
                    <span className="text-white/40 text-[10px]">{fmt(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6">
                  <button onClick={onPlayPrev} disabled={canPlayPrev === undefined ? !onPlayPrev : !canPlayPrev} className="text-white/50 hover:text-white disabled:opacity-20 transition-colors">
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-95"
                    style={{ background: 'linear-gradient(135deg, hsl(25,65%,55%), hsl(6,63%,46%))' }}
                  >
                    {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-0.5" />}
                  </button>
                  <button onClick={onPlayNext} disabled={canPlayNext === undefined ? !onPlayNext : !canPlayNext} className="text-white/50 hover:text-white disabled:opacity-20 transition-colors">
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </>
  );
};

export default MusicPlayer;
