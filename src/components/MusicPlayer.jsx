import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, X, ChevronDown, ChevronUp, SkipBack, SkipForward } from 'lucide-react';

// ── Load YouTube IFrame API once globally ────────────────────────────────────
let ytApiPromise = null;
export const loadYTApi = () => {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) { resolve(window.YT); return; }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
  });
  return ytApiPromise;
};

// ── MusicPlayer component ─────────────────────────────────────────────────────
const MusicPlayer = ({
  song,
  queue = [],
  onClose,
  onPlayNext,
  onPlayPrev,
  visible = true,
  autoPlay = true,
  initialSeekTime = 0,
  onUnlockAudio,
  onPlaybackStateChange,
}) => {
  const playerContainerRef = useRef(null);
  const playerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const wakeLockRef = useRef(null);

  // ── Refs that were missing and crashing togglePlay ────────────────────────
  const lastPauseReasonRef = useRef(null);       // 'user' | null
  const resumeOnVisibleRef = useRef(true);        // false when user explicitly paused
  const wasPlayingBeforeHideRef = useRef(false);  // track playback state before backgrounding

  // ── Capture initial autoPlay / seekTime so the player init effect never
  //    has to re-run when these props change after first mount. ──────────────
  const autoPlayRef = useRef(autoPlay);
  const initialSeekTimeRef = useRef(initialSeekTime);
  // Update only when song changes so the next song's initial values are correct
  useEffect(() => {
    autoPlayRef.current = autoPlay;
    initialSeekTimeRef.current = initialSeekTime;
  }, [song?.videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stable prop refs ──────────────────────────────────────────────────────
  // Updated every render (no dep array) so callbacks inside effects always see
  // the current function without being listed in dep arrays.
  // This is the core fix that breaks the render loop causing stop/play flicker.
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
  const progressBarRef = useRef(null);

  // Keep isPlaying in a ref so event handlers can read it without stale closures
  const isPlayingRef = useRef(false);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ── Progress polling ──────────────────────────────────────────────────────
  // Only updates UI state. Intentionally does NOT call onPlaybackStateChange —
  // that was the source of the stop/play render loop.
  const startPolling = useCallback(() => {
    clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      if (!playerRef.current) return;
      try {
        const ct = playerRef.current.getCurrentTime?.() ?? 0;
        const dur = playerRef.current.getDuration?.() ?? 0;
        setCurrentTime(ct);
        setDuration(dur);
        if (dur > 0) setProgress((ct / dur) * 100);
      } catch {}
    }, 500);
  }, []);

  const stopPolling = useCallback(() => {
    clearInterval(progressIntervalRef.current);
  }, []);

  // ── Screen Wake Lock ──────────────────────────────────────────────────────
  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      wakeLockRef.current?.addEventListener?.('release', () => { wakeLockRef.current = null; });
    } catch {}
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try { await wakeLockRef.current?.release?.(); } catch {}
    finally { wakeLockRef.current = null; }
  }, []);

  // ── Sync UI from YT player state (no onPlaybackStateChange call) ──────────
  const syncPlaybackState = useCallback(() => {
    const player = playerRef.current;
    if (!player) { setIsPlaying(false); stopPolling(); return false; }

    let state = null, ct = 0, dur = 0;
    try {
      state = player.getPlayerState?.();
      ct = player.getCurrentTime?.() ?? 0;
      dur = player.getDuration?.() ?? 0;
    } catch { state = null; }

    const isActuallyPlaying = state === window.YT?.PlayerState?.PLAYING;
    setCurrentTime(ct);
    setDuration(dur);
    setProgress(dur > 0 ? (ct / dur) * 100 : 0);
    setIsPlaying(isActuallyPlaying);

    if (isActuallyPlaying) { startPolling(); requestWakeLock(); }
    else { stopPolling(); }
    return isActuallyPlaying;
  }, [requestWakeLock, startPolling, stopPolling]);

  // Keep syncPlaybackState in a ref so effects can call it without dep-array issues
  const syncPlaybackStateRef = useRef(syncPlaybackState);
  useEffect(() => { syncPlaybackStateRef.current = syncPlaybackState; }, [syncPlaybackState]);

  // ── Resume playback ───────────────────────────────────────────────────────
  const resumePlayback = useCallback(() => {
    if (!playerRef.current) return;
    onUnlockAudioRef.current?.();
    try { playerRef.current.playVideo(); } catch {}
  }, []);

  // ── Media Session API (lock screen / notification shade controls) ─────────
  useEffect(() => {
    if (!('mediaSession' in navigator) || !song) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.channelTitle,
      artwork: [
        { src: song.thumbnail, sizes: '96x96',   type: 'image/jpeg' },
        { src: song.thumbnail, sizes: '256x256',  type: 'image/jpeg' },
        { src: song.thumbnail, sizes: '512x512',  type: 'image/jpeg' },
      ],
    });
    navigator.mediaSession.setActionHandler('play', () => {
      resumeOnVisibleRef.current = true;
      resumePlayback();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      lastPauseReasonRef.current = 'user';
      resumeOnVisibleRef.current = false;
      playerRef.current?.pauseVideo();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => onPlayNextRef.current?.());
    navigator.mediaSession.setActionHandler('previoustrack', () => onPlayPrevRef.current?.());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime && playerRef.current) {
        playerRef.current.seekTo(details.seekTime, true);
        setCurrentTime(details.seekTime);
      }
    });
  }, [song, resumePlayback]);

  // ── Sync Media Session state ──────────────────────────────────────────────
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
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
    } catch {}
  }, [currentTime, duration]);

  // ── Visibility change — fight browser suspension of YT iframe ───────────
  // Strategy:
  //   • When going hidden AND was playing → start a periodic "nudge" that
  //     calls playVideo() every few seconds to resist browser suspension.
  //   • When coming back visible → immediately resume + retry on delays.
  //   • Also listen for window 'focus' for alt-tab / task-switcher returns.
  useEffect(() => {
    let nudgeTimer = null;

    const startNudge = () => {
      stopNudge();
      nudgeTimer = setInterval(() => {
        if (!playerRef.current) return;
        try {
          const state = playerRef.current.getPlayerState?.();
          // YT.PlayerState.PAUSED = 2, PLAYING = 1
          if (state === 2 || state === -1) {
            playerRef.current.playVideo();
          }
        } catch { /* ignore */ }
      }, 8000);
    };

    const stopNudge = () => {
      if (nudgeTimer) { clearInterval(nudgeTimer); nudgeTimer = null; }
    };

    const tryResume = () => {
      if (!playerRef.current) return;
      onUnlockAudioRef.current?.();
      try {
        const state = playerRef.current.getPlayerState?.();
        if (state !== 1) { // not already PLAYING
          playerRef.current.playVideo();
        }
      } catch { /* ignore */ }
      syncPlaybackStateRef.current();
      requestWakeLock();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasPlayingBeforeHideRef.current = isPlayingRef.current;
        releaseWakeLock();
        // Start nudging if user didn't explicitly pause
        if (isPlayingRef.current && resumeOnVisibleRef.current) {
          startNudge();
        }
      } else {
        // Came back to foreground
        stopNudge();
        if (wasPlayingBeforeHideRef.current && resumeOnVisibleRef.current) {
          // Aggressive retry ladder: immediate, 300ms, 1s
          tryResume();
          setTimeout(tryResume, 300);
          setTimeout(tryResume, 1000);
        } else {
          syncPlaybackStateRef.current();
        }
      }
    };

    const handleFocus = () => {
      stopNudge();
      if (wasPlayingBeforeHideRef.current && resumeOnVisibleRef.current) {
        tryResume();
        setTimeout(tryResume, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      stopNudge();
      releaseWakeLock();
    };
  }, [releaseWakeLock, requestWakeLock]);

  // ── Init YouTube player ───────────────────────────────────────────────────
  // IMPORTANT: dep array is [song?.videoId, autoPlay, initialSeekTime] only.
  // All callbacks are accessed via stable refs so they never trigger a player
  // rebuild — this was causing the stop/play oscillation.
  useEffect(() => {
    if (!song) return;
    let destroyed = false;

    loadYTApi().then((YT) => {
      if (destroyed) return;
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }

      playerRef.current = new YT.Player(playerContainerRef.current, {
        host: 'https://www.youtube.com',
        width: '200',
        height: '200',
        videoId: song.videoId,
        playerVars: {
          enablejsapi: 1,
          origin: window.location.origin,
          autoplay: autoPlayRef.current ? 1 : 0,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          fs: 0,
          disablekb: 1,
          playsinline: 1,
        },
        events: {
          onReady: (e) => {
            if (destroyed) return;
            // Use captured refs — NOT the live props — so this callback
            // never causes the effect to re-run when props change.
            if ((initialSeekTimeRef.current || 0) > 0) {
              try { e.target.seekTo(initialSeekTimeRef.current, true); } catch {}
            }
            if (autoPlayRef.current) {
              onUnlockAudioRef.current?.();
              e.target.playVideo();
            }
            window.setTimeout(() => syncPlaybackStateRef.current(), 300);
          },
          onStateChange: (e) => {
            if (destroyed) return;
            const S = YT.PlayerState;
            if (e.data === S.PLAYING) {
              setIsPlaying(true);
              startPolling();
              requestWakeLock();
              // Report only on genuine YT state changes — NOT on every poll tick.
              // Polling every 500ms was the source of the API call spam.
              try {
                const ct = e.target.getCurrentTime?.() ?? 0;
                onPlaybackStateChangeRef.current?.({ isPlaying: true, currentTime: ct });
              } catch {}
            } else if (e.data === S.PAUSED) {
              setIsPlaying(false);
              stopPolling();
              releaseWakeLock();
              // Do NOT call onPlaybackStateChange here — doing so updates musicPosition
              // in AppContext, which flows back as initialSeekTime, which was in the dep
              // array and caused the player to be destroyed/recreated in an infinite loop.
              // Position is saved only by the explicit user-pause path in togglePlay.
            } else if (e.data === S.ENDED) {
              setIsPlaying(false);
              stopPolling();
              releaseWakeLock();
              onPlayNextRef.current?.();
            }
            // S.BUFFERING intentionally ignored — prevents isPlaying flicker during buffer
          },
          onError: (e) => {
            console.warn('YT error:', e?.data, song?.videoId);
            setIsPlaying(false);
            stopPolling();
          },
        },
      });
    });

    return () => {
      destroyed = true;
      stopPolling();
      // Player is NOT destroyed on effect cleanup — it lives in a fixed off-screen
      // div and must survive route changes. It's only rebuilt when song?.videoId changes.
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // dep array: ONLY song?.videoId — autoPlay and initialSeekTime are read via
  // refs so changing them never triggers a player rebuild.
  }, [song?.videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopPolling();
      releaseWakeLock();
      try { playerRef.current?.destroy(); } catch {}
    };
  }, [releaseWakeLock, stopPolling]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const togglePlay = () => {
    if (!playerRef.current) return;
    onUnlockAudioRef.current?.();
    if (isPlayingRef.current) {
      lastPauseReasonRef.current = 'user';
      resumeOnVisibleRef.current = false;  // don't auto-resume when foregrounded
      playerRef.current.pauseVideo();
      // Save position on explicit user pause (safe here — not in the dep loop)
      try {
        const ct = playerRef.current.getCurrentTime?.() ?? 0;
        onPlaybackStateChangeRef.current?.({ isPlaying: false, currentTime: ct });
      } catch {}
    } else {
      resumeOnVisibleRef.current = true;
      resumePlayback();
    }
  };

  const seek = useCallback((e) => {
    if (!playerRef.current || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const dur = playerRef.current.getDuration?.() ?? 0;
    const seekTo = pct * dur;
    playerRef.current.seekTo(seekTo, true);
    setProgress(pct * 100);
    setCurrentTime(seekTo);
  }, []);

  if (!song) return null;

  return (
    <>
      {/* Off-screen iframe — keeps playback alive across route changes */}
      <div style={{ position: 'fixed', top: -9999, left: -9999, width: 200, height: 200, opacity: 0, pointerEvents: 'none' }}>
        <div ref={playerContainerRef} />
      </div>

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
                  <button onClick={onPlayPrev} disabled={!onPlayPrev} className="text-white/50 hover:text-white disabled:opacity-20 transition-colors">
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-95"
                    style={{ background: 'linear-gradient(135deg, hsl(25,65%,55%), hsl(6,63%,46%))' }}
                  >
                    {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-0.5" />}
                  </button>
                  <button onClick={onPlayNext} disabled={!onPlayNext} className="text-white/50 hover:text-white disabled:opacity-20 transition-colors">
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
