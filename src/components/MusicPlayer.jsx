import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, X, ChevronDown, ChevronUp, SkipBack, SkipForward } from 'lucide-react';

let ytApiPromise = null;
const loadYTApi = () => {
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

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const progressBarRef = useRef(null);

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ── Progress polling ────────────────────────────────────
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

  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      wakeLockRef.current?.addEventListener?.('release', () => {
        if (wakeLockRef.current) wakeLockRef.current = null;
      });
    } catch {
      // ignore wake lock failures; unsupported browsers will simply skip this
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeLockRef.current?.release?.();
    } catch {
      // ignore release failures
    } finally {
      wakeLockRef.current = null;
    }
  }, []);

  const syncPlaybackState = useCallback(() => {
    const player = playerRef.current;
    if (!player) {
      setIsPlaying(false);
      stopPolling();
      releaseWakeLock();
      return false;
    }

    let state = null;
    let ct = 0;
    let dur = 0;

    try {
      state = player.getPlayerState?.();
      ct = player.getCurrentTime?.() ?? 0;
      dur = player.getDuration?.() ?? 0;
    } catch {
      state = null;
    }

    const YTState = window.YT?.PlayerState;
    const isActuallyPlaying = state === YTState?.PLAYING;

    setCurrentTime(ct);
    setDuration(dur);
    setProgress(dur > 0 ? (ct / dur) * 100 : 0);

    if (isActuallyPlaying) {
      setIsPlaying(true);
      startPolling();
      requestWakeLock();
    } else {
      setIsPlaying(false);
      stopPolling();
      releaseWakeLock();
    }

    return isActuallyPlaying;
  }, [releaseWakeLock, requestWakeLock, startPolling, stopPolling]);

  const resumePlayback = useCallback(() => {
    if (!playerRef.current) return;
    onUnlockAudio?.();
    try {
      playerRef.current.playVideo();
      window.setTimeout(() => {
        syncPlaybackState();
      }, 0);
    } catch {
      // ignore resume failures
    }
  }, [onUnlockAudio, syncPlaybackState]);

  // ── Media Session API (notification + lock screen controls) ──
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
      onUnlockAudio?.();
      resumePlayback();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      playerRef.current?.pauseVideo();
      syncPlaybackState();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => onPlayNext?.());
    navigator.mediaSession.setActionHandler('previoustrack', () => onPlayPrev?.());

    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime && playerRef.current) {
        playerRef.current.seekTo(details.seekTime, true);
        setCurrentTime(details.seekTime);
      }
    });

  }, [onUnlockAudio, resumePlayback, song, syncPlaybackState]); // re-run when song changes

  // ── Keep Media Session playback state in sync ───────────
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // ── Keep Media Session position in sync ─────────────────
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

  // ── Resume on visibility change (iOS/Android foreground) ─
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncPlaybackState();
      } else {
        syncPlaybackState();
        releaseWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [releaseWakeLock, syncPlaybackState]);

  // ── Init YouTube player ─────────────────────────────────
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
          autoplay: 1,
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
            if ((initialSeekTime || 0) > 0) {
              try { e.target.seekTo(initialSeekTime, true); setCurrentTime(initialSeekTime); } catch {}
            }
            if (autoPlay) {
              onUnlockAudio?.();
              e.target.playVideo();
            }
            window.setTimeout(() => {
              syncPlaybackState();
            }, 0);
          },
          onStateChange: (e) => {
            const S = YT.PlayerState;
            if (e.data === S.PLAYING) {
              syncPlaybackState();
            } else if (e.data === S.PAUSED) {
              syncPlaybackState();
            } else if (e.data === S.ENDED) {
              syncPlaybackState();
              onPlayNext?.();
            }
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
    };
  }, [autoPlay, initialSeekTime, onUnlockAudio, song?.videoId, syncPlaybackState]);

  useEffect(() => {
    onPlaybackStateChange?.({ isPlaying, currentTime });
  }, [isPlaying, currentTime, onPlaybackStateChange]);

  useEffect(() => {
    return () => {
      stopPolling();
      releaseWakeLock();
      try { playerRef.current?.destroy(); } catch {}
    };
  }, [releaseWakeLock, stopPolling]);

  const togglePlay = () => {
    if (!playerRef.current) return;
    onUnlockAudio?.();
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
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
