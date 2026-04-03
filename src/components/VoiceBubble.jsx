import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';

/**
 * VoiceBubble — renders a sent/received voice message with playback.
 *
 * Props:
 *  message  – { audio_url, duration, isMine, timestamp, seen }
 *  isMine   – bool
 *  seen     – bool
 *  isCalm   – bool (show seen ticks only in calm mode)
 */
export const VoiceBubble = ({ message, isMine, seen, isCalm }) => {
  const [playing, setPlaying]       = useState(false);
  const [progress, setProgress]     = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [canPlay, setCanPlay]       = useState(false);
  const [isPriming, setIsPriming]   = useState(false);
  const [error, setError]           = useState(false);

  const audioRef  = useRef(null);
  const animRef   = useRef(null);

  const totalDuration = message?.duration || 0;
  const audioUrl      = message?.audio_url || message?.audioUrl || null;
  const fileLost      = message?.file_lost === true || !audioUrl;

  // ── helpers ───────────────────────────────────────────────────────────
  const fmt = (s) => {
    const secs = Math.floor(s || 0);
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  };

  const barCount = 22;
  const bars = Array.from({ length: barCount }, (_, i) => {
    const seed = audioUrl ? (audioUrl.charCodeAt(i % Math.max(audioUrl.length, 1)) || 40) : 40;
    return 28 + ((seed * (i + 3)) % 58); // 28–86 %
  });

  // ── tick — update progress bar each frame ────────────────────────────
  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const pct = audio.duration ? audio.currentTime / audio.duration : 0;
    setProgress(pct);
    setCurrentTime(audio.currentTime);
    if (!audio.paused && !audio.ended) {
      animRef.current = requestAnimationFrame(tick);
    }
  }, []); // stable ref — audioRef.current is mutated, not re-assigned

  // ── play / pause ─────────────────────────────────────────────────────
  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      cancelAnimationFrame(animRef.current);
      setPlaying(false);
      return;
    }

    // Reset to start if ended
    if (audio.ended || audio.currentTime >= (audio.duration || Infinity)) {
      audio.currentTime = 0;
      setProgress(0);
      setCurrentTime(0);
    }

    try {
      setIsPriming(true);
      await audio.play();
      // Broadcast to all other VoiceBubbles to pause
      document.dispatchEvent(
        new CustomEvent('voicebubble:play', { detail: { id: message?.id } })
      );
      setCanPlay(true);
      setPlaying(true);
      animRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.error('VoiceBubble play failed:', err);
      setError(true);
      setPlaying(false);
    } finally {
      setIsPriming(false);
    }
  }, [playing, tick, message?.id]);

  // ── audio event listeners + global single-player guard ───────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // If metadata is already available (cached response), avoid a stuck loading UI.
    if (audio.readyState >= 2) {
      setCanPlay(true);
    }

    const onEnded   = () => { cancelAnimationFrame(animRef.current); setPlaying(false); setProgress(0); setCurrentTime(0); setIsPriming(false); };
    const onCanPlay = () => setCanPlay(true);
    const onError   = () => { setError(true); setCanPlay(false); setIsPriming(false); };
    const onPlay    = () => setPlaying(true);
    const onPause   = () => { setPlaying(false); setIsPriming(false); cancelAnimationFrame(animRef.current); };

    // Pause THIS bubble when another one broadcasts 'voicebubble:play'
    const onOtherPlay = (e) => {
      if (e.detail?.id !== message?.id) {
        audio.pause(); // triggers onPause above → state cleans up
      }
    };

    audio.addEventListener('ended',   onEnded);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error',   onError);
    audio.addEventListener('play',    onPlay);
    audio.addEventListener('pause',   onPause);
    document.addEventListener('voicebubble:play', onOtherPlay);

    return () => {
      audio.removeEventListener('ended',   onEnded);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error',   onError);
      audio.removeEventListener('play',    onPlay);
      audio.removeEventListener('pause',   onPause);
      document.removeEventListener('voicebubble:play', onOtherPlay);
      cancelAnimationFrame(animRef.current);
    };
  }, [message?.id]); // re-bind if id changes

  // ── timestamp formatting ──────────────────────────────────────────────
  const timestamp = (() => {
    try {
      const raw = message?.timestamp || '';
      const iso = raw + (!raw.endsWith('Z') && !raw.includes('+') ? 'Z' : '');
      return new Date(iso).toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  })();

  // ── render ──────────────────────────────────────────────────────────

  // File unavailable fallback (Render redeploy wiped disk, or file_lost flag from backend)
  if (fileLost) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`mb-3 flex w-full ${isMine ? 'justify-end pr-1' : 'justify-start pl-1'}`}
      >
        <div
          className={`flex items-center gap-2 rounded-2xl px-3 py-2 max-w-[75%] ${
            isMine
              ? 'bg-primary/40 text-primary-foreground rounded-br-sm'
              : 'bg-secondary/50 text-secondary-foreground rounded-bl-sm'
          }`}
          style={{ minWidth: 160 }}
        >
          <span className="text-base opacity-50">🎤</span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] font-medium opacity-60 italic">Voice message unavailable</span>
            <span className="text-[9px] opacity-40 tabular-nums">{timestamp}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`mb-3 flex w-full ${isMine ? 'justify-end pr-1' : 'justify-start pl-1'}`}
    >
      <div
        className={`flex items-center gap-2 rounded-2xl px-3 py-2 max-w-[75%] ${
          isMine
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-secondary text-secondary-foreground rounded-bl-sm'
        }`}
        style={{ minWidth: 200 }}
      >
        {/* actual audio element — always mounted so events fire */}
        <audio
          ref={audioRef}
          src={audioUrl || undefined}
          preload={audioUrl ? 'auto' : 'none'}
          crossOrigin="anonymous"
        />

        {/* Play / Pause — always visible */}
        <button
          onClick={togglePlay}
          disabled={!audioUrl || error}
          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            isMine
              ? 'bg-white/30 hover:bg-white/45 active:bg-white/55 text-primary-foreground'
              : 'bg-primary/15 hover:bg-primary/25 active:bg-primary/35 text-foreground'
          } disabled:opacity-50 shadow-sm`}
          title={error ? 'Audio unavailable' : playing ? 'Pause' : 'Play'}
        >
          {error ? (
            <span className="text-[10px]">✕</span>
          ) : isPriming ? (
            // tiny spinner only while a play action is actively priming
            <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin block" />
          ) : playing ? (
            <Pause size={14} className="fill-current" />
          ) : (
            <Play size={14} className="ml-0.5 fill-current" />
          )}
        </button>

        {/* Waveform bars with progress fill */}
        <div className="flex items-center gap-[2.5px] flex-1 h-7">
          {bars.map((h, i) => {
            const filled = (i / barCount) <= progress;
            return (
              <div
                key={i}
                className="rounded-full transition-colors duration-100"
                style={{
                  width: 2.5,
                  height: `${h}%`,
                  backgroundColor: filled
                    ? isMine ? 'rgba(255,255,255,0.95)' : 'var(--foreground)'
                    : isMine ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.18)',
                }}
              />
            );
          })}
        </div>

        {/* Time + seen ticks */}
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className="text-[11px] font-medium opacity-75 tabular-nums">
            {playing ? fmt(currentTime) : fmt(totalDuration)}
          </span>
          <span className="flex items-center gap-0.5 text-[9px] opacity-55 tabular-nums">
            {timestamp}
            {isMine && isCalm && (
              <span className={`text-[11px] font-bold ml-0.5 ${seen ? 'text-sky-300' : 'opacity-50'}`}>
                {seen ? '✓✓' : '✓'}
              </span>
            )}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
